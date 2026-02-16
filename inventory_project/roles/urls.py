from django.urls import path

from roles.views import (
    StaffApproveAPIView,
    ManagerPromotionRequestAPIView,
    ManagerPromotionApproveAPIView,
    ManagerPromotionRequestListAPIView,
    AdminDemoteManagerAPIView,
    StaffDismissAPIView,
)

urlpatterns = [
    # Staff Management
    path("staffs/approve/", StaffApproveAPIView.as_view(), name="staff-approve"),
    path("staffs/dismiss/", StaffDismissAPIView.as_view(), name="staff-dismiss"),
    
    # Manager Promotion
    path("managers/request-staff-promotion/", ManagerPromotionRequestAPIView.as_view(), name="manager-promotion-request"),
    path("manager-promotions/approve/", ManagerPromotionApproveAPIView.as_view(), name="manager-promotion-approve"),
    path("manager-promotions/list/", ManagerPromotionRequestListAPIView.as_view(), name="manager-promotion-list"),
    
    # Admin Actions
    path("admin/demote-manager/", AdminDemoteManagerAPIView.as_view(), name="admin-demote-manager"),
]
