from django.urls import path

from warehouses.views import (
    # Auth
    RegisterAPIView,

    # Users
    UserListAPIView,

    # Warehouses
    WarehouseCreateAPIView,

    # Products / Stock
    ProductCreateAPIView,
    ProductListAPIView,
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

    # Staff / Manager flows
    StaffApproveAPIView,
    ManagerPromotionRequestAPIView,
    ManagerPromotionApproveAPIView,
    ManagerPromotionRequestListAPIView,
    AdminDemoteManagerAPIView,
    StaffDismissAPIView,

    # Profile
    UserProfileAPIView,
    RegisterAPIView,
    UserListAPIView,
    AdminDashboardAPIView,
    WarehouseDashboardAPIView,
    StockMovementReportAPIView,
    LowStockThresholdAPIView,
)

urlpatterns = [
    # Auth
    path("auth/register/", RegisterAPIView.as_view(), name="register"),

    # Users
    path("users/", UserListAPIView.as_view(), name="user-list"),

    # Warehouses
    path("warehouses/", WarehouseCreateAPIView.as_view(), name="warehouse-create"),

    # Products & Stock
    path("products/", ProductCreateAPIView.as_view(), name="product-create"),
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

    # Staff / Manager / Admin flows
    path("staffs/approve/", StaffApproveAPIView.as_view(), name="staff-approve"),
    path("managers/request-staff-promotion/", ManagerPromotionRequestAPIView.as_view(), name="manager-promotion-request"),
    path("manager-promotions/approve/", ManagerPromotionApproveAPIView.as_view(), name="manager-promotion-approve"),
    path("manager-promotions/list/", ManagerPromotionRequestListAPIView.as_view(), name="manager-promotion-list"),
    path("admin/demote-manager/", AdminDemoteManagerAPIView.as_view()),
    path("staffs/dismiss/", StaffDismissAPIView.as_view()),

    # User profile
    path("profile/", UserProfileAPIView.as_view(), name="user-profile"),

    # Dashboards
    path("dashboard/admin/", AdminDashboardAPIView.as_view(), name="dashboard-admin"),
    path("dashboard/warehouse/", WarehouseDashboardAPIView.as_view(), name="dashboard-warehouse"),


    path("reports/stock-movements/",StockMovementReportAPIView.as_view(),name="stock-movement-report"),

    path("low-stock-thresholds/",LowStockThresholdAPIView.as_view(),name="low-stock-thresholds"),

]
