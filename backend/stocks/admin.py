"""
Admin configuration for Stock models.
"""

from django.contrib import admin
from .models import Stock, PriceData, ATRAnalysis, Alert


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ['symbol', 'name', 'stock_type', 'is_active', 'updated_at']
    list_filter = ['stock_type', 'is_active']
    search_fields = ['symbol', 'name']


@admin.register(PriceData)
class PriceDataAdmin(admin.ModelAdmin):
    list_display = ['stock', 'date', 'open', 'high', 'low', 'close', 'volume', 'atr_14']
    list_filter = ['stock', 'date']
    date_hierarchy = 'date'
    ordering = ['-date']


@admin.register(ATRAnalysis)
class ATRAnalysisAdmin(admin.ModelAdmin):
    list_display = [
        'stock', 'date', 'consecutive_tight_days',
        'is_consolidating', 'volume_spike_detected', 'breakout_probability'
    ]
    list_filter = ['breakout_probability', 'is_consolidating', 'volume_spike_detected', 'date']
    date_hierarchy = 'date'
    ordering = ['-date']


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ['stock', 'alert_type', 'is_read', 'email_sent', 'created_at']
    list_filter = ['alert_type', 'is_read', 'email_sent']
    search_fields = ['stock__symbol', 'message']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
