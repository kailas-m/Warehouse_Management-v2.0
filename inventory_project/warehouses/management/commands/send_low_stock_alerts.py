from django.core.management.base import BaseCommand
from warehouses.services.low_stock import get_low_stock_items
from warehouses.services.email_alerts import send_low_stock_email
from warehouses.models import Warehouse

class Command(BaseCommand):
    help = "Send daily low stock email alerts"

    def handle(self, *args, **kwargs):
        alerts = get_low_stock_items()

        for warehouse in Warehouse.objects.select_related("manager__user"):
            warehouse_alerts = [
                a for a in alerts if a["warehouse"] == warehouse
            ]

            if not warehouse_alerts:
                continue

            recipients = []

            if warehouse.manager:
                recipients.append(warehouse.manager.user.email)

            # Admin emails
            recipients += list(
                warehouse.created_by.__class__.objects
                .filter(role__name="ADMIN")
                .values_list("email", flat=True)
            )

            recipients = list(set(recipients))

            send_low_stock_email(recipients, warehouse_alerts)

        self.stdout.write(self.style.SUCCESS("Low stock alerts sent"))
