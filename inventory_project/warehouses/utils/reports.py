from collections import defaultdict
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from django.http import HttpResponse


def generate_stock_movement_pdf(warehouse, movements, start_date, end_date):
    """
    warehouse:
        - Warehouse instance (manager report)
        - None (admin combined report)

    movements keys:
        date, product, quantity, source, destination, performed_by
    """

    # ----------------------------------
    # Prepare grouping & summaries
    # ----------------------------------
    grouped = defaultdict(list)
    summary = defaultdict(lambda: {"in": 0, "out": 0})

    for m in movements:
        wh = m["source"] if m["quantity"] < 0 else m["destination"]
        grouped[wh].append(m)

        if m["quantity"] > 0:
            summary[wh]["in"] += m["quantity"]
        else:
            summary[wh]["out"] += abs(m["quantity"])

    # ----------------------------------
    # File setup
    # ----------------------------------
    filename = (
        "stock_report_all_warehouses.pdf"
        if warehouse is None
        else f"stock_report_{warehouse.id}.pdf"
    )

    response = HttpResponse(content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'

    c = canvas.Canvas(response, pagesize=A4)
    width, height = A4
    y = height - 40

    # ----------------------------------
    # Title
    # ----------------------------------
    c.setFont("Helvetica-Bold", 14)
    c.drawString(40, y, "Stock Movement Report")
    y -= 20

    c.setFont("Helvetica", 10)
    c.drawString(40, y, f"Period: {start_date} → {end_date}")
    y -= 30

    # ----------------------------------
    # Per-warehouse sections
    # ----------------------------------
    for wh_name, rows in grouped.items():
        if y < 200:
            c.showPage()
            y = height - 40

        # Warehouse header
        c.setFont("Helvetica-Bold", 12)
        c.drawString(40, y, f"Warehouse: {wh_name}")
        y -= 20

        # Table header
        c.setFont("Helvetica-Bold", 9)
        headers = ["Date", "Product", "Qty", "Source", "Destination", "By"]
        xs = [40, 110, 230, 280, 360, 450]

        for i, h in enumerate(headers):
            c.drawString(xs[i], y, h)

        y -= 12
        c.line(40, y, width - 40, y)
        y -= 10
        c.setFont("Helvetica", 9)

        # Rows
        for r in rows:
            if y < 80:
                c.showPage()
                y = height - 50

            c.drawString(xs[0], y, r["date"])
            c.drawString(xs[1], y, r["product"])
            c.drawString(xs[2], y, str(r["quantity"]))
            c.drawString(xs[3], y, r["source"])
            c.drawString(xs[4], y, r["destination"])
            c.drawString(xs[5], y, r["performed_by"])
            y -= 14

        # Warehouse summary
        y -= 10
        c.setFont("Helvetica-Bold", 9)
        c.drawString(
            40,
            y,
            f"Summary — Incoming: +{summary[wh_name]['in']} | "
            f"Outgoing: -{summary[wh_name]['out']} | "
            f"Net: {summary[wh_name]['in'] - summary[wh_name]['out']}",
        )
        y -= 30

    # ----------------------------------
    # Overall summary (admin only)
    # ----------------------------------
    if warehouse is None:
        c.showPage()
        y = height - 40

        c.setFont("Helvetica-Bold", 12)
        c.drawString(40, y, "Overall Summary")
        y -= 25

        c.setFont("Helvetica-Bold", 9)
        c.drawString(40, y, "Warehouse")
        c.drawString(250, y, "Incoming")
        c.drawString(330, y, "Outgoing")
        c.drawString(410, y, "Net")
        y -= 10
        c.line(40, y, width - 40, y)
        y -= 10

        c.setFont("Helvetica", 9)
        for wh, s in summary.items():
            net = s["in"] - s["out"]
            c.drawString(40, y, wh)
            c.drawString(250, y, f"+{s['in']}")
            c.drawString(330, y, f"-{s['out']}")
            c.drawString(410, y, str(net))
            y -= 14

    c.showPage()
    c.save()
    return response
