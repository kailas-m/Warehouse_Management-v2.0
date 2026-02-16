from django.db import transaction
from rest_framework import serializers
from django.contrib.auth import get_user_model
from inventory.models import LowStockThreshold

from accounts.models import UserProfile
from roles.models import Role, Viewer, Staff, Manager, ManagerPromotionRequest
from warehouses.models import Warehouse, StaffTransferRequest
from inventory.models import Product, Stock
from purchases.models import PurchaseRequest, PurchaseApproval
from transfers.models import TransferRequest, TransferApproval

User = get_user_model()


# =====================================================
# AUTH
# =====================================================
class RegisterSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=[Role.VIEWER, Role.STAFF])
    full_name = serializers.CharField(required=False, allow_blank=True)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    profile_image = serializers.ImageField(required=False)

    class Meta:
        model = User
        fields = ["username", "email", "password", "role", "full_name", "phone_number", "profile_image"]
        extra_kwargs = {"password": {"write_only": True}}

    @transaction.atomic
    def create(self, validated_data):
        role_name = validated_data.pop("role")
        
        # Pop profile data
        full_name = validated_data.pop("full_name", "")
        phone_number = validated_data.pop("phone_number", "")
        profile_image = validated_data.pop("profile_image", None)

        role = Role.objects.get(name=role_name)

        user = User.objects.create_user(
            role=role,
            is_active=False if role.name == Role.STAFF else True,
            **validated_data
        )

        # Create Profile
        profile_data = {
            "full_name": full_name,
            "phone_number": phone_number,
        }
        if profile_image:
            profile_data["profile_image"] = profile_image
            
        UserProfile.objects.update_or_create(user=user, defaults=profile_data)

        if role.name == Role.VIEWER:
            Viewer.objects.get_or_create(user=user)

        elif role.name == Role.STAFF:
            # NEVER pass warehouse here
            Staff.objects.get_or_create(user=user)

        return user


# =====================================================
# WAREHOUSE
# =====================================================
class WarehouseCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = ["name", "location"]

class WarehouseListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = ["id", "name", "location"]


# =====================================================
# PRODUCT
# =====================================================
class ProductCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = "__all__"


class ProductReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = "__all__"


# =====================================================
# STOCK
# =====================================================
class StockReadSerializer(serializers.ModelSerializer):
    product = ProductReadSerializer(read_only=True)
    warehouse = serializers.StringRelatedField()

    class Meta:
        model = Stock
        fields = "__all__"


class StockAssignSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    warehouse_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


# =====================================================
# PURCHASE REQUESTS
# =====================================================
class PurchaseRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseRequest
        fields = ["product", "warehouse", "quantity"]

    def create(self, validated_data):
        request = self.context["request"]
        return PurchaseRequest.objects.create(
            viewer=request.user,
            **validated_data
        )


class PurchaseApprovalSerializer(serializers.Serializer):
    purchase_request_id = serializers.IntegerField()
    decision = serializers.ChoiceField(choices=["APPROVED", "REJECTED"])


class PurchaseRequestReadSerializer(serializers.ModelSerializer):
    product = serializers.StringRelatedField()
    warehouse = serializers.StringRelatedField()
    viewer = serializers.StringRelatedField()

    class Meta:
        model = PurchaseRequest
        fields = "__all__"


# =====================================================
# TRANSFER REQUESTS
# =====================================================
class TransferRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TransferRequest
        fields = [
            "product",
            "source_warehouse",
            "destination_warehouse",
            "quantity",
        ]


class TransferApprovalSerializer(serializers.Serializer):
    transfer_request_id = serializers.IntegerField()
    decision = serializers.ChoiceField(choices=["APPROVED", "REJECTED"])


class TransferRequestReadSerializer(serializers.ModelSerializer):
    product = serializers.StringRelatedField()
    source_warehouse = serializers.StringRelatedField()
    destination_warehouse = serializers.StringRelatedField()

    class Meta:
        model = TransferRequest
        fields = "__all__"


# =====================================================
# STAFF APPROVAL
# =====================================================
class StaffApprovalSerializer(serializers.Serializer):
    staff_id = serializers.IntegerField(required=False)
    user_id = serializers.IntegerField(required=False)
    warehouse_id = serializers.IntegerField()

    def validate(self, data):
        if not data.get("staff_id") and not data.get("user_id"):
            raise serializers.ValidationError(
                "Either staff_id or user_id is required"
            )
        return data


