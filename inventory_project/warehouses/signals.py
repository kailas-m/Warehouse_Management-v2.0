from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

from accounts.models import UserProfile

User = get_user_model()


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if not hasattr(instance, "profile"):
        UserProfile.objects.create(user=instance)


from django.db.models.signals import pre_save


from inventory.models import Stock, LowStockThreshold
from warehouses.services.low_stock import get_low_stock_items
from warehouses.services.email_alerts import send_low_stock_email


@receiver(pre_save, sender=Stock)
def stock_decrease_low_stock_alert(sender, instance: Stock, **kwargs):
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
        low_stock_items = [{
            "warehouse": instance.warehouse.name,
            "product": instance.product.name,
            "current_qty": instance.quantity,
            "threshold": threshold.threshold_quantity,
        }]

        from django.contrib.auth import get_user_model
        User = get_user_model()

        recipients = (
            User.objects
            .filter(role__name__in=["ADMIN", "MANAGER"])
            .values_list("email", flat=True)
        )

        send_low_stock_email(list(recipients), low_stock_items)
