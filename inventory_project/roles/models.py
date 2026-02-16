from django.db import models
from core.constants import UserRole, RequestStatus


class Role(models.Model):
    """
    Role definitions for the system.
    """
    # Use centralized constants
    ADMIN = UserRole.ADMIN
    MANAGER = UserRole.MANAGER
    STAFF = UserRole.STAFF
    VIEWER = UserRole.VIEWER

    NAME_CHOICES = UserRole.CHOICES

    name = models.CharField(max_length=50, choices=NAME_CHOICES, unique=True)

    class Meta:
        db_table = 'warehouses_role'  # Preserve existing table name

    def __str__(self):
        return self.name


class Viewer(models.Model):
    """
    Viewer role profile.
    """
    user = models.OneToOneField(
        "accounts.User",  # String reference
        on_delete=models.CASCADE,
        related_name="viewer"
    )

    class Meta:
        db_table = 'warehouses_viewer'  # Preserve existing table name

    def __str__(self):
        return f"Viewer({self.user.username})"


class Staff(models.Model):
    """
    Staff mapping: one DB row per staff user. Staff may be assigned to a warehouse.
    The `warehouse` field is a ForeignKey so staff may be unassigned (null) or assigned.
    """
    user = models.OneToOneField(
        "accounts.User",  # String reference
        on_delete=models.CASCADE,
        related_name="staff"
    )
    # warehouse may be assigned later during approval
    warehouse = models.ForeignKey(
        "warehouses.Warehouse",  # String reference to avoid circular import
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="staffs",
    )

    class Meta:
        db_table = 'warehouses_staff'  # Preserve existing table name

    def __str__(self):
        return f"Staff({self.user.username})"


class Manager(models.Model):
    """
    Manager mapping: one DB row per manager user.
    A Manager can now be associated with *many* warehouses (via Warehouse.manager FK).
    """
    user = models.OneToOneField(
        "accounts.User",  # String reference
        on_delete=models.CASCADE,
        related_name="manager"
    )

    class Meta:
        db_table = 'warehouses_manager'  # Preserve existing table name

    def __str__(self):
        return f"Manager({self.user.username})"


class StaffApproval(models.Model):
    """
    Records when a staff member was approved.
    """
    staff = models.ForeignKey(
        Staff,
        on_delete=models.CASCADE,
        related_name="approvals"
    )
    approved_by = models.ForeignKey(
        "accounts.User",  # String reference
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )
    approved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'warehouses_staffapproval'  # Preserve existing table name


class ManagerPromotionRequest(models.Model):
    """
    Request to promote a staff member to manager.
    """
    # Use centralized constants
    STATUS_PENDING = RequestStatus.PENDING
    STATUS_APPROVED = RequestStatus.APPROVED
    STATUS_REJECTED = RequestStatus.REJECTED

    STATUS_CHOICES = RequestStatus.CHOICES

    staff = models.ForeignKey(
        Staff,
        on_delete=models.CASCADE
    )
    requested_by = models.ForeignKey(
        "accounts.User",  # String reference
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="promotion_requests"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING
    )
    requested_at = models.DateTimeField(auto_now_add=True)
    approved_by = models.ForeignKey(
        "accounts.User",  # String reference
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="approved_promotions"
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'warehouses_managerpromotionrequest'  # Preserve existing table name

    def __str__(self):
        return f"PromReq#{self.id} for {self.staff}"
