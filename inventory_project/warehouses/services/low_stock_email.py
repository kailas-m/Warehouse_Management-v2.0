from django.conf import settings
from django.core.mail import send_mail
from django.contrib.auth import get_user_model

User = get_user_model()


def send_low_stock_email(low_stock_items):
    if not low_stock_items:
        return

    subject = "Daily Low Stock Alert"
    body_lines = []

    for item in low_stock_items:
        body_lines.append(
            f"Product: {item['product']} | "
            f"Warehouse: {item['warehouse']} | "
            f"Stock: {item['current_qty']} "
            f"(Threshold: {item['threshold']})"
        )

    message = "\n".join(body_lines)

    recipients = (
        User.objects
        .filter(role__name__in=["ADMIN", "MANAGER"])
        .values_list("email", flat=True)
    )

    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        list(recipients),
        fail_silently=False,
    )
