from django.db import models
from django.utils import timezone
from core.constants import RequestStatus


class TransferRequest(models.Model):
    """
    Transfer request workflow model.
    """
    # Use centralized constants
    STATUS_PENDING = RequestStatus.PENDING
    STATUS_APPROVED = RequestStatus.APPROVED
    STATUS_REJECTED = RequestStatus.REJECTED

    STATUS_CHOICES = RequestStatus.CHOICES

    product = models.ForeignKey(
        "inventory.Product",  # String reference
        on_delete=models.CASCADE
    )
    source_warehouse = models.ForeignKey(
        "warehouses.Warehouse",  # String reference
        on_delete=models.CASCADE,
        related_name="transfer_sources"
    )
    destination_warehouse = models.ForeignKey(
        "warehouses.Warehouse",  # String reference
        on_delete=models.CASCADE,
        related_name="transfer_destinations"
    )
    quantity = models.IntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING
    )
    created_at = models.DateTimeField(default=timezone.now)
    requested_by = models.ForeignKey(
        "accounts.User",  # String reference
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="transfer_requests"
    )
    
    # Approval tracking
    approved_by = models.ForeignKey(
        "accounts.User",  # String reference
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="approved_transfers"
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'warehouses_transferrequest'  # Preserve existing table name

    def __str__(self):
        return f"TR#{self.id} {self.product.name} {self.source_warehouse} → {self.destination_warehouse} ({self.status})"


class TransferApproval(models.Model):
    """
    Records transfer request approvals.
    """
    transfer_request = models.ForeignKey(
        TransferRequest,
        on_delete=models.CASCADE,
        related_name="approvals"
    )
    approver = models.ForeignKey(
        "accounts.User",  # String reference
        on_delete=models.CASCADE
    )
    decision = models.CharField(max_length=20)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'warehouses_transferapproval'  # Preserve existing table name
