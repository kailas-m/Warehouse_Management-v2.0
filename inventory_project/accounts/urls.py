from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import (
    RegisterAPIView,
    CustomTokenObtainPairView,
    UserListAPIView,
    UserProfileAPIView,
)

urlpatterns = [
    # Auth
    path("auth/register/", RegisterAPIView.as_view(), name="register"),
    path("auth/login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    
    # Users
    path("users/", UserListAPIView.as_view(), name="user-list"),
    
    # Profile
    path("profile/", UserProfileAPIView.as_view(), name="user-profile"),
]
