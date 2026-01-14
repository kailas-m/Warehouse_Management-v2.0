from django.conf import settings
from django.core.mail import EmailMultiAlternatives


def send_low_stock_email(recipients, alert_items):
    if not alert_items or not recipients:
        return

    subject = "⚠️ Low Stock Alert – Immediate Attention Required"

    # -------------------------------------------------
    # Plain text fallback (important for mail clients)
    # -------------------------------------------------
    text_lines = [
        "Low Stock Alert\n",
        "The following products are below threshold:\n"
    ]

    for item in alert_items:
        text_lines.append(
            f"- Warehouse: {item['warehouse']}, "
            f"Product: {item['product']}, "
            f"Stock: {item['current_qty']} "
            f"(Threshold: {item['threshold']})"
        )

    text_message = "\n".join(text_lines)

    # -------------------------------------------------
    # HTML body (professional)
    # -------------------------------------------------
    table_rows = ""
    for item in alert_items:
        table_rows += f"""
        <tr>
            <td>{item['warehouse']}</td>
            <td>{item['product']}</td>
            <td style="color:red;"><b>{item['current_qty']}</b></td>
            <td>{item['threshold']}</td>
        </tr>
        """

    html_message = f"""
    <html>
      <body style="font-family: Arial, sans-serif;">
        <p>Dear Admin / Manager,</p>

        <p>
          The following products have fallen below their configured
          stock threshold and require immediate attention.
        </p>

        <h3>Low Stock Summary</h3>

        <table border="1" cellpadding="8" cellspacing="0"
               style="border-collapse: collapse;">
          <thead>
            <tr style="background-color:#f2f2f2;">
              <th>Warehouse</th>
              <th>Product</th>
              <th>Current Stock</th>
              <th>Threshold</th>
            </tr>
          </thead>
          <tbody>
            {table_rows}
          </tbody>
        </table>

        <p>
          Please take appropriate action such as restocking
          or redistributing inventory.
        </p>

        <p>
          Regards,<br>
          <strong>Inventory Management System</strong>
        </p>
      </body>
    </html>
    """

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=recipients,
    )

    email.attach_alternative(html_message, "text/html")
    email.send(fail_silently=False)
