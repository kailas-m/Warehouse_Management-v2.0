
# =====================================================
# STAFF TRANSFER
# =====================================================
class StaffTransferRequestSerializer(serializers.ModelSerializer):
    staff_username = serializers.CharField(source="staff.user.username", read_only=True)
    target_warehouse_name = serializers.CharField(source="target_warehouse.name", read_only=True)
    requested_by_username = serializers.CharField(source="requested_by.username", read_only=True)
    approved_by_username = serializers.CharField(source="approved_by.username", read_only=True)
    current_warehouse_name = serializers.CharField(source="staff.warehouse.name", read_only=True)
    current_warehouse_id = serializers.IntegerField(source="staff.warehouse.id", read_only=True)

    class Meta:
        model = StaffTransferRequest
        fields = [
            "id",
            "staff",
            "staff_username",
            "current_warehouse_id",
            "current_warehouse_name",
            "target_warehouse",
            "target_warehouse_name",
            "status",
            "requested_by",
            "requested_by_username",
            "created_at",
            "approved_by",
            "approved_by_username",
            "approved_at",
            "response_note",
        ]
        read_only_fields = [
            "status",
            "requested_by",
            "created_at",
            "approved_by",
            "approved_at",
        ]
