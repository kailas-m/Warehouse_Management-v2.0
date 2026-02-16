from django.db import models
from django.conf import settings


class AuthAuditLog(models.Model):
    """
    Audit log for authentication attempts.
    Tracks both successful and failed login attempts for security monitoring.
    """
    STATUS_SUCCESS = "SUCCESS"
    STATUS_FAILURE = "FAILURE"
    STATUS_LOCKED = "LOCKED"
    
    STATUS_CHOICES = [
        (STATUS_SUCCESS, "Success"),
        (STATUS_FAILURE, "Failure"),
        (STATUS_LOCKED, "Account Locked"),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="auth_logs",
        help_text="User account (null for failed attempts on non-existent users)"
    )
    username_attempted = models.CharField(
        max_length=150,
        help_text="Username that was attempted (for tracking failed logins)"
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address of the login attempt"
    )
    user_agent = models.TextField(
        blank=True,
        help_text="Browser user agent string"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_FAILURE
    )
    failure_reason = models.CharField(
        max_length=255,
        blank=True,
        help_text="Reason for failure (e.g., 'Invalid password', 'Account inactive')"
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'audit_auth_log'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['username_attempted']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.username_attempted} - {self.status} at {self.timestamp}"
