from django.db import transaction
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from accounts.models import User
from roles.models import Role, Staff, Manager, StaffApproval, ManagerPromotionRequest
from roles.permissions import IsAdmin, IsManager, IsManagerOrAdmin
from warehouses.models import Warehouse
from warehouses.serializers import (
    StaffApprovalSerializer,
    ManagerPromotionDecisionSerializer,
    ManagerPromotionRequestReadSerializer,
)
from core.utils import log_error
from core.pagination import StandardResultsSetPagination


# =====================================================
# STAFF APPROVAL
# =====================================================
class StaffApproveAPIView(APIView):
    permission_classes = [IsManagerOrAdmin]

    def post(self, request):
        log_error(f"StaffApprove POST called by {request.user.username} Data: {request.data}")
        serializer = StaffApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        staff_id = data.get("staff_id")
        user_id = data.get("user_id")
        warehouse_id = data["warehouse_id"]  # required field

        # -------------------------------------------------
        # Resolve Staff (safe handling)
        # -------------------------------------------------
        if staff_id:
            try:
                staff = Staff.objects.select_related("user").get(id=staff_id)
            except Staff.DoesNotExist:
                return Response({"error": "Staff not found"}, status=404)

        elif user_id:
            try:
                staff = Staff.objects.select_related("user").get(user_id=user_id)
            except Staff.DoesNotExist:
                return Response(
                    {"error": "Staff mapping not found for given user_id"},
                    status=404
                )
        else:
            return Response(
                {"error": "Either staff_id or user_id is required"},
                status=400
            )

        # -------------------------------------------------
        # Resolve Warehouse
        # -------------------------------------------------
        try:
            warehouse = Warehouse.objects.get(id=warehouse_id)
        except Warehouse.DoesNotExist:
            return Response({"error": "Warehouse not found"}, status=404)

        # -------------------------------------------------
        # Business validations
        # -------------------------------------------------
        if staff.user.is_active:
            return Response({"error": "Already approved"}, status=400)

        if request.user.role.name == Role.MANAGER:
            if not warehouse.manager or warehouse.manager.user != request.user:
                return Response({"error": "Not your warehouse"}, status=403)

        # -------------------------------------------------
        # Approve staff
        # -------------------------------------------------
        staff.warehouse = warehouse
        staff.user.is_active = True
        staff.user.save(update_fields=["is_active"])
        staff.save(update_fields=["warehouse"])

        StaffApproval.objects.get_or_create(
            staff=staff,
            defaults={"approved_by": request.user},
        )

        return Response(
            {
                "status": "STAFF_APPROVED",
                "staff_id": staff.id,
                "user_id": staff.user.id,
                "warehouse_id": warehouse.id,
            },
            status=status.HTTP_200_OK
        )


# =====================================================
# MANAGER PROMOTION (MANAGER → ADMIN)
# =====================================================
class ManagerPromotionRequestAPIView(APIView):
    permission_classes = [IsManager]

    def post(self, request):
        staff = Staff.objects.get(id=request.data["staff_id"])

        if staff.warehouse.manager.user != request.user:
            return Response(
                {"error": "Not your staff"},
                status=status.HTTP_403_FORBIDDEN,
            )

        ManagerPromotionRequest.objects.get_or_create(
            staff=staff,
            defaults={"requested_by": request.user},
        )

        return Response({"status": "REQUEST_CREATED"})


