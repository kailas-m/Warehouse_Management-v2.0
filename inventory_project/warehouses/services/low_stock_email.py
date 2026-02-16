from django.conf import settings
from django.core.mail import send_mail, EmailMultiAlternativeMessage
from django.contrib.auth import get_user_model
from datetime import datetime
from collections import defaultdict

User = get_user_model()


def generate_email_html(low_stock_items, ref_id, timestamp):
    """
    Generate enterprise-grade HTML email template for low stock alerts.
    """
    # Group by warehouse
    grouped = defaultdict(list)
    for item in low_stock_items:
        grouped[item['warehouse']].append(item)
    
    warehouse_count = len(grouped)
    total_items = len(low_stock_items)
    
    # Determine severity
    critical_count = sum(1 for item in low_stock_items if item['current_qty'] == 0)
    severity = "CRITICAL" if critical_count > 0 else "WARNING"
    severity_color = "#DC2626" if severity == "CRITICAL" else "#F59E0B"
    
    # Build warehouse sections
    warehouse_sections = ""
    for warehouse_name, items in sorted(grouped.items()):
        rows_html = ""
        for item in items:
            status_icon = "🛑" if item['current_qty'] == 0 else "⚠️"
            status_text = "Critical" if item['current_qty'] == 0 else "Low"
            stock_color = "#DC2626" if item['current_qty'] == 0 else "#374151"
            
            rows_html += f"""
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: center;">
                    <span style="font-size: 18px;">{status_icon}</span>
                    <div style="font-size: 11px; color: #6B7280; margin-top: 2px;">{status_text}</div>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">
                    <div style="font-weight: 600; color: #111827;">{item['product']}</div>
                    <div style="font-size: 12px; color: #6B7280; margin-top: 2px;">SKU: {item.get('sku', 'N/A')}</div>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: right;">
                    <span style="font-weight: 600; color: {stock_color}; font-size: 16px;">{item['current_qty']}</span>
                    <span style="color: #6B7280; font-size: 12px;"> units</span>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: right;">
                    <span style="color: #6B7280;">{item['threshold']}</span>
                    <span style="color: #9CA3AF; font-size: 12px;"> units</span>
                </td>
            </tr>
            """
        
        warehouse_sections += f"""
        <div style="margin-bottom: 32px;">
            <h2 style="font-size: 16px; font-weight: 600; color: #111827; margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #E5E7EB;">
                📦 {warehouse_name}
            </h2>
            <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 4px; overflow: hidden;">
                <thead>
                    <tr style="background: #F3F4F6;">
                        <th style="padding: 10px; text-align: center; font-size: 11px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">Status</th>
                        <th style="padding: 10px; text-align: left; font-size: 11px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">Product</th>
                        <th style="padding: 10px; text-align: right; font-size: 11px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">Current Stock</th>
                        <th style="padding: 10px; text-align: right; font-size: 11px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">Threshold</th>
                    </tr>
                </thead>
                <tbody>
                    {rows_html}
                </tbody>
            </table>
        </div>
        """
    
    # Dashboard URL (adjust based on your deployment)
    dashboard_url = f"{settings.FRONTEND_URL}/thresholds" if hasattr(settings, 'FRONTEND_URL') else "#"
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Low Stock Alert</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F3F4F6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F3F4F6; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        
                        <!-- Severity Banner -->
                        <tr>
                            <td style="background-color: {severity_color}; padding: 8px 24px; text-align: center;">
                                <span style="color: white; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">[{severity}] Low Stock Alert</span>
                            </td>
                        </tr>
                        
                        <!-- Header -->
                        <tr>
                            <td style="padding: 24px 24px 16px 24px;">
                                <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827;">Nexus Inventory System</h1>
                                <p style="margin: 8px 0 0 0; font-size: 14px; color: #6B7280;">Low Stock Detected</p>
                            </td>
                        </tr>
                        
                        <!-- Context -->
                        <tr>
                            <td style="padding: 0 24px 24px 24px;">
                                <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 4px;">
                                    <p style="margin: 0; font-size: 14px; color: #92400E; line-height: 1.5;">
                                        <strong>Alert Triggered:</strong> {timestamp}<br>
                                        <strong>Affected Locations:</strong> {warehouse_count} warehouse(s)<br>
                                        <strong>Total Items:</strong> {total_items} product(s) below threshold
                                    </p>
                                </div>
                            </td>
                        </tr>
                        
                        <!-- Greeting -->
                        <tr>
                            <td style="padding: 0 24px 16px 24px;">
                                <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6;">
                                    Hello,
                                </p>
                                <p style="margin: 12px 0 0 0; font-size: 14px; color: #374151; line-height: 1.6;">
                                    The following inventory levels have dropped below your defined threshold rules and require immediate attention:
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Data Tables -->
                        <tr>
                            <td style="padding: 0 24px 24px 24px;">
                                {warehouse_sections}
                            </td>
                        </tr>
                        
                        <!-- Call to Action -->
                        <tr>
                            <td style="padding: 0 24px 32px 24px;">
                                <div style="background: #EFF6FF; border: 1px solid #DBEAFE; border-radius: 6px; padding: 20px;">
                                    <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #1E40AF;">Recommended Actions</h3>
                                    <a href="{dashboard_url}" style="display: inline-block; background: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; margin-bottom: 12px;">
                                        View Inventory Dashboard
                                    </a>
                                    <div style="margin-top: 12px;">
                                        <a href="{dashboard_url}" style="color: #2563EB; text-decoration: none; font-size: 13px; margin-right: 16px;">• Create Purchase Request</a>
                                        <a href="{dashboard_url}" style="color: #2563EB; text-decoration: none; font-size: 13px;">• Review Threshold Settings</a>
                                    </div>
                                </div>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background: #1F2937; padding: 20px 24px; color: #9CA3AF; font-size: 12px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td>
                                            <strong style="color: #D1D5DB;">Nexus WMS</strong> | Environment: Production<br>
                                            Audit Reference: <span style="color: #D1D5DB;">{ref_id}</span><br>
                                            Generated: {timestamp}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding-top: 12px; border-top: 1px solid #374151; margin-top: 12px;">
                                            <p style="margin: 8px 0 0 0; font-size: 11px; color: #6B7280; line-height: 1.5;">
                                                This is an automated system alert. Please do not reply directly to this email.<br>
                                                For support, contact your system administrator.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    return html_content


