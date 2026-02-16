from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

from inventory.models import Stock, LowStockThreshold

User = get_user_model()


@receiver(pre_save, sender=Stock)
def stock_decrease_low_stock_alert(sender, instance: Stock, **kwargs):
    """
    Check for low stock when stock quantity decreases.
    Emits a signal that the notifications app can listen to.
    """
    if not instance.pk:
        return

    old_stock = Stock.objects.get(pk=instance.pk)

    if instance.quantity >= old_stock.quantity:
        return

    try:
        threshold = LowStockThreshold.objects.get(
            warehouse=instance.warehouse,
            product=instance.product
        )
    except LowStockThreshold.DoesNotExist:
        return

    if instance.quantity <= threshold.threshold_quantity:
        # Import here to avoid circular dependency
        from notifications.signals import send_low_stock_notification
        
        low_stock_items = [{
            "warehouse": instance.warehouse.name,
            "product": instance.product.name,
            "current_qty": instance.quantity,
            "threshold": threshold.threshold_quantity,
        }]

        recipients = (
            User.objects
            .filter(role__name__in=["ADMIN", "MANAGER"])
            .values_list("email", flat=True)
        )

        send_low_stock_notification(list(recipients), low_stock_items)