class ManagerPromotionApproveAPIView(APIView):
    permission_classes = [IsAdmin]

    @transaction.atomic
    def post(self, request):
        decision = request.data.get("decision")
        promotion_request_id = request.data.get("promotion_request_id")
        staff_id = request.data.get("staff_id")
        user_id = request.data.get("user_id")
        warehouse_id = request.data.get("warehouse_id")

        if not warehouse_id:
            return Response({"error": "warehouse_id is required"}, status=400)

        pr = None  # IMPORTANT: always define
        staff = None
        user = None

        # =================================================
        # MODE 1: Admin approves a promotion request
        # =================================================
        if promotion_request_id is not None:
            if not decision:
                return Response(
                    {"error": "decision is required for promotion requests"},
                    status=400,
                )

            try:
                pr = ManagerPromotionRequest.objects.select_for_update().get(
                    id=promotion_request_id,
                    status=ManagerPromotionRequest.STATUS_PENDING,
                )
            except ManagerPromotionRequest.DoesNotExist:
                return Response({"error": "Invalid promotion request"}, status=404)

            staff = pr.staff
            user = staff.user

            if decision == "REJECTED":
                pr.status = ManagerPromotionRequest.STATUS_REJECTED
                pr.approved_by = request.user
                pr.approved_at = timezone.now()
                pr.save()
                return Response({"status": "REJECTED"}, status=200)

        # =================================================
        # MODE 2: Direct admin promotion / assignment
        # =================================================
        else:
            if not (staff_id or user_id):
                return Response(
                    {"error": "staff_id or user_id is required for direct promotion"},
                    status=400,
                )

            if staff_id:
                try:
                    staff = Staff.objects.select_for_update().get(id=staff_id)
                    user = staff.user
                except Staff.DoesNotExist:
                    return Response({"error": "Staff not found"}, status=404)
            else:
                try:
                    user = User.objects.select_for_update().get(id=user_id)
                except User.DoesNotExist:
                    return Response({"error": "User not found"}, status=404)

        # =================================================
        # FINAL: assign / promote / reuse manager
        # =================================================
        if not warehouse_id:
            return Response({"error": "warehouse_id is required for approval"}, status=400)

        try:
            warehouse = Warehouse.objects.get(id=warehouse_id)
        except Warehouse.DoesNotExist:
            return Response({"error": "Warehouse not found"}, status=404)

        # User already a manager → reuse (ALLOW MULTIPLE WAREHOUSES)
        if user.role.name == Role.MANAGER:
            manager = Manager.objects.get(user=user)
        else:
            user.role = Role.objects.get(name=Role.MANAGER)
            user.is_active = True
            user.save(update_fields=["role", "is_active"])
            
            # Soft delete from Staff list: Unassign warehouse
            Staff.objects.filter(user=user).update(warehouse=None)
            
            manager = Manager.objects.create(user=user)

        warehouse.manager = manager
        warehouse.save(update_fields=["manager"])

        if pr:
            pr.status = ManagerPromotionRequest.STATUS_APPROVED
            pr.approved_by = request.user
            pr.approved_at = timezone.now()
            pr.save()

        return Response(
            {
                "status": "PROMOTED_TO_MANAGER",
                "user_id": user.id,
                "manager_id": manager.id,
                "warehouse_id": warehouse.id,
            },
            status=200,
        )


class ManagerPromotionRequestListAPIView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = (
            ManagerPromotionRequest.objects
            .select_related("staff__user", "requested_by")
            .order_by("-id")
        )

        # 🔍 Filters
        status_param = request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        warehouse_param = request.query_params.get("warehouse")
        if warehouse_param:
            qs = qs.filter(staff__warehouse__id=warehouse_param)

        requested_by = request.query_params.get("requested_by")
        if requested_by:
            qs = qs.filter(requested_by__id=requested_by)

        paginator = StandardResultsSetPagination()
        result_page = paginator.paginate_queryset(qs, request)
        serializer = ManagerPromotionRequestReadSerializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AdminDemoteManagerAPIView(APIView):
    permission_classes = [IsAdmin]

    @transaction.atomic
    def post(self, request):
        """
        Demote a MANAGER back to STAFF.
        Body:
        {
            "user_id": <manager_user_id>
        }
        """

        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"error": "user_id required"}, status=400)

        try:
            user = User.objects.select_for_update().get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

        if user.role.name != Role.MANAGER:
            return Response({"error": "User is not a manager"}, status=400)

        # Remove warehouse manager assignment
        Warehouse.objects.filter(manager__user=user).update(manager=None)

        # Change role
        user.role = Role.objects.get(name=Role.STAFF)
        user.is_active = False
        user.save(update_fields=["role", "is_active"])

        # Ensure Staff mapping exists
        Staff.objects.get_or_create(user=user)

        return Response(
            {"status": "MANAGER_DEMOTED_TO_STAFF"},
            status=status.HTTP_200_OK
        )


class StaffDismissAPIView(APIView):
    permission_classes = [IsAdmin | IsManager]

    @transaction.atomic
    def post(self, request):
        """
        Dismiss a staff member.
        Body:
        {
            "staff_id": <staff_id>
        }
        """

        staff_id = request.data.get("staff_id")
        if not staff_id:
            return Response({"error": "staff_id required"}, status=400)

        try:
            staff = Staff.objects.select_for_update().get(id=staff_id)
        except Staff.DoesNotExist:
            return Response({"error": "Staff not found"}, status=404)

        # MANAGER restriction
        if request.user.role.name == Role.MANAGER:
            if not staff.warehouse or staff.warehouse.manager.user != request.user:
                return Response(
                    {"error": "Not authorized to dismiss this staff"},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Soft dismissal
        staff.user.is_active = False
        staff.user.save(update_fields=["is_active"])

        staff.warehouse = None
        staff.save(update_fields=["warehouse"])

        return Response(
            {"status": "STAFF_DISMISSED"},
            status=status.HTTP_200_OK
        )
