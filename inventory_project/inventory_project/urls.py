"""
URL configuration for inventory_project project.
"""

from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# ✅ DEFINE urlpatterns FIRST
urlpatterns = [
    # New multi-app architecture
    path("api/", include("accounts.urls")),
    path("api/", include("roles.urls")),
    path("api/", include("warehouses.urls")),
]

# ✅ THEN append static URLs
if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )

