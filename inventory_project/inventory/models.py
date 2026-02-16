from django.db import models
from django.utils import timezone


class Product(models.Model):
    """
    Product definition.
    """
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=128, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'warehouses_product'  # Preserve existing table name

    def __str__(self):
        return f"{self.name}"


class Stock(models.Model):
    """
    Stock levels for products in warehouses.
    """
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="stocks"
    )
    warehouse = models.ForeignKey(
        "warehouses.Warehouse",  # String reference
        on_delete=models.CASCADE,
        related_name="stocks"
    )
    quantity = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'warehouses_stock'  # Preserve existing table name

    def __str__(self):
        return f"{self.product.name} @ {self.warehouse.name}: {self.quantity}"


class LowStockThreshold(models.Model):
    """
    Defines low stock thresholds for products in specific warehouses.
    """
    warehouse = models.ForeignKey(
        "warehouses.Warehouse",  # String reference
        on_delete=models.CASCADE,
        related_name="low_stock_thresholds"
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="low_stock_thresholds"
    )
    threshold_quantity = models.PositiveIntegerField()

    class Meta:
        db_table = 'warehouses_lowstockthreshold'  # Preserve existing table name
        unique_together = ("warehouse", "product")

    def __str__(self):
        return f"{self.warehouse} - {self.product} ({self.threshold_quantity})"
