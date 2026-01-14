from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from django.conf import settings
from django.db import models
# -----------------------
# Role / User
# -----------------------
class Role(models.Model):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    STAFF = "STAFF"
    VIEWER = "VIEWER"

    NAME_CHOICES = [
        (ADMIN, "Admin"),
        (MANAGER, "Manager"),
        (STAFF, "Staff"),
        (VIEWER, "Viewer"),
    ]

    name = models.CharField(max_length=50, choices=NAME_CHOICES, unique=True)

    def __str__(self):
        return self.name


class User(AbstractUser):
    # keep standard AbstractUser fields (username, email, password, is_active, etc.)
    role = models.ForeignKey(Role, on_delete=models.PROTECT, related_name="users")
    # you can add other fields if you used earlier; keep as minimal to avoid breaking things

    def __str__(self):
        return self.username


# -----------------------
# Viewer / Staff / Manager mappings
# -----------------------
class Viewer(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="viewer")

    def __str__(self):
        return f"Viewer({self.user.username})"


class Staff(models.Model):
    """
    Staff mapping: one DB row per staff user. Staff may be assigned to a warehouse.
    The `warehouse` field is a ForeignKey so staff may be unassigned (null) or assigned.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="staff")
    # warehouse may be assigned later during approval
    warehouse = models.ForeignKey(
        "Warehouse",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="staffs",
    )

    def __str__(self):
        return f"Staff({self.user.username})"


class Manager(models.Model):
    """
    Manager mapping: one DB row per manager user.
    A Manager can now be associated with *many* warehouses (via Warehouse.manager FK).
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="manager")

    def __str__(self):
        return f"Manager({self.user.username})"


# -----------------------
# Warehouse / Product / Stock
# -----------------------
class Warehouse(models.Model):
    name = models.CharField(max_length=255)
    location = models.CharField(max_length=512, blank=True, null=True)
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    # IMPORTANT CHANGE: allow the same Manager to be assigned to multiple warehouses
    # previously this was likely OneToOne - we change it to ForeignKey to allow reuse
    manager = models.ForeignKey(
        Manager,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="warehouses",
    )

    def __str__(self):
        return f"{self.name} ({self.location})"


class Product(models.Model):
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=128, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.name}"


class Stock(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="stocks")
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name="stocks")
    quantity = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.product.name} @ {self.warehouse.name}: {self.quantity}"


# -----------------------
# Purchase workflow
# -----------------------
class PurchaseRequest(models.Model):
    STATUS_PENDING = "PENDING"
    STATUS_APPROVED = "APPROVED"
    STATUS_REJECTED = "REJECTED"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_REJECTED, "Rejected"),
    ]

    viewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="purchase_requests")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(default=timezone.now)

    # optional: processed_by/processed_at fields
    processed_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="processed_purchase_requests")
    processed_at = models.DateTimeField(null=True, blank=True)

    # optionally a staff assigned field (if you use it)
    staff_assigned = models.ForeignKey(Staff, null=True, blank=True, on_delete=models.SET_NULL, related_name="assigned_purchases")

    def __str__(self):
        return f"PR#{self.id} {self.product.name} x{self.quantity} ({self.status})"


class PurchaseApproval(models.Model):
    purchase_request = models.ForeignKey(PurchaseRequest, on_delete=models.CASCADE, related_name="approvals")
    approver = models.ForeignKey(User, on_delete=models.CASCADE)
    decision = models.CharField(max_length=20)
    created_at = models.DateTimeField(default=timezone.now)


# -----------------------
# Transfer workflow
# -----------------------
class TransferRequest(models.Model):
    STATUS_PENDING = "PENDING"
    STATUS_APPROVED = "APPROVED"
    STATUS_REJECTED = "REJECTED"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_REJECTED, "Rejected"),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    source_warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name="transfer_sources")
    destination_warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name="transfer_destinations")
    quantity = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(default=timezone.now)
    requested_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="transfer_requests")

    def __str__(self):
        return f"TR#{self.id} {self.product.name} {self.source_warehouse} → {self.destination_warehouse} ({self.status})"


class TransferApproval(models.Model):
    transfer_request = models.ForeignKey(TransferRequest, on_delete=models.CASCADE, related_name="approvals")
    approver = models.ForeignKey(User, on_delete=models.CASCADE)
    decision = models.CharField(max_length=20)
    created_at = models.DateTimeField(default=timezone.now)


# -----------------------
# Staff approval & promotion requests
# -----------------------
class StaffApproval(models.Model):
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name="approvals")
    approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    approved_at = models.DateTimeField(default=timezone.now)


class ManagerPromotionRequest(models.Model):
    STATUS_PENDING = "PENDING"
    STATUS_APPROVED = "APPROVED"
    STATUS_REJECTED = "REJECTED"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_REJECTED, "Rejected"),
    ]

    staff = models.ForeignKey(Staff, on_delete=models.CASCADE)
    requested_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="promotion_requests")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    requested_at = models.DateTimeField(default=timezone.now)
    approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="approved_promotions")
    approved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"PromReq#{self.id} for {self.staff}"


# -----------------------
# Optional admin/other audit models (left minimal)
# -----------------------
# add any other small models you had in original file here (e.g. Admin if you used it before)
def profile_image_upload_path(instance, filename):
    return f"profile_images/user_{instance.user.id}/{filename}"


class UserProfile(models.Model):
    GENDER_CHOICES = (
        ("MALE", "Male"),
        ("FEMALE", "Female"),
        ("OTHER", "Other"),
    )

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )

    full_name = models.CharField(max_length=255, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    gender = models.CharField(
        max_length=10,
        choices=GENDER_CHOICES,
        blank=True,
    )

    profile_image = models.ImageField(
        upload_to=profile_image_upload_path,
        blank=True,
        null=True,
        default="defaults/avatar.png",  # you must add this file
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile of {self.user.username}"


class LowStockThreshold(models.Model):
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.CASCADE,
        related_name="low_stock_thresholds"
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="low_stock_thresholds"
    )
    threshold_quantity = models.PositiveIntegerField()

    class Meta:
        unique_together = ("warehouse", "product")

    def __str__(self):
        return f"{self.warehouse} - {self.product} ({self.threshold_quantity})"
