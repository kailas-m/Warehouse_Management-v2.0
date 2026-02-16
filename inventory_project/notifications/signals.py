"""
Notification signals and email sending utilities.
"""


def send_low_stock_notification(recipients, low_stock_items):
    """
    Send low stock email notification.
    
    Args:
        recipients: List of email addresses
        low_stock_items: List of dicts with warehouse, product, current_qty, threshold
    """
    # Import email service from warehouses for now (will be moved later)
    try:
        from warehouses.services.email_alerts import send_low_stock_email
        send_low_stock_email(recipients, low_stock_items)
    except ImportError:
        # If the service doesn't exist yet, just pass
        pass
