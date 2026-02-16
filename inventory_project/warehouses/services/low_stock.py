from inventory.models import Stock, LowStockThreshold


def get_low_stock_items():
    """
    Returns list of low-stock items (live calculated)
    """
    results = []

    thresholds = (
        LowStockThreshold.objects
        .select_related("warehouse", "product")
    )

    for threshold in thresholds:
        try:
            stock = Stock.objects.get(
                warehouse=threshold.warehouse,
                product=threshold.product,
            )
        except Stock.DoesNotExist:
            continue

        if stock.quantity <= threshold.threshold_quantity:
            results.append({
                "warehouse": threshold.warehouse,
                "product": threshold.product,
                "current_qty": stock.quantity,
                "threshold": threshold.threshold_quantity,
            })

    return results