# =====================================================
# MANAGER PROMOTION
# =====================================================
class ManagerPromotionDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=["APPROVED", "REJECTED"])
    promotion_request_id = serializers.IntegerField(required=False)
    staff_id = serializers.IntegerField(required=False)
    warehouse_id = serializers.IntegerField(required=False)


class ManagerPromotionRequestReadSerializer(serializers.ModelSerializer):
    staff_id = serializers.IntegerField(source="staff.id", read_only=True)
    staff_username = serializers.CharField(
        source="staff.user.username", read_only=True
    )
    requested_by_id = serializers.IntegerField(
        source="requested_by.id", read_only=True
    )
    requested_by_username = serializers.CharField(
        source="requested_by.username", read_only=True
    )

    class Meta:
        model = ManagerPromotionRequest
        fields = [
            "id",
            "staff_id",
            "staff_username",
            "requested_by_id",
            "requested_by_username",
            "status",
            "approved_by",
            "approved_at",
        ]


# =====================================================
# USERS
# =====================================================
class UserListSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField()
    role = serializers.CharField()
    is_active = serializers.BooleanField()
    status = serializers.CharField()
    viewer_id = serializers.IntegerField(allow_null=True)
    staff_id = serializers.IntegerField(allow_null=True)
    manager_id = serializers.IntegerField(allow_null=True)



class UserProfileSerializer(serializers.ModelSerializer):
    profile_id = serializers.IntegerField(source="id", read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            "profile_id",
            "full_name",
            "phone_number",
            "gender",
            "profile_image",
        ]
        extra_kwargs = {
            "full_name": {"required": False, "allow_blank": True},
            "phone_number": {"required": False, "allow_blank": True},
            "gender": {"required": False, "allow_blank": True},
        }

    def validate_profile_image(self, image):
        if image.size > 15 * 1024 * 1024:
            raise serializers.ValidationError("Image size must be <= 15MB")

        if not image.content_type.startswith("image/"):
            raise serializers.ValidationError("Only image files are allowed")

        return image

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance



class MovementEventSerializer(serializers.Serializer):
    event_id = serializers.IntegerField()
    event_type = serializers.CharField()
    timestamp = serializers.DateTimeField()
    product = serializers.CharField(allow_null=True, required=False)
    quantity = serializers.IntegerField(allow_null=True, required=False)
    quantity_change = serializers.IntegerField(allow_null=True, required=False)
    source_warehouse = serializers.CharField(allow_null=True, required=False)
    destination_warehouse = serializers.CharField(allow_null=True, required=False)
    performed_by = serializers.CharField(allow_null=True, required=False)
    status = serializers.CharField(allow_null=True, required=False)
    raw = serializers.DictField(required=False)





class LowStockThresholdSerializer(serializers.ModelSerializer):
    warehouse_name = serializers.CharField(
        source="warehouse.name", read_only=True
    )
    product_name = serializers.CharField(
        source="product.name", read_only=True
    )

    class Meta:
        model = LowStockThreshold
        fields = [
            "id",
            "warehouse",
            "warehouse_name",
            "product",
            "product_name",
            "threshold_quantity",
        ]




class WarehouseDeleteValidateSerializer(serializers.Serializer):
    warehouse_id = serializers.IntegerField()

class WarehouseDeleteConfirmSerializer(serializers.Serializer):
    warehouse_id = serializers.IntegerField()
    stock_map = serializers.DictField(
        child=serializers.IntegerField(),
        required=False
    )
    staff_reassign_warehouse_id = serializers.IntegerField(required=False, allow_null=True)
    manager_reassign_warehouse_id = serializers.IntegerField(required=False, allow_null=True)
    confirm = serializers.BooleanField()

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


# =====================================================
# DETAIL SERIALIZERS FOR DRAWER VIEWS
# =====================================================

class ProductDetailSerializer(serializers.ModelSerializer):
    """
    Comprehensive Product detail for drawer view.
    Includes total stock across all warehouses and recent activity summary.
    """
    total_stock = serializers.SerializerMethodField()
    stock_by_warehouse = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "sku",
            "description",
            "price",
            "is_active",
            "created_at",
            "total_stock",
            "stock_by_warehouse",
        ]
    
    def get_total_stock(self, obj):
        """Calculate total stock across all warehouses"""
        return Stock.objects.filter(product=obj).aggregate(
            total=serializers.models.Sum('quantity')
        )['total'] or 0
    
    def get_stock_by_warehouse(self, obj):
        """Get stock breakdown by warehouse"""
        stocks = Stock.objects.filter(product=obj).select_related('warehouse')
        return [
            {
                "warehouse_id": s.warehouse.id,
                "warehouse_name": s.warehouse.name,
                "quantity": s.quantity,
                "updated_at": s.updated_at
            }
            for s in stocks
        ]


class StockDetailSerializer(serializers.ModelSerializer):
    """
    Comprehensive Stock detail for drawer view.
    Includes product info, warehouse info, and threshold status.
    """
    product = ProductReadSerializer(read_only=True)
    warehouse = WarehouseListSerializer(read_only=True)
    threshold_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Stock
        fields = [
            "id",
            "product",
            "warehouse",
            "quantity",
            "created_at",
            "updated_at",
            "threshold_status",
        ]
    
    def get_threshold_status(self, obj):
        """Check if stock is below threshold"""
        try:
            threshold = LowStockThreshold.objects.get(
                warehouse=obj.warehouse,
                product=obj.product
            )
            return {
                "threshold": threshold.threshold_quantity,
                "is_low": obj.quantity < threshold.threshold_quantity,
                "difference": obj.quantity - threshold.threshold_quantity
            }
        except LowStockThreshold.DoesNotExist:
            return None


class PurchaseRequestDetailSerializer(serializers.ModelSerializer):
    """
    Comprehensive PurchaseRequest detail for drawer view.
    Includes approval history and requester info.
    """
    product = ProductReadSerializer(read_only=True)
    warehouse = WarehouseListSerializer(read_only=True)
    viewer_username = serializers.CharField(source="viewer.username", read_only=True)
    viewer_email = serializers.CharField(source="viewer.email", read_only=True)
    processed_by_username = serializers.CharField(source="processed_by.username", read_only=True)
    approval_history = serializers.SerializerMethodField()
    
    class Meta:
        model = PurchaseRequest
        fields = [
            "id",
            "product",
            "warehouse",
            "quantity",
            "status",
            "viewer_username",
            "viewer_email",
            "created_at",
            "processed_by_username",
            "processed_at",
            "approval_history",
        ]
    
    def get_approval_history(self, obj):
        """Get all approval/rejection records for this request"""
        approvals = PurchaseApproval.objects.filter(
            purchase_request=obj
        ).select_related('approver').order_by('-created_at')
        
        return [
            {
                "id": a.id,
                "decision": a.decision,
                "approver": a.approver.username if a.approver else "System",
                "timestamp": a.created_at
            }
            for a in approvals
        ]


class TransferRequestDetailSerializer(serializers.ModelSerializer):
    """
    Comprehensive TransferRequest detail for drawer view.
    Includes approval history and warehouse info.
    """
    product = ProductReadSerializer(read_only=True)
    source_warehouse = WarehouseListSerializer(read_only=True)
    destination_warehouse = WarehouseListSerializer(read_only=True)
    requested_by_username = serializers.CharField(source="requested_by.username", read_only=True)
    approved_by_username = serializers.CharField(source="approved_by.username", read_only=True, allow_null=True)
    approval_history = serializers.SerializerMethodField()
    
    class Meta:
        model = TransferRequest
        fields = [
            "id",
            "product",
            "source_warehouse",
            "destination_warehouse",
            "quantity",
            "status",
            "requested_by_username",
            "created_at",
            "approved_by_username",
            "approved_at",
            "approval_history",
        ]
    
    def get_approval_history(self, obj):
        """Get all approval/rejection records for this request"""
        approvals = TransferApproval.objects.filter(
            transfer_request=obj
        ).select_related('approver').order_by('-created_at')
        
        return [
            {
                "id": a.id,
                "decision": a.decision,
                "approver": a.approver.username if a.approver else "System",
                "timestamp": a.created_at
            }
            for a in approvals
        ]


class UserDetailSerializer(serializers.Serializer):
    """
    Comprehensive User detail for drawer view.
    Includes profile, role, and warehouse assignments.
    """
    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField()
    role = serializers.CharField()
    is_active = serializers.BooleanField()
    last_login = serializers.DateTimeField()
    date_joined = serializers.DateTimeField()
    profile = UserProfileSerializer()
    assigned_warehouses = serializers.ListField()
    role_specific_info = serializers.DictField()