def send_low_stock_email(low_stock_items):
    """
    Send enterprise-grade low stock alert email with HTML template.
    """
    if not low_stock_items:
        return

    # Generate reference ID
    ref_id = f"ALERT-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M UTC')
    
    # Group by warehouse for subject line
    warehouses = set(item['warehouse'] for item in low_stock_items)
    warehouse_text = list(warehouses)[0] if len(warehouses) == 1 else f"{len(warehouses)} Warehouses"
    
    # Determine severity
    critical_count = sum(1 for item in low_stock_items if item['current_qty'] == 0)
    severity = "CRITICAL" if critical_count > 0 else "WARNING"
    
    # Subject line
    subject = f"[{severity}] Low Stock Alert: {warehouse_text} ({len(low_stock_items)} Items) | Ref: {ref_id}"
    
    # Plain text fallback
    plain_text_lines = [f"Low Stock Alert - {timestamp}", ""]
    for item in low_stock_items:
        plain_text_lines.append(
            f"• {item['product']} ({item['warehouse']}): {item['current_qty']} units (Threshold: {item['threshold']})"
        )
    plain_text = "\n".join(plain_text_lines)
    
    # HTML content
    html_content = generate_email_html(low_stock_items, ref_id, timestamp)
    
    # Recipients
    recipients = (
        User.objects
        .filter(role__name__in=["ADMIN", "MANAGER"])
        .values_list("email", flat=True)
    )
    
    # Send email with both plain text and HTML
    msg = EmailMultiAlternativeMessage(
        subject=subject,
        body=plain_text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=list(recipients),
    )
    msg.attach_alternative(html_content, "text/html")
    msg.send(fail_silently=False)
