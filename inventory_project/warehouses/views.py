from django.db import transaction, models
from django.utils import timezone
from rest_framework.parsers import MultiPartParser, FormParser

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from django.utils.dateparse import parse_date
from django.db.models import Q
from warehouses.utils.reports import generate_stock_movement_pdf


from warehouses.permissions import (
    IsAdmin,
    IsStaff,
    IsManager,
    IsManagerOrAdmin,
    CanViewProfile,
)

from warehouses.models import (
    Warehouse,
    Product,
    Stock,
    PurchaseRequest,
    PurchaseApproval,
    TransferRequest,
    TransferApproval,
    StaffApproval,
    ManagerPromotionRequest,
    Manager,
    Role,
    User,
    Staff,
    Viewer,
    UserProfile,
    LowStockThreshold,
)

from warehouses.serializers import (
    RegisterSerializer,
    WarehouseCreateSerializer,
    ProductCreateSerializer,
    ProductReadSerializer,
    StockReadSerializer,
    StockAssignSerializer,
    PurchaseRequestCreateSerializer,
    PurchaseApprovalSerializer,
    TransferRequestCreateSerializer,
    TransferApprovalSerializer,
    StaffApprovalSerializer,
    ManagerPromotionDecisionSerializer,
    UserListSerializer,
    ManagerPromotionRequestReadSerializer,
    UserProfileSerializer,
    LowStockThresholdSerializer,
)

from datetime import datetime, timedelta
from collections import defaultdict
from django.core.paginator import Paginator

# Serializer for movement events
from rest_framework import serializers
# =====================================================
# AUTH
# =====================================================
class RegisterAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"message": "Registration successful"},
            status=status.HTTP_201_CREATED,
        )


# =====================================================
# WAREHOUSES
# =====================================================
class WarehouseCreateAPIView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        serializer = WarehouseCreateSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        warehouse = serializer.save()
        return Response(
            {
                "id": warehouse.id,
                "name": warehouse.name,
                "location": warehouse.location,
            },
            status=status.HTTP_201_CREATED,
        )


# =====================================================
# PRODUCTS
# =====================================================
class ProductCreateAPIView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        serializer = ProductCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        return Response(
            ProductReadSerializer(product).data,
            status=status.HTTP_201_CREATED,
        )


class ProductListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        products = Product.objects.all().order_by("name")
        return Response(ProductReadSerializer(products, many=True).data)


# =====================================================
# STOCK
# =====================================================
class StockListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        stocks = Stock.objects.select_related("product", "warehouse")
        return Response(StockReadSerializer(stocks, many=True).data)


class StockAssignAPIView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        serializer = StockAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        stock, _ = Stock.objects.get_or_create(
            product_id=serializer.validated_data["product_id"],
            warehouse_id=serializer.validated_data["warehouse_id"],
            defaults={"quantity": 0},
        )

        stock.quantity += serializer.validated_data["quantity"]
        stock.save(update_fields=["quantity"])

        return Response(
            {"status": "STOCK_ASSIGNED", "quantity": stock.quantity},
            status=status.HTTP_200_OK,
        )


# =====================================================
# PURCHASE REQUESTS
# =====================================================
class PurchaseRequestCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PurchaseRequestCreateSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        pr = serializer.save()
        return Response(
            {"id": pr.id, "status": pr.status},
            status=status.HTTP_201_CREATED,
        )


class PurchaseApproveAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = PurchaseApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        pr = PurchaseRequest.objects.select_for_update().get(
            id=serializer.validated_data["purchase_request_id"]
        )

        if pr.status != PurchaseRequest.STATUS_PENDING:
            return Response(
                {"error": "Purchase request already processed"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        warehouse = pr.warehouse

        # ---- PERMISSION LOGIC (CORRECT & FINAL) ----
        is_admin = user.role.name == Role.ADMIN

        is_manager_of_warehouse = (
            user.role.name == Role.MANAGER
            and warehouse.manager
            and warehouse.manager.user == user
        )

        is_staff_of_warehouse = (
            user.role.name == Role.STAFF
            and user.is_active
            and Staff.objects.filter(
                user=user,
                warehouse=warehouse
            ).exists()
        )

        if not (is_admin or is_manager_of_warehouse or is_staff_of_warehouse):
            return Response(
                {"error": "You do not have permission to approve this request"},
                status=status.HTTP_403_FORBIDDEN,
            )
        # --------------------------------------------

        decision = serializer.validated_data["decision"]

        if decision == "APPROVED":
            stock = Stock.objects.select_for_update().get(
                product=pr.product,
                warehouse=warehouse
            )

            if stock.quantity < pr.quantity:
                return Response(
                    {"error": "Insufficient stock"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            stock.quantity -= pr.quantity
            stock.save(update_fields=["quantity"])

            pr.status = PurchaseRequest.STATUS_APPROVED
        else:
            pr.status = PurchaseRequest.STATUS_REJECTED

        pr.processed_by = user
        pr.processed_at = timezone.now()
        pr.save()

        PurchaseApproval.objects.create(
            purchase_request=pr,
            approver=user,
            decision=decision,
        )

        return Response({"status": pr.status}, status=status.HTTP_200_OK)



class PurchaseRequestListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role.name == Role.ADMIN:
            qs = PurchaseRequest.objects.all()

        elif user.role.name == Role.MANAGER:
            warehouses = Warehouse.objects.filter(manager__user=user)
            qs = PurchaseRequest.objects.filter(warehouse__in=warehouses)

        elif user.role.name == Role.STAFF:
            qs = PurchaseRequest.objects.filter(staff_assigned__user=user)

        else:
            qs = PurchaseRequest.objects.filter(viewer=user)

        data = []
        for pr in qs.select_related("product", "warehouse", "viewer"):
            data.append(
                {
                    "id": pr.id,
                    "product": pr.product.name,
                    "warehouse": pr.warehouse.name,
                    "quantity": pr.quantity,
                    "status": pr.status,
                }
            )

        return Response(data)


# =====================================================
# TRANSFER REQUESTS
# =====================================================
class TransferRequestCreateAPIView(APIView):
    permission_classes = [IsManager]

    def post(self, request):
        serializer = TransferRequestCreateSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        destination_warehouse = serializer.validated_data["destination_warehouse"]

        # ✅ ensure requester is manager of destination warehouse
        if (
            destination_warehouse.manager is None
            or destination_warehouse.manager.user != request.user
        ):
            return Response(
                {"error": "Only destination warehouse manager can request transfers"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # ✅ FIX: explicitly set requested_by
        tr = TransferRequest.objects.create(
            requested_by=request.user,
            **serializer.validated_data
        )

        return Response(
            {"id": tr.id, "status": tr.status},
            status=status.HTTP_201_CREATED,
        )



class TransferApproveAPIView(APIView):
    permission_classes = [IsManagerOrAdmin]

    @transaction.atomic
    def post(self, request):
        serializer = TransferApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        tr = TransferRequest.objects.select_for_update().get(
            id=serializer.validated_data["transfer_request_id"]
        )

        decision = serializer.validated_data["decision"]

        if decision == "APPROVED":
            src = Stock.objects.select_for_update().get(
                product=tr.product,
                warehouse=tr.source_warehouse,
            )
            if src.quantity < tr.quantity:
                return Response(
                    {"error": "Insufficient stock"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            dst, _ = Stock.objects.get_or_create(
                product=tr.product,
                warehouse=tr.destination_warehouse,
                defaults={"quantity": 0},
            )

            src.quantity -= tr.quantity
            dst.quantity += tr.quantity
            src.save()
            dst.save()

            tr.status = TransferRequest.STATUS_APPROVED
        else:
            tr.status = TransferRequest.STATUS_REJECTED

        tr.save()

        TransferApproval.objects.create(
            transfer_request=tr,
            approver=request.user,
            decision=decision,
        )

        return Response({"status": tr.status})


class TransferRequestListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role.name == Role.ADMIN:
            qs = TransferRequest.objects.all()

        elif user.role.name == Role.MANAGER:
            warehouses = Warehouse.objects.filter(manager__user=user)
            qs = TransferRequest.objects.filter(
                models.Q(source_warehouse__in=warehouses)
                | models.Q(destination_warehouse__in=warehouses)
            )

        else:
            qs = TransferRequest.objects.none()

        data = []
        for tr in qs.select_related("product"):
            data.append(
                {
                    "id": tr.id,
                    "product": tr.product.name,
                    "quantity": tr.quantity,
                    "status": tr.status,
                }
            )

        return Response(data)


# =====================================================
# STAFF APPROVAL
# =====================================================
class StaffApproveAPIView(APIView):
    permission_classes = [IsManagerOrAdmin]

    def post(self, request):
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

        if (
            request.user.role.name == Role.MANAGER
            and warehouse.manager.user != request.user
        ):
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




# =====================================================
# USERS LIST
# =====================================================
class UserListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role.name not in [Role.ADMIN, Role.MANAGER]:
            return Response({"error": "Forbidden"}, status=403)

        users = User.objects.select_related("role").all()

        if user.role.name == Role.MANAGER:
            warehouses = Warehouse.objects.filter(manager__user=user)
            staff_ids = Staff.objects.filter(
                warehouse__in=warehouses
            ).values_list("user_id", flat=True)

            users = users.filter(
                models.Q(role__name=Role.VIEWER)
                | models.Q(id__in=staff_ids)
            )

        data = []
        for u in users:
            viewer_id = (
                Viewer.objects.filter(user=u)
                .values_list("id", flat=True)
                .first()
            )

            staff_id = (
                Staff.objects.filter(user=u)
                .values_list("id", flat=True)
                .first()
            )

            manager_id = (
                Manager.objects.filter(user=u)
                .values_list("id", flat=True)
                .first()
            )

            data.append({
                "user_id": u.id,
                "username": u.username,
                "email": u.email,
                "role": u.role.name,
                "is_active": u.is_active,
                "status": "APPROVED" if u.is_active else "PENDING",
                "viewer_id": viewer_id,
                "staff_id": staff_id,
                "manager_id": manager_id,
            })

        return Response(
            data,
            status=status.HTTP_200_OK
        )


class ManagerPromotionRequestListAPIView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = (
            ManagerPromotionRequest.objects
            .select_related("staff__user", "requested_by")
            .order_by("-id")
        )

        serializer = ManagerPromotionRequestReadSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


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


class UserProfileAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        # ✅ Auto-create profile if missing
        profile, _ = UserProfile.objects.get_or_create(
            user=request.user
        )

        serializer = UserProfileSerializer(
            profile,
            context={"request": request}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        # ✅ Create or update profile (partial update)
        profile, _ = UserProfile.objects.get_or_create(
            user=request.user
        )

        serializer = UserProfileSerializer(
            profile,
            data=request.data,
            partial=True,   # 🔥 key line
            context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request):
        # ✅ Delete only profile image (not profile)
        profile, _ = UserProfile.objects.get_or_create(
            user=request.user
        )

        if profile.profile_image:
            profile.profile_image.delete(save=True)

        return Response(
            {"status": "PROFILE_IMAGE_DELETED"},
            status=status.HTTP_200_OK
        )


# ------------------------------------------------------------------------
# DASHBOARDS
# ------------------------------------------------------------------------


class MovementEventSerializer(serializers.Serializer):
    event_id = serializers.IntegerField()
    event_type = serializers.CharField()        # PURCHASE_APPROVAL / TRANSFER_IN / TRANSFER_OUT / STOCK_ASSIGN
    timestamp = serializers.DateTimeField()
    product = serializers.CharField()
    quantity = serializers.IntegerField()
    quantity_change = serializers.IntegerField()  # + or - quantity
    source_warehouse = serializers.CharField(allow_null=True)
    destination_warehouse = serializers.CharField(allow_null=True)
    performed_by = serializers.CharField(allow_null=True)
    raw = serializers.DictField()  # optional raw data for debugging


def _get_datetime_from(obj, candidates):
    """
    Helper: try several attribute names on obj (or related obj) and return first
    non-None datetime. candidates is list of attr names e.g. ["created_at","processed_at","timestamp"].
    """
    for name in candidates:
        val = getattr(obj, name, None)
        if val:
            return val
    return None


def _safe_getattr(obj, attr, default=None):
    try:
        return getattr(obj, attr, default)
    except Exception:
        return default


class AdminDashboardAPIView(APIView):
    """
    GET /api/dashboard/admin/

    Permissions: ADMIN only.

    Returns:
    - overall_stock_trends: labels (dates) + net_changes list (incoming - outgoing) per day (daily granularity)
    - warehouse_comparison: list of warehouses with total_quantity, total_value (if product.price exists), low_stock_count
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        # date range: optional query params ?days=30 or start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
        days = int(request.query_params.get("days", 30))
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        if start_date and end_date:
            try:
                start = datetime.fromisoformat(start_date).date()
                end = datetime.fromisoformat(end_date).date()
            except Exception:
                return Response({"error": "Invalid date format. Use YYYY-MM-DD"}, status=400)
        else:
            end = datetime.utcnow().date()
            start = end - timedelta(days=days - 1)

        # build date labels (daily)
        delta = (end - start).days + 1
        labels = [(start + timedelta(days=i)).isoformat() for i in range(delta)]
        net_by_date = {label: 0 for label in labels}

        # ---- collect incoming/outgoing from approvals ----
        # PURCHASE_APPROVAL (approved) => outgoing from warehouse (negative)
        try:
            purchase_approvals = PurchaseApproval.objects.select_related("purchase_request", "approver").all()
        except Exception:
            purchase_approvals = []

        for pa in purchase_approvals:
            # find timestamp
            ts = _get_datetime_from(pa, ["created_at"]) or _get_datetime_from(pa.purchase_request, ["processed_at", "created_at"])
            if ts is None:
                continue
            ts_date = ts.date().isoformat()
            if ts_date < labels[0] or ts_date > labels[-1]:
                continue
            # treat approved as outgoing, else ignore
            try:
                decision = _safe_getattr(pa, "decision", None) or _safe_getattr(pa, "purchase_request", None) and _safe_getattr(pa.purchase_request, "status", None)
            except Exception:
                decision = None
            # only consider APPROVED as outgoing
            if decision and str(decision).upper().startswith("APPROV"):
                qty = int(_safe_getattr(pa.purchase_request, "quantity", 0) or 0)
                net_by_date[ts_date] -= qty

        # TRANSFER_APPROVAL (approved) => outgoing at source (-) and incoming at destination (+)
        try:
            transfer_approvals = TransferApproval.objects.select_related("transfer_request", "approver").all()
        except Exception:
            transfer_approvals = []

        for ta in transfer_approvals:
            ts = _get_datetime_from(ta, ["created_at"]) or _get_datetime_from(ta.transfer_request, ["processed_at", "created_at"])
            if ts is None:
                continue
            ts_date = ts.date().isoformat()
            if ts_date < labels[0] or ts_date > labels[-1]:
                continue
            # only APPROVED
            try:
                decision = _safe_getattr(ta, "decision", None) or _safe_getattr(ta.transfer_request, "status", None)
            except Exception:
                decision = None
            if decision and str(decision).upper().startswith("APPROV"):
                qty = int(_safe_getattr(ta.transfer_request, "quantity", 0) or 0)
                # outgoing
                net_by_date[ts_date] -= qty
                # incoming
                net_by_date[ts_date] += qty  # net change cancels out globally, but this shows transfer movement;
                # depending on your definition net change could ignore internal transfers - keep both for transparency

        # prepare net_changes array in label order
        net_changes = [net_by_date[label] for label in labels]

        # ---- warehouse comparison ----
        warehouses = Warehouse.objects.select_related("manager").all()
        warehouse_list = []
        for w in warehouses:
            stocks = Stock.objects.filter(warehouse=w).select_related("product")
            total_qty = 0
            total_value = 0
            low_count = 0
            for s in stocks:
                q = int(getattr(s, "quantity", 0) or 0)
                total_qty += q
                price = getattr(s.product, "price", None)
                if price is not None:
                    try:
                        total_value += q * float(price)
                    except Exception:
                        total_value += 0
                # threshold: prefer per-stock min_required_quantity if present, else default 10
                threshold = getattr(s, "min_required_quantity", None)
                if threshold is None:
                    threshold = getattr(s, "threshold", None)
                if threshold is None:
                    threshold = int(request.query_params.get("default_threshold", 10))
                if q <= int(threshold):
                    low_count += 1

            warehouse_list.append({
                "warehouse_id": w.id,
                "name": w.name,
                "total_quantity": total_qty,
                "total_value": int(total_value),
                "low_stock_count": low_count,
                "manager": getattr(w.manager, "user_id", None) if getattr(w, "manager", None) else None,
            })

        # sort by highest stock first (requirement)
        warehouse_list.sort(key=lambda x: x["total_quantity"], reverse=True)

        return Response({
            "overall_stock_trends": {
                "labels": labels,
                "net_changes": net_changes,
                "granularity": "daily",
                "range": {"start": labels[0], "end": labels[-1]},
            },
            "warehouse_comparison": warehouse_list,
        }, status=status.HTTP_200_OK)


class WarehouseDashboardAPIView(APIView):
    """
    POST /api/dashboard/warehouse/
    Body JSON (required): {"warehouse_id": <int>, "page": <int>, "page_size": <int>}
    Permissions:
      - Admin: can view any warehouse
      - Manager: only if manager of that warehouse
      - Staff: only if staff assigned to that warehouse
    Returns:
      - movement_history (paginated, newest first)
      - low_stock_alerts
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data or {}
        warehouse_id = data.get("warehouse_id")
        if not warehouse_id:
            return Response({"error": "warehouse_id required in JSON body"}, status=400)

        # permission checks
        user = request.user
        try:
            warehouse = Warehouse.objects.get(id=warehouse_id)
        except Warehouse.DoesNotExist:
            return Response({"error": "warehouse not found"}, status=404)

        if user.role.name == Role.ADMIN:
            pass
        elif user.role.name == Role.MANAGER:
            if not warehouse.manager or warehouse.manager.user != user:
                return Response({"error": "Not authorized for this warehouse"}, status=403)
        elif user.role.name == Role.STAFF:
            # verify staff assigned to warehouse
            staff_qs = Staff.objects.filter(user=user, warehouse=warehouse)
            if not staff_qs.exists():
                return Response({"error": "Not authorized for this warehouse"}, status=403)
        else:
            return Response({"error": "Forbidden"}, status=403)

        # collect movement events (ALL TIME, newest first)
        events = []

        # Purchase approvals -> outgoing
        try:
            purchase_approvals = PurchaseApproval.objects.select_related("purchase_request", "approver").filter(
                purchase_request__warehouse=warehouse
            )
        except Exception:
            purchase_approvals = []

        for pa in purchase_approvals:
            # only approved
            dec = _safe_getattr(pa, "decision", None) or _safe_getattr(pa.purchase_request, "status", None)
            if not dec or not str(dec).upper().startswith("APPROV"):
                continue
            ts = _get_datetime_from(pa, ["created_at"]) or _get_datetime_from(pa.purchase_request, ["processed_at", "created_at"])
            if ts is None:
                continue
            qty = int(_safe_getattr(pa.purchase_request, "quantity", 0) or 0)
            events.append({
                "event_id": getattr(pa, "id", 0),
                "event_type": "PURCHASE_APPROVAL",
                "timestamp": ts,
                "product": _safe_getattr(pa.purchase_request.product, "name", str(_safe_getattr(pa.purchase_request, "product", ""))),
                "quantity": qty,
                "quantity_change": -qty,
                "source_warehouse": _safe_getattr(pa.purchase_request, "warehouse", None) and str(_safe_getattr(pa.purchase_request.warehouse, "name", pa.purchase_request.warehouse.id)),
                "destination_warehouse": None,
                "performed_by": _safe_getattr(pa.approver, "username", None),
                "raw": {"purchase_request_id": getattr(pa.purchase_request, "id", None)},
            })

        # Transfer approvals -> outgoing/incoming for this warehouse
        try:
            transfer_approvals = TransferApproval.objects.select_related("transfer_request", "approver").filter(
                transfer_request__source_warehouse=warehouse
            ) | TransferApproval.objects.select_related("transfer_request", "approver").filter(
                transfer_request__destination_warehouse=warehouse
            )
        except Exception:
            transfer_approvals = []

        # ensure unique queryset evaluation
        if hasattr(transfer_approvals, "__iter__") and not isinstance(transfer_approvals, list):
            transfer_approvals = list(transfer_approvals)

        for ta in transfer_approvals:
            dec = _safe_getattr(ta, "decision", None) or _safe_getattr(ta.transfer_request, "status", None)
            if not dec or not str(dec).upper().startswith("APPROV"):
                continue
            ts = _get_datetime_from(ta, ["created_at"]) or _get_datetime_from(ta.transfer_request, ["processed_at", "created_at"])
            if ts is None:
                continue
            tr = ta.transfer_request
            qty = int(_safe_getattr(tr, "quantity", 0) or 0)
            # outgoing if this warehouse is source
            if getattr(tr, "source_warehouse", None) and tr.source_warehouse.id == warehouse.id:
                events.append({
                    "event_id": getattr(ta, "id", 0),
                    "event_type": "TRANSFER_OUT",
                    "timestamp": ts,
                    "product": _safe_getattr(tr.product, "name", str(_safe_getattr(tr, "product", ""))),
                    "quantity": qty,
                    "quantity_change": -qty,
                    "source_warehouse": _safe_getattr(tr.source_warehouse, "name", None),
                    "destination_warehouse": _safe_getattr(tr.destination_warehouse, "name", None),
                    "performed_by": _safe_getattr(ta.approver, "username", None),
                    "raw": {"transfer_request_id": getattr(tr, "id", None)},
                })
            if getattr(tr, "destination_warehouse", None) and tr.destination_warehouse.id == warehouse.id:
                events.append({
                    "event_id": getattr(ta, "id", 0),
                    "event_type": "TRANSFER_IN",
                    "timestamp": ts,
                    "product": _safe_getattr(tr.product, "name", str(_safe_getattr(tr, "product", ""))),
                    "quantity": qty,
                    "quantity_change": qty,
                    "source_warehouse": _safe_getattr(tr.source_warehouse, "name", None),
                    "destination_warehouse": _safe_getattr(tr.destination_warehouse, "name", None),
                    "performed_by": _safe_getattr(ta.approver, "username", None),
                    "raw": {"transfer_request_id": getattr(tr, "id", None)},
                })

        # Manual stock assignments: any Stock objects created for this warehouse
        try:
            stocks = Stock.objects.filter(warehouse=warehouse).select_related("product")
        except Exception:
            stocks = []

        # If Stock has a 'created_at' timestamp we can include original creation as "STOCK_ASSIGN"
        for s in stocks:
            created_ts = _get_datetime_from(s, ["created_at", "updated_at"])
            if created_ts:
                # consider this an assignment/incoming snapshot event (use quantity as incoming)
                events.append({
                    "event_id": getattr(s, "id", 0),
                    "event_type": "STOCK_ASSIGN",
                    "timestamp": created_ts,
                    "product": _safe_getattr(s.product, "name", str(_safe_getattr(s, "product", ""))),
                    "quantity": int(getattr(s, "quantity", 0) or 0),
                    "quantity_change": int(getattr(s, "quantity", 0) or 0),
                    "source_warehouse": None,
                    "destination_warehouse": _safe_getattr(s.warehouse, "name", None),
                    "performed_by": None,
                    "raw": {"stock_id": getattr(s, "id", None)},
                })

        # sort events newest first
        events_sorted = sorted(events, key=lambda x: x["timestamp"], reverse=True)

        # pagination
        page = int(data.get("page", 1))
        page_size = int(data.get("page_size", 20))
        paginator = Paginator(events_sorted, page_size)
        try:
            page_obj = paginator.page(page)
        except Exception:
            page_obj = paginator.page(1)

        serializer = MovementEventSerializer(page_obj.object_list, many=True)

        # low stock alerts (per-warehouse per-product threshold)
        low_alerts = []
        for s in stocks:
            q = int(getattr(s, "quantity", 0) or 0)
            threshold = getattr(s, "min_required_quantity", None) or getattr(s, "threshold", None)
            if threshold is None:
                threshold = int(request.data.get("default_threshold", 10))
            if q <= int(threshold):
                low_alerts.append({
                    "stock_id": s.id,
                    "product": _safe_getattr(s.product, "name", str(_safe_getattr(s, "product", ""))),
                    "quantity": q,
                    "threshold": int(threshold),
                })

        return Response({
            "movement_history": {
                "page": page,
                "page_size": page_size,
                "total_pages": paginator.num_pages,
                "total_items": paginator.count,
                "items": serializer.data,
            },
            "low_stock_alerts": low_alerts,
        }, status=status.HTTP_200_OK)




class StockMovementReportAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role.name not in [Role.ADMIN, Role.MANAGER]:
            return Response({"error": "Forbidden"}, status=403)

        warehouse_id = request.query_params.get("warehouse_id")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        if not all([start_date, end_date]):
            return Response(
                {"error": "start_date and end_date are required"},
                status=400,
            )

        start_date = parse_date(start_date)
        end_date = parse_date(end_date)

        if not start_date or not end_date:
            return Response({"error": "Invalid date format"}, status=400)

        # ----------------------------------
        # Determine warehouses to include
        # ----------------------------------
        if user.role.name == Role.ADMIN:
            if warehouse_id:
                try:
                    warehouses = [Warehouse.objects.get(id=warehouse_id)]
                except Warehouse.DoesNotExist:
                    return Response({"error": "Warehouse not found"}, status=404)
            else:
                warehouses = Warehouse.objects.all()
        else:
            # MANAGER (single warehouse only)
            if not warehouse_id:
                return Response(
                    {"error": "warehouse_id is required for managers"},
                    status=400,
                )

            try:
                warehouse = Warehouse.objects.get(id=warehouse_id)
            except Warehouse.DoesNotExist:
                return Response({"error": "Warehouse not found"}, status=404)

            if warehouse.manager.user != user:
                return Response({"error": "Not your warehouse"}, status=403)

            warehouses = [warehouse]

        # ----------------------------------
        # Collect movements
        # ----------------------------------
        movements = []

        # Purchases (outgoing)
        purchases = PurchaseApproval.objects.filter(
            purchase_request__warehouse__in=warehouses,
            purchase_request__processed_at__date__range=(start_date, end_date),
            decision="APPROVED",
        ).select_related(
            "purchase_request__product",
            "purchase_request__warehouse",
            "approver",
        )

        for p in purchases:
            pr = p.purchase_request
            movements.append({
                "date": pr.processed_at.strftime("%Y-%m-%d %H:%M"),
                "product": pr.product.name,
                "quantity": -pr.quantity,
                "source": pr.warehouse.name,
                "destination": "Customer",
                "performed_by": p.approver.username,
            })

        # Transfers
        transfers = TransferApproval.objects.filter(
            transfer_request__status="APPROVED",
            transfer_request__created_at__date__range=(start_date, end_date),
        ).filter(
            Q(transfer_request__source_warehouse__in=warehouses)
            | Q(transfer_request__destination_warehouse__in=warehouses)
        ).select_related(
            "transfer_request__product",
            "transfer_request__source_warehouse",
            "transfer_request__destination_warehouse",
            "approver",
        )


        for t in transfers:
            tr = t.transfer_request

            if tr.source_warehouse in warehouses:
                qty = -tr.quantity
                src = tr.source_warehouse.name
                dst = tr.destination_warehouse.name
            elif tr.destination_warehouse in warehouses:
                qty = tr.quantity
                src = tr.source_warehouse.name
                dst = tr.destination_warehouse.name
            else:
                continue

            movements.append({
                "date": tr.created_at.strftime("%Y-%m-%d %H:%M"),
                "product": tr.product.name,
                "quantity": qty,
                "source": src,
                "destination": dst,
                "performed_by": t.approver.username,
            })

        movements.sort(key=lambda x: x["date"])

        return generate_stock_movement_pdf(
            warehouse=None if len(warehouses) > 1 else warehouses[0],
            movements=movements,
            start_date=start_date,
            end_date=end_date,
        )



class LowStockThresholdAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self, request):
        if request.user.role.name == Role.ADMIN:
            return LowStockThreshold.objects.all()

        if request.user.role.name == Role.MANAGER:
            return LowStockThreshold.objects.filter(
                warehouse__manager__user=request.user
            )

        return LowStockThreshold.objects.none()

    def get(self, request):
        qs = self.get_queryset(request)
        serializer = LowStockThresholdSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = LowStockThresholdSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        warehouse = serializer.validated_data["warehouse"]

        # Manager safety check
        if (
            request.user.role.name == Role.MANAGER
            and warehouse.manager.user != request.user
        ):
            return Response(
                {"error": "Not your warehouse"},
                status=status.HTTP_403_FORBIDDEN,
            )

        threshold, created = LowStockThreshold.objects.update_or_create(
            warehouse=serializer.validated_data["warehouse"],
            product=serializer.validated_data["product"],
            defaults={
                "threshold_quantity": serializer.validated_data[
                    "threshold_quantity"
                ]
            },
        )

        return Response(
            LowStockThresholdSerializer(threshold).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def delete(self, request):
        threshold_id = request.data.get("id")

        if not threshold_id:
            return Response(
                {"error": "id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            threshold = LowStockThreshold.objects.get(id=threshold_id)
        except LowStockThreshold.DoesNotExist:
            return Response(
                {"error": "Threshold not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if (
            request.user.role.name == Role.MANAGER
            and threshold.warehouse.manager.user != request.user
        ):
            return Response(
                {"error": "Not your warehouse"},
                status=status.HTTP_403_FORBIDDEN,
            )

        threshold.delete()
        return Response(
            {"status": "THRESHOLD_DELETED"},
            status=status.HTTP_200_OK,
        )