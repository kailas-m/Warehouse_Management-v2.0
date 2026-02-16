from django.urls import path

from warehouses.views import (
    # Warehouses
    WarehouseCreateAPIView,
    WarehouseListAPIView,
    WarehouseDetailAPIView,

    # Products / Stock
    ProductCreateAPIView,
    ProductListAPIView,
    ProductUpdateAPIView,
    ProductDeleteAPIView,
    StockListAPIView,
    StockAssignAPIView,

    # Purchase workflow
    PurchaseRequestCreateAPIView,
    PurchaseApproveAPIView,
    PurchaseRequestListAPIView,

    # Transfer workflow
    TransferRequestCreateAPIView,
    TransferApproveAPIView,
    TransferRequestListAPIView,

    # Dashboards & Reports
    AdminDashboardAPIView,
    WarehouseDashboardAPIView,
    StockMovementReportAPIView,
    LowStockThresholdAPIView,
    WarehouseDeleteValidateAPIView,
    WarehouseDeleteConfirmAPIView,

    # Staff Transfer
    StaffTransferRequestListCreateAPIView,
    StaffTransferApprovalAPIView,
    StaffTransferRejectAPIView,
    
    # Detail Views for Drawer System
    ProductDetailAPIView,
    StockDetailAPIView,
    PurchaseRequestDetailAPIView,
    TransferRequestDetailAPIView,
    UserDetailAPIView,
)

urlpatterns = [
    # Warehouses
    path("warehouses/", WarehouseCreateAPIView.as_view(), name="warehouse-create"),
    path("warehouses/list/", WarehouseListAPIView.as_view(), name="warehouse-list"),
    path("warehouses/<int:pk>/", WarehouseDetailAPIView.as_view(), name="warehouse-detail"),

    # Products & Stock
    path("products/", ProductCreateAPIView.as_view(), name="product-create"),
    path("products/<int:pk>/", ProductUpdateAPIView.as_view(), name="product-update"),
    path("products/<int:pk>/delete/", ProductDeleteAPIView.as_view(), name="product-start-delete"),
    path("products/list/", ProductListAPIView.as_view(), name="product-list"),
    path("stocks/", StockListAPIView.as_view(), name="stock-list"),
    path("stocks/assign/", StockAssignAPIView.as_view(), name="stock-assign"),

    # Purchase workflow
    path("purchase-requests/", PurchaseRequestCreateAPIView.as_view(), name="purchase-request-create"),
    path("purchase-requests/approve/", PurchaseApproveAPIView.as_view(), name="purchase-request-approve"),
    path("purchase-requests/list/", PurchaseRequestListAPIView.as_view(), name="purchase-request-list"),

    # Transfer workflow
    path("transfer-requests/", TransferRequestCreateAPIView.as_view(), name="transfer-request-create"),
    path("transfer-requests/approve/", TransferApproveAPIView.as_view(), name="transfer-request-approve"),
    path("transfer-requests/list/", TransferRequestListAPIView.as_view(), name="transfer-request-list"),

    # Dashboards
    path("dashboard/admin/", AdminDashboardAPIView.as_view(), name="dashboard-admin"),
    path("dashboard/warehouse/", WarehouseDashboardAPIView.as_view(), name="dashboard-warehouse"),

    path("reports/stock-movements/",StockMovementReportAPIView.as_view(),name="stock-movement-report"),

    path("low-stock-thresholds/",LowStockThresholdAPIView.as_view(),name="low-stock-thresholds"),
    path("warehouses/delete/validate/",WarehouseDeleteValidateAPIView.as_view(),name="warehouse-delete-validate"),
    path("warehouses/delete/confirm/",WarehouseDeleteConfirmAPIView.as_view(),name="warehouse-delete-confirm"),

    # Staff Transfers
    path("staff-transfers/", StaffTransferRequestListCreateAPIView.as_view(), name="staff-transfer-list-create"),
    path("staff-transfers/<int:pk>/approve/", StaffTransferApprovalAPIView.as_view(), name="staff-transfer-approve"),
    path("staff-transfers/<int:pk>/reject/", StaffTransferRejectAPIView.as_view(), name="staff-transfer-reject"),
    
    # Detail Endpoints for Drawer System
    path("products/<int:pk>/detail/", ProductDetailAPIView.as_view(), name="product-detail"),
    path("stocks/<int:pk>/detail/", StockDetailAPIView.as_view(), name="stock-detail"),
    path("purchase-requests/<int:pk>/detail/", PurchaseRequestDetailAPIView.as_view(), name="purchase-request-detail"),
    path("transfer-requests/<int:pk>/detail/", TransferRequestDetailAPIView.as_view(), name="transfer-request-detail"),
    path("users/<int:pk>/detail/", UserDetailAPIView.as_view(), name="user-detail"),
]
