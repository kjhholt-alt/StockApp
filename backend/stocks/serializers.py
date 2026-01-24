"""
DRF Serializers for Stock models.
"""

from rest_framework import serializers
from .models import Stock, PriceData, ATRAnalysis, Alert


class StockSerializer(serializers.ModelSerializer):
    """Serializer for Stock model."""

    days_until_earnings = serializers.SerializerMethodField()

    class Meta:
        model = Stock
        fields = [
            'id', 'symbol', 'name', 'stock_type', 'is_active',
            'next_earnings_date', 'earnings_time', 'days_until_earnings',
            'created_at', 'updated_at'
        ]

    def get_days_until_earnings(self, obj):
        if obj.next_earnings_date:
            from datetime import date
            delta = obj.next_earnings_date - date.today()
            return delta.days if delta.days >= 0 else None
        return None


class PriceDataSerializer(serializers.ModelSerializer):
    """Serializer for PriceData model."""

    symbol = serializers.CharField(source='stock.symbol', read_only=True)

    class Meta:
        model = PriceData
        fields = [
            'id', 'symbol', 'date', 'open', 'high', 'low', 'close',
            'volume', 'true_range', 'atr_14', 'daily_range'
        ]


class ATRAnalysisSerializer(serializers.ModelSerializer):
    """Serializer for ATRAnalysis model."""

    symbol = serializers.CharField(source='stock.symbol', read_only=True)
    stock_name = serializers.CharField(source='stock.name', read_only=True)
    rvol_display = serializers.SerializerMethodField()

    class Meta:
        model = ATRAnalysis
        fields = [
            'id', 'symbol', 'stock_name', 'date',
            'current_atr', 'current_daily_range', 'consecutive_tight_days',
            'avg_volume_20d', 'current_volume', 'volume_ratio', 'rvol_display',
            'is_consolidating', 'volume_spike_detected', 'breakout_probability',
            'confidence_score', 'range_tightness_pct',
            'price_at_analysis', 'created_at'
        ]

    def get_rvol_display(self, obj):
        """Format volume ratio as percentage string (e.g., '150% of avg')"""
        if obj.volume_ratio:
            return f"{int(obj.volume_ratio * 100)}% of avg"
        return None


class AlertSerializer(serializers.ModelSerializer):
    """Serializer for Alert model."""

    symbol = serializers.CharField(source='stock.symbol', read_only=True)
    stock_name = serializers.CharField(source='stock.name', read_only=True)
    alert_type_display = serializers.CharField(source='get_alert_type_display', read_only=True)

    class Meta:
        model = Alert
        fields = [
            'id', 'symbol', 'stock_name', 'alert_type', 'alert_type_display',
            'message', 'is_read', 'email_sent', 'created_at'
        ]


class StockDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for Stock with related data."""

    latest_price = serializers.SerializerMethodField()
    latest_analysis = serializers.SerializerMethodField()
    recent_alerts = serializers.SerializerMethodField()

    class Meta:
        model = Stock
        fields = [
            'id', 'symbol', 'name', 'stock_type', 'is_active',
            'latest_price', 'latest_analysis', 'recent_alerts'
        ]

    def get_latest_price(self, obj):
        price = obj.price_data.first()
        if price:
            return PriceDataSerializer(price).data
        return None

    def get_latest_analysis(self, obj):
        analysis = obj.atr_analyses.first()
        if analysis:
            return ATRAnalysisSerializer(analysis).data
        return None

    def get_recent_alerts(self, obj):
        alerts = obj.alerts.all()[:5]
        return AlertSerializer(alerts, many=True).data


class DashboardStockSerializer(serializers.ModelSerializer):
    """Serializer for dashboard view with key metrics."""

    current_price = serializers.SerializerMethodField()
    atr = serializers.SerializerMethodField()
    daily_range = serializers.SerializerMethodField()
    consecutive_tight_days = serializers.SerializerMethodField()
    is_consolidating = serializers.SerializerMethodField()
    volume_spike = serializers.SerializerMethodField()
    breakout_probability = serializers.SerializerMethodField()
    price_change = serializers.SerializerMethodField()
    price_change_percent = serializers.SerializerMethodField()
    confidence_score = serializers.SerializerMethodField()
    rvol_display = serializers.SerializerMethodField()
    range_tightness_pct = serializers.SerializerMethodField()
    days_until_earnings = serializers.SerializerMethodField()

    class Meta:
        model = Stock
        fields = [
            'id', 'symbol', 'name', 'stock_type',
            'current_price', 'price_change', 'price_change_percent',
            'atr', 'daily_range', 'consecutive_tight_days',
            'is_consolidating', 'volume_spike', 'breakout_probability',
            'confidence_score', 'rvol_display', 'range_tightness_pct',
            'next_earnings_date', 'days_until_earnings'
        ]

    def get_current_price(self, obj):
        price = obj.price_data.first()
        return float(price.close) if price else None

    def get_atr(self, obj):
        analysis = obj.atr_analyses.first()
        return float(analysis.current_atr) if analysis else None

    def get_daily_range(self, obj):
        analysis = obj.atr_analyses.first()
        return float(analysis.current_daily_range) if analysis else None

    def get_consecutive_tight_days(self, obj):
        analysis = obj.atr_analyses.first()
        return analysis.consecutive_tight_days if analysis else 0

    def get_is_consolidating(self, obj):
        analysis = obj.atr_analyses.first()
        return analysis.is_consolidating if analysis else False

    def get_volume_spike(self, obj):
        analysis = obj.atr_analyses.first()
        return analysis.volume_spike_detected if analysis else False

    def get_breakout_probability(self, obj):
        analysis = obj.atr_analyses.first()
        return analysis.breakout_probability if analysis else 'LOW'

    def get_price_change(self, obj):
        prices = list(obj.price_data.all()[:2])
        if len(prices) >= 2:
            return float(prices[0].close - prices[1].close)
        return None

    def get_price_change_percent(self, obj):
        prices = list(obj.price_data.all()[:2])
        if len(prices) >= 2 and prices[1].close:
            change = prices[0].close - prices[1].close
            return float((change / prices[1].close) * 100)
        return None

    def get_confidence_score(self, obj):
        analysis = obj.atr_analyses.first()
        return analysis.confidence_score if analysis else 0

    def get_rvol_display(self, obj):
        analysis = obj.atr_analyses.first()
        if analysis and analysis.volume_ratio:
            return f"{int(analysis.volume_ratio * 100)}%"
        return None

    def get_range_tightness_pct(self, obj):
        analysis = obj.atr_analyses.first()
        if analysis and analysis.range_tightness_pct:
            return float(analysis.range_tightness_pct)
        return None

    def get_days_until_earnings(self, obj):
        if obj.next_earnings_date:
            from datetime import date
            delta = obj.next_earnings_date - date.today()
            return delta.days if delta.days >= 0 else None
        return None


class DashboardSummarySerializer(serializers.Serializer):
    """Serializer for dashboard summary."""

    total_stocks = serializers.IntegerField()
    consolidating_count = serializers.IntegerField()
    high_probability_count = serializers.IntegerField()
    unread_alerts = serializers.IntegerField()
    stocks = DashboardStockSerializer(many=True)
