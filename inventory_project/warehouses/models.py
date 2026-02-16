from django.db import models
from django.conf import settings
from core.constants import RequestStatus


class Warehouse(models.Model):
    """
    Physical warehouse entity.
    """
    name = models.CharField(max_length=255)
    location = models.CharField(max_length=512, blank=True, null=True)
    created_by = models.ForeignKey(
        "accounts.User",  # String reference
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )
    # IMPORTANT CHANGE: allow the same Manager to be assigned to multiple warehouses
    # previously this was likely OneToOne - we change it to ForeignKey to allow reuse
    manager = models.ForeignKey(
        "roles.Manager",  # String reference
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="warehouses",
    )

    is_deleted = models.BooleanField(default=False)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="deleted_warehouses",
    )

    class Meta:
        db_table = 'warehouses_warehouse'  # Preserve existing table name

    def __str__(self):
        return f"{self.name} ({self.location})"


class StaffTransferRequest(models.Model):
    """
    Request to transfer staff from one warehouse to another.
    """
    # Use centralized constants
    STATUS_PENDING = RequestStatus.PENDING
    STATUS_APPROVED = RequestStatus.APPROVED
    STATUS_REJECTED = RequestStatus.REJECTED

    STATUS_CHOICES = RequestStatus.CHOICES

    staff = models.ForeignKey(
        "roles.Staff",  # String reference
        on_delete=models.CASCADE,
        related_name="transfer_requests"
    )
    target_warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.CASCADE,
        related_name="incoming_staff_transfers"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING
    )
    
    requested_by = models.ForeignKey(
        "accounts.User",  # String reference
        on_delete=models.CASCADE,
        related_name="requested_staff_transfers"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    approved_by = models.ForeignKey(
        "accounts.User",  # String reference
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="approved_staff_transfers"
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    response_note = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'warehouses_stafftransferrequest'  # Preserve existing table name

    def __str__(self):
        return f"StaffTransfer {self.staff.user.username} -> {self.target_warehouse.name} ({self.status})"
