from django.contrib import admin
from audit.models import AuthAuditLog


@admin.register(AuthAuditLog)
class AuthAuditLogAdmin(admin.ModelAdmin):
    list_display = ['username_attempted', 'status', 'ip_address', 'timestamp', 'user']
    list_filter = ['status', 'timestamp']
    search_fields = ['username_attempted', 'ip_address']
    readonly_fields = ['user', 'username_attempted', 'ip_address', 'user_agent', 'status', 'failure_reason', 'timestamp']
    date_hierarchy = 'timestamp'
    
    def has_add_permission(self, request):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
