from rest_framework.permissions import BasePermission
from roles.models import Role, Staff, Manager


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role.name == Role.ADMIN
        )


class IsManager(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role.name == Role.MANAGER
        )


class IsStaff(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role.name == Role.STAFF
        )


class IsManagerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role.name in [Role.MANAGER, Role.ADMIN]
        )


class CanViewProfile(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user

        # Own profile
        if obj.user == user:
            return True

        # Admin can view any profile
        if user.role.name == "ADMIN":
            return True

        # Manager can view their staff profiles
        if user.role.name == "MANAGER":
            return Staff.objects.filter(
                user=obj.user,
                warehouse__manager__user=user,
            ).exists()

        return False
