from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from core.constants import Gender


def profile_image_upload_path(instance, filename):
    return f"profile_images/user_{instance.user.id}/{filename}"


class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.
    The role field links to the Role model in the roles app.
    """
    role = models.ForeignKey(
        "roles.Role",  # String reference to avoid circular import
        on_delete=models.PROTECT,
        related_name="users"
    )

    class Meta:
        db_table = 'warehouses_user'  # Preserve existing table name

    def __str__(self):
        return self.username


class UserProfile(models.Model):
    """
    Extended user profile information.
    """
    # Use centralized constants
    GENDER_CHOICES = Gender.CHOICES

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
        default="defaults/avatar.png",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'warehouses_userprofile'  # Preserve existing table name

    def __str__(self):
        return f"Profile of {self.user.username}"
