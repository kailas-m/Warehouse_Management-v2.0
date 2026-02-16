from datetime import datetime

def log_error(msg):
    try:
        with open("server_debug.log", "a") as f:
            f.write(str(datetime.now()) + " " + str(msg) + "\n")
    except Exception:
        pass


def get_client_ip(request):
    """Extract client IP address from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def log_auth_attempt(username, status, request, user=None, failure_reason=''):
    """
    Log authentication attempt to audit log.
    
    Args:
        username: Username attempted
        status: AuthAuditLog status (SUCCESS/FAILURE/LOCKED)
        request: Django request object
        user: User object if authentication succeeded
        failure_reason: Reason for failure if applicable
    """
    from audit.models import AuthAuditLog
    
    AuthAuditLog.objects.create(
        user=user,
        username_attempted=username,
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],  # Limit length
        status=status,
        failure_reason=failure_reason
    )
