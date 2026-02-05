"""
API Views for Stock Breakout Alert System.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from .models import Stock, PriceData, ATRAnalysis, Alert
from .serializers import (
    StockSerializer,
    StockDetailSerializer,
    PriceDataSerializer,
    ATRAnalysisSerializer,
    AlertSerializer,
    DashboardStockSerializer,
    DashboardSummarySerializer,
)
from .services import DataFetcher, ATRCalculator, AlertService, BacktestService, AIOptimizer


class StockViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Stock model.

    list: Get all tracked stocks with basic info
    retrieve: Get detailed stock info by symbol
    """

    queryset = Stock.objects.filter(is_active=True)
    serializer_class = StockSerializer
    lookup_field = 'symbol'

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return StockDetailSerializer
        return StockSerializer

    @action(detail=True, methods=['get'])
    def prices(self, request, symbol=None):
        """Get price history for a stock."""
        stock = self.get_object()
        days = int(request.query_params.get('days', 30))
        prices = stock.price_data.all()[:days]
        serializer = PriceDataSerializer(prices, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def analysis(self, request, symbol=None):
        """Get ATR analysis for a stock."""
        stock = self.get_object()
        days = int(request.query_params.get('days', 30))
        analyses = stock.atr_analyses.all()[:days]
        serializer = ATRAnalysisSerializer(analyses, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def alerts(self, request, symbol=None):
        """Get alerts for a stock."""
        stock = self.get_object()
        alerts = stock.alerts.all()[:20]
        serializer = AlertSerializer(alerts, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def consolidating(self, request):
        """Get all stocks currently in consolidation."""
        calculator = ATRCalculator()
        analyses = calculator.get_consolidating_stocks()
        serializer = ATRAnalysisSerializer(analyses, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def high_probability(self, request):
        """Get stocks with HIGH breakout probability."""
        calculator = ATRCalculator()
        analyses = calculator.get_high_probability_stocks()
        serializer = ATRAnalysisSerializer(analyses, many=True)
        return Response(serializer.data)


class AlertViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Alert model."""

    queryset = Alert.objects.select_related('stock').all()
    serializer_class = AlertSerializer

    def get_queryset(self):
        queryset = Alert.objects.select_related('stock').all()

        # Filter by read status
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')

        # Filter by alert type
        alert_type = self.request.query_params.get('type')
        if alert_type:
            queryset = queryset.filter(alert_type=alert_type)

        # Filter by stock symbol
        symbol = self.request.query_params.get('symbol')
        if symbol:
            queryset = queryset.filter(stock__symbol=symbol.upper())

        return queryset

    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        """Mark an alert as read."""
        alert = self.get_object()
        alert.is_read = True
        alert.save()
        return Response({'status': 'marked as read'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all alerts as read."""
        count = Alert.objects.filter(is_read=False).update(is_read=True)
        return Response({'marked_read': count})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread alerts."""
        count = Alert.objects.filter(is_read=False).count()
        return Response({'unread_count': count})

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get alert summary."""
        service = AlertService()
        summary = service.get_alert_summary()
        return Response(summary)


class DashboardView(APIView):
    """Dashboard summary endpoint."""

    def get(self, request):
        """Get dashboard summary with all stocks and their status."""
        stocks = Stock.objects.filter(is_active=True).prefetch_related(
            'price_data', 'atr_analyses'
        )

        # Calculate summary stats
        consolidating_count = 0
        high_probability_count = 0

        for stock in stocks:
            analysis = stock.atr_analyses.first()
            if analysis:
                if analysis.is_consolidating:
                    consolidating_count += 1
                if analysis.breakout_probability == 'HIGH':
                    high_probability_count += 1

        unread_alerts = Alert.objects.filter(is_read=False).count()

        data = {
            'total_stocks': stocks.count(),
            'consolidating_count': consolidating_count,
            'high_probability_count': high_probability_count,
            'unread_alerts': unread_alerts,
            'stocks': DashboardStockSerializer(stocks, many=True).data,
        }

        return Response(data)


class RefreshDataView(APIView):
    """Manual data refresh endpoint."""

    def post(self, request):
        """
        Trigger manual data refresh.

        Query params:
            symbol: Specific stock to refresh (optional)
            analyze: Run analysis after fetch (default: true)
        """
        symbol = request.query_params.get('symbol')
        run_analysis = request.query_params.get('analyze', 'true').lower() == 'true'

        fetcher = DataFetcher()
        calculator = ATRCalculator()

        results = {'fetch': {}, 'analysis': {}}

        # Fetch data
        if symbol:
            try:
                count = fetcher.fetch_stock_data(symbol.upper(), days=30)
                results['fetch'][symbol] = {'success': True, 'records': count}
            except Exception as e:
                results['fetch'][symbol] = {'success': False, 'error': str(e)}
        else:
            results['fetch'] = fetcher.fetch_all_stocks(days=30)

        # Run analysis
        if run_analysis:
            results['analysis'] = calculator.analyze_all_stocks()

            # Generate alerts
            alert_service = AlertService()
            alerts = alert_service.process_all_analyses()
            results['alerts_created'] = len(alerts)

        return Response(results)


class BacktestAlertPerformanceView(APIView):
    """Get performance analysis of historical alerts."""

    def get(self, request):
        days = int(request.query_params.get('days', 90))
        service = BacktestService()
        results = service.analyze_alert_performance(days_back=days)
        return Response(results)


class BacktestConsolidationPatternsView(APIView):
    """Get analysis of historical consolidation patterns."""

    def get(self, request):
        days = int(request.query_params.get('days', 90))
        service = BacktestService()
        results = service.analyze_consolidation_patterns(days_back=days)
        return Response(results)


class BacktestHistoricalDayView(APIView):
    """Get system snapshot for a specific historical date."""

    def get(self, request, date_str):
        service = BacktestService()
        results = service.get_historical_day_analysis(date_str)
        return Response(results)


class BacktestAvailableDatesView(APIView):
    """Get list of dates with available analysis data."""

    def get(self, request):
        service = BacktestService()
        dates = service.get_available_dates()
        return Response({'dates': dates})


class AIOptimizeView(APIView):
    """Get AI-powered optimization recommendations."""

    def get(self, request):
        days = int(request.query_params.get('days', 90))
        optimizer = AIOptimizer()
        results = optimizer.analyze_and_optimize(days_back=days)
        return Response(results)


class AIQuickInsightsView(APIView):
    """Get quick AI insights on performance."""

    def get(self, request):
        days = int(request.query_params.get('days', 30))
        optimizer = AIOptimizer()
        results = optimizer.get_quick_insights(days_back=days)
        return Response(results)


class AISuggestParametersView(APIView):
    """Get AI-suggested parameter changes."""

    def get(self, request):
        optimizer = AIOptimizer()
        results = optimizer.suggest_parameter_changes()
        return Response(results)
