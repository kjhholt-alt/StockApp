"""
Management command to run ATR consolidation analysis.
"""

from django.core.management.base import BaseCommand
from stocks.models import Stock
from stocks.services import ATRCalculator, AlertService


class Command(BaseCommand):
    help = 'Run ATR consolidation analysis for all stocks'

    def add_arguments(self, parser):
        parser.add_argument(
            '--symbol',
            type=str,
            help='Specific stock symbol to analyze (analyzes all if not specified)',
        )
        parser.add_argument(
            '--no-alerts',
            action='store_true',
            help='Skip alert generation',
        )

    def handle(self, *args, **options):
        symbol = options['symbol']
        generate_alerts = not options['no_alerts']

        calculator = ATRCalculator()
        alert_service = AlertService()

        if symbol:
            self.stdout.write(f'Analyzing {symbol.upper()}...')
            try:
                stock = Stock.objects.get(symbol=symbol.upper())
                analysis = calculator.analyze_stock(stock)

                if analysis:
                    self._print_analysis(analysis)

                    if generate_alerts:
                        alert = alert_service.process_analysis(analysis)
                        if alert:
                            self.stdout.write(
                                self.style.WARNING(f'  Alert created: {alert.alert_type}')
                            )
                else:
                    self.stdout.write(
                        self.style.WARNING(f'  Insufficient data for analysis')
                    )

            except Stock.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Stock not found: {symbol.upper()}')
                )

        else:
            self.stdout.write('Analyzing all stocks...\n')
            results = calculator.analyze_all_stocks()

            alerts_created = 0
            consolidating = []
            high_prob = []

            for sym, result in results.items():
                if result.get('success'):
                    status = '  '
                    if result.get('breakout_probability') == 'HIGH':
                        status = self.style.ERROR('!!')
                        high_prob.append(sym)
                    elif result.get('is_consolidating'):
                        status = self.style.WARNING('* ')
                        consolidating.append(sym)

                    self.stdout.write(
                        f'{status} {sym}: '
                        f'{result["consecutive_tight_days"]} tight days, '
                        f'Prob: {result["breakout_probability"]}'
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(f'   {sym}: Failed - {result.get("error")}')
                    )

            # Generate alerts
            if generate_alerts:
                self.stdout.write('\nGenerating alerts...')
                alerts = alert_service.process_all_analyses()
                alerts_created = len(alerts)
                for alert in alerts:
                    self.stdout.write(
                        self.style.WARNING(f'  {alert.stock.symbol}: {alert.alert_type}')
                    )

            # Summary
            self.stdout.write('\n' + '=' * 50)
            self.stdout.write(self.style.SUCCESS('SUMMARY'))
            self.stdout.write(f'Stocks analyzed: {len(results)}')
            self.stdout.write(f'Consolidating: {len(consolidating)}')

            if consolidating:
                self.stdout.write(f'  Symbols: {", ".join(consolidating)}')

            if high_prob:
                self.stdout.write(
                    self.style.ERROR(f'HIGH PROBABILITY: {", ".join(high_prob)}')
                )

            self.stdout.write(f'Alerts created: {alerts_created}')

    def _print_analysis(self, analysis):
        """Print formatted analysis result."""
        prob_style = {
            'LOW': self.style.SUCCESS,
            'MEDIUM': self.style.WARNING,
            'HIGH': self.style.ERROR,
        }

        style = prob_style.get(analysis.breakout_probability, self.style.SUCCESS)

        self.stdout.write(f'  Date: {analysis.date}')
        self.stdout.write(f'  Price: ${analysis.price_at_analysis:.2f}')
        self.stdout.write(f'  ATR: ${analysis.current_atr:.2f}')
        self.stdout.write(f'  Daily Range: ${analysis.current_daily_range:.2f}')
        self.stdout.write(f'  Tight Days: {analysis.consecutive_tight_days}')
        self.stdout.write(f'  Consolidating: {analysis.is_consolidating}')
        self.stdout.write(f'  Volume Spike: {analysis.volume_spike_detected}')
        self.stdout.write(style(f'  Probability: {analysis.breakout_probability}'))
