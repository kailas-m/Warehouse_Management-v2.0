
class StaffTransferRequest(models.Model):
    STATUS_PENDING = "PENDING"
    STATUS_APPROVED = "APPROVED"
    STATUS_REJECTED = "REJECTED"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_REJECTED, "Rejected"),
    ]

    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name="transfer_requests")
    target_warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name="incoming_staff_transfers")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    
    requested_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="requested_staff_transfers")
    created_at = models.DateTimeField(default=timezone.now)
    
    approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="approved_staff_transfers")
    approved_at = models.DateTimeField(null=True, blank=True)
    response_note = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"StaffTransfer {self.staff.user.username} -> {self.target_warehouse.name} ({self.status})"
