from django.db import models
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import update_last_login

from accounts.models import User, UserProfile
from roles.models import Role, Viewer, Staff, Manager
from warehouses.models import Warehouse
from warehouses.serializers import RegisterSerializer, UserProfileSerializer
from core.utils import log_error
from core.pagination import StandardResultsSetPagination


# =====================================================
# AUTH
# =====================================================
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        # Update last_login
        update_last_login(None, self.user)
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class RegisterAPIView(APIView):
    authentication_classes = []
    permission_classes = []
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        try:
            log_error(f"Register POST Data: {request.data}")
            serializer = RegisterSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(
                {"message": "Registration successful"},
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            import traceback
            log_error(f"Registration Error: {e}")
            log_error(traceback.format_exc())
            # Return the error to the frontend so it can display it
            return Response(str(e), status=500)


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
            ).exclude(role__name=Role.MANAGER) # Explicitly exclude other managers

        # 🔒 Filter by Role (if requested)
        # This fixes pagination issues by filtering at DB level
        role_filter = request.query_params.get("role")
        if role_filter:
            users = users.filter(role__name=role_filter)

        # 🔍 Filters
        approved_param = request.query_params.get("approved") or request.query_params.get("is_active")
        if approved_param:
            is_active = approved_param.lower() == 'true'
            users = users.filter(is_active=is_active)

        warehouse_param = request.query_params.get("warehouse")
        if warehouse_param:
            users = users.filter(
                models.Q(staff__warehouse__id=warehouse_param)
                | models.Q(manager__warehouses__id=warehouse_param)
            ).distinct()

        # 🔒 Sorting
        ordering = request.query_params.get("ordering", "username")
        allowed_ordering = ["username", "email", "role__name", "-date_joined"]
        if ordering not in allowed_ordering:
            ordering = "username"
        users = users.order_by(ordering)

        users = users.select_related("role", "staff__warehouse", "manager").prefetch_related("manager__warehouses")

        paginator = StandardResultsSetPagination()
        page_users = paginator.paginate_queryset(users, request)

        data = []
        for u in page_users:
            # Profile Fields
            try:
                profile = u.profile
                full_name = profile.full_name
                phone_number = profile.phone_number
            except Exception:
                full_name = None
                phone_number = None

            # Warehouse Info
            assigned_warehouse = None
            managed_warehouses = []
            
            if u.role.name == Role.STAFF and hasattr(u, "staff"):
                if u.staff.warehouse:
                    assigned_warehouse = {
                        "id": u.staff.warehouse.id,
                        "name": u.staff.warehouse.name,
                        "manager": u.staff.warehouse.manager.user.username if u.staff.warehouse.manager else None
                    }
            
            if u.role.name == Role.MANAGER and hasattr(u, "manager"):
                managed = u.manager.warehouses.all()
                managed_warehouses = [{"id": w.id, "name": w.name} for w in managed]

            viewer_id = (
                Viewer.objects.filter(user=u)
                .values_list("id", flat=True)
                .first()
            )

            staff_id = u.staff.id if hasattr(u, "staff") else None
            manager_id = u.manager.id if hasattr(u, "manager") else None

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
                "full_name": full_name,
                "phone_number": phone_number,
                "assigned_warehouse": assigned_warehouse,
                "managed_warehouses": managed_warehouses
            })

        return paginator.get_paginated_response(data)


# =====================================================
# USER PROFILE
# =====================================================
class UserProfileAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        target_user = request.user
        user_id = request.query_params.get("user_id")

        # Allow Admin OR Manager to view other profiles
        if user_id and request.user.role and request.user.role.name in [Role.ADMIN, Role.MANAGER]:
            try:
                target_user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({"error": "User not found"}, status=404)

        profile, _ = UserProfile.objects.get_or_create(user=target_user)

        profile_data = UserProfileSerializer(
            profile,
            context={"request": request}
        ).data

        user_data = {
            "id": target_user.id,
            "username": target_user.username,
            "email": target_user.email,
            "role": target_user.role.name if target_user.role else None,
            "is_active": target_user.is_active,
            "last_login": target_user.last_login,
        }

        # Add assigned warehouses if Manager or Staff
        if target_user.role:
            if target_user.role.name == Role.MANAGER:
                 try:
                     manager_profile = target_user.manager
                     assigned = Warehouse.objects.filter(manager=manager_profile).values("id", "name")
                     user_data["assigned_warehouses"] = list(assigned)
                 except (Manager.DoesNotExist, AttributeError):
                     user_data["assigned_warehouses"] = []
            elif target_user.role.name == Role.STAFF:
                 try:
                     staff_profile = target_user.staff
                     if staff_profile.warehouse:
                         user_data["assigned_warehouses"] = [{"id": staff_profile.warehouse.id, "name": staff_profile.warehouse.name}]
                     else:
                         user_data["assigned_warehouses"] = []
                 except (Staff.DoesNotExist, AttributeError):
                     user_data["assigned_warehouses"] = []
            else:
                 user_data["assigned_warehouses"] = []

        return Response({
            "user": user_data,
            "profile": profile_data
        }, status=status.HTTP_200_OK)

    def patch(self, request):
        # ✅ Create or update profile (partial update)
        profile, _ = UserProfile.objects.get_or_create(
            user=request.user
        )
        
        # 🟢 Handle Email Update
        new_email = request.data.get("email")
        if new_email and new_email != request.user.email:
            # Check if email already exists
            if User.objects.filter(email=new_email).exclude(id=request.user.id).exists():
                 return Response({"error": "Email already in use"}, status=400)
            
            request.user.email = new_email
            request.user.save(update_fields=["email"])

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

