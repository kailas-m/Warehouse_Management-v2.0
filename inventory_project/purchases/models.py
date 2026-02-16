from django.db import models
from django.utils import timezone


class PurchaseRequest(models.Model):
    """
    Purchase request workflow model.
    """
    STATUS_PENDING = "PENDING"
    STATUS_APPROVED = "APPROVED"
    STATUS_REJECTED = "REJECTED"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_REJECTED, "Rejected"),
    ]

    viewer = models.ForeignKey(
        "accounts.User",  # String reference
        on_delete=models.CASCADE,
        related_name="purchase_requests"
    )
    product = models.ForeignKey(
        "inventory.Product",  # String reference
        on_delete=models.CASCADE
    )
    warehouse = models.ForeignKey(
        "warehouses.Warehouse",  # String reference
        on_delete=models.CASCADE
    )
    quantity = models.IntegerField(default=1)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING
    )
    created_at = models.DateTimeField(default=timezone.now)

    # optional: processed_by/processed_at fields
    processed_by = models.ForeignKey(
        "accounts.User",  # String reference
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="processed_purchase_requests"
    )
    processed_at = models.DateTimeField(null=True, blank=True)

    # optionally a staff assigned field (if you use it)
    staff_assigned = models.ForeignKey(
        "roles.Staff",  # String reference
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_purchases"
    )

    class Meta:
        db_table = 'warehouses_purchaserequest'  # Preserve existing table name

    def __str__(self):
        return f"PR#{self.id} {self.product.name} x{self.quantity} ({self.status})"


class PurchaseApproval(models.Model):
    """
    Records purchase request approvals.
    """
    purchase_request = models.ForeignKey(
        PurchaseRequest,
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
        db_table = 'warehouses_purchaseapproval'  # Preserve existing table name
