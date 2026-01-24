"""
URL configuration for stocks app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import StockViewSet, AlertViewSet, DashboardView, RefreshDataView

router = DefaultRouter()
router.register(r'stocks', StockViewSet, basename='stock')
router.register(r'alerts', AlertViewSet, basename='alert')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('refresh/', RefreshDataView.as_view(), name='refresh'),
]
