"""
URL configuration for Stock Breakout Alert System.
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('stocks.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/users/', include('users.urls')),
]
