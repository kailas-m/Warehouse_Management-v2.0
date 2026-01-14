from django.db import transaction
from rest_framework import serializers
from django.contrib.auth import get_user_model
from warehouses.models import LowStockThreshold

from warehouses.models import (
    Role,
    Viewer,
    Staff,
    Manager,
    Warehouse,
    Product,
    Stock,
    PurchaseRequest,
    PurchaseApproval,
    TransferRequest,
    TransferApproval,
    ManagerPromotionRequest,
    UserProfile,
)

User = get_user_model()


# =====================================================
# AUTH
# =====================================================
class RegisterSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=[Role.VIEWER, Role.STAFF])

    class Meta:
        model = User
        fields = ["username", "email", "password", "role"]
        extra_kwargs = {"password": {"write_only": True}}

    @transaction.atomic
    def create(self, validated_data):
        role_name = validated_data.pop("role")
        role = Role.objects.get(name=role_name)

        user = User.objects.create_user(
            role=role,
            is_active=False if role.name == Role.STAFF else True,
            **validated_data
        )

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
    product = serializers.StringRelatedField()
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
    profile_image = serializers.ImageField(required=False)

    class Meta:
        model = UserProfile
        fields = [
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
        """
        Allows partial updates:
        - update full_name / phone_number / gender independently
        - replace profile image if provided
        """

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance


class MovementEventSerializer(serializers.Serializer):
    event_id = serializers.IntegerField()
    event_type = serializers.CharField()
    timestamp = serializers.DateTimeField()
    product = serializers.CharField()
    quantity = serializers.IntegerField()
    quantity_change = serializers.IntegerField()
    source_warehouse = serializers.CharField(allow_null=True)
    destination_warehouse = serializers.CharField(allow_null=True)
    performed_by = serializers.CharField(allow_null=True)
    raw = serializers.DictField()





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
