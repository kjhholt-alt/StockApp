"""
URL configuration for stocks app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    StockViewSet,
    AlertViewSet,
    DashboardView,
    RefreshDataView,
    BacktestAlertPerformanceView,
    BacktestConsolidationPatternsView,
    BacktestHistoricalDayView,
    BacktestAvailableDatesView,
    AIOptimizeView,
    AIQuickInsightsView,
    AISuggestParametersView,
)

router = DefaultRouter()
router.register(r'stocks', StockViewSet, basename='stock')
router.register(r'alerts', AlertViewSet, basename='alert')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('refresh/', RefreshDataView.as_view(), name='refresh'),
    # Backtest endpoints
    path('backtest/alerts/', BacktestAlertPerformanceView.as_view(), name='backtest-alerts'),
    path('backtest/patterns/', BacktestConsolidationPatternsView.as_view(), name='backtest-patterns'),
    path('backtest/dates/', BacktestAvailableDatesView.as_view(), name='backtest-dates'),
    path('backtest/day/<str:date_str>/', BacktestHistoricalDayView.as_view(), name='backtest-day'),
    # AI Optimization endpoints
    path('ai/optimize/', AIOptimizeView.as_view(), name='ai-optimize'),
    path('ai/insights/', AIQuickInsightsView.as_view(), name='ai-insights'),
    path('ai/suggest/', AISuggestParametersView.as_view(), name='ai-suggest'),
]
