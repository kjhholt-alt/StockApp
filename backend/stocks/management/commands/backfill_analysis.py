"""
Management command to backfill historical ATR analysis for backtesting.
"""

from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils import timezone
from stocks.models import Stock, PriceData, ATRAnalysis, Alert
from stocks.services import ATRCalculator


class Command(BaseCommand):
    help = 'Backfill historical ATR analysis for all dates with price data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=60,
            help='Number of days to backfill (default: 60)',
        )
        parser.add_argument(
            '--with-alerts',
            action='store_true',
            help='Generate alerts for historical consolidation patterns',
        )

    def _create_historical_alert(self, analysis):
        """Create an alert with historical timestamp based on analysis date."""
        stock = analysis.stock

        # Determine alert type
        if analysis.breakout_probability == 'HIGH':
            alert_type = 'BREAKOUT_READY'
        elif analysis.volume_spike_detected and analysis.is_consolidating:
            alert_type = 'VOLUME_SPIKE'
        elif analysis.consecutive_tight_days == getattr(settings, 'CONSOLIDATION_THRESHOLD_DAYS', 3):
            alert_type = 'CONSOLIDATION_START'
        else:
            return None

        # Check if alert already exists
        # Use analysis date for checking (not created_at)
        existing = Alert.objects.filter(
            stock=stock,
            alert_type=alert_type,
            analysis__date=analysis.date
        ).exists()

        if existing:
            return None

        # Generate message
        price = analysis.price_at_analysis
        messages = {
            'CONSOLIDATION_START': (
                f"{stock.symbol} ({stock.name}) has entered consolidation. "
                f"The stock has {analysis.consecutive_tight_days} consecutive days "
                f"with daily range below ATR (${analysis.current_atr:.2f}). "
                f"Current price: ${price:.2f}. Watch for volume increase."
            ),
            'VOLUME_SPIKE': (
                f"VOLUME SPIKE: {stock.symbol} ({stock.name}) showing increased volume "
                f"while in consolidation! Volume is {analysis.volume_ratio:.1f}x the 20-day average. "
                f"Current price: ${price:.2f}. ATR: ${analysis.current_atr:.2f}."
            ),
            'BREAKOUT_READY': (
                f"BREAKOUT ALERT: {stock.symbol} ({stock.name}) is showing HIGH breakout probability! "
                f"{analysis.consecutive_tight_days} tight days with volume spike detected. "
                f"Volume is {analysis.volume_ratio:.1f}x average. "
                f"Current price: ${price:.2f}. ATR: ${analysis.current_atr:.2f}."
            ),
        }

        message = messages.get(alert_type, f"Alert for {stock.symbol}")

        # Create alert
        alert = Alert.objects.create(
            stock=stock,
            alert_type=alert_type,
            message=message,
            analysis=analysis,
        )

        # Update created_at to match analysis date (workaround for auto_now_add)
        analysis_datetime = timezone.make_aware(
            datetime.combine(analysis.date, datetime.min.time().replace(hour=16))
        )
        Alert.objects.filter(pk=alert.pk).update(created_at=analysis_datetime)

        return alert

    def handle(self, *args, **options):
        days_back = options['days']
        generate_alerts = options['with_alerts']

        calculator = ATRCalculator()

        stocks = Stock.objects.filter(is_active=True)

        self.stdout.write(f'Backfilling {days_back} days of analysis for {stocks.count()} stocks...\n')

        total_analyses = 0
        total_alerts = 0
        consolidation_count = 0

        for stock in stocks:
            self.stdout.write(f'Processing {stock.symbol}...')

            # Get all unique dates with price data
            price_dates = PriceData.objects.filter(
                stock=stock
            ).values_list('date', flat=True).order_by('-date')[:days_back]

            stock_analyses = 0
            stock_consolidations = 0

            for analysis_date in price_dates:
                try:
                    analysis = calculator.analyze_stock(stock, analysis_date=analysis_date)
                    if analysis:
                        stock_analyses += 1
                        total_analyses += 1

                        if analysis.is_consolidating:
                            stock_consolidations += 1
                            consolidation_count += 1

                            # Generate alert if requested and pattern is significant
                            if generate_alerts and analysis.consecutive_tight_days >= 3:
                                alert = self._create_historical_alert(analysis)
                                if alert:
                                    total_alerts += 1

                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(f'  Error on {analysis_date}: {str(e)}')
                    )

            self.stdout.write(
                f'  {stock_analyses} analyses, {stock_consolidations} consolidations'
            )

        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(self.style.SUCCESS('BACKFILL COMPLETE'))
        self.stdout.write(f'Total analyses created: {total_analyses}')
        self.stdout.write(f'Consolidation patterns found: {consolidation_count}')
        if generate_alerts:
            self.stdout.write(f'Alerts generated: {total_alerts}')
