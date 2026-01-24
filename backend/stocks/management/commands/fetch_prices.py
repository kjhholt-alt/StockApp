"""
Management command to fetch stock prices.
"""

from django.core.management.base import BaseCommand
from stocks.services import DataFetcher


class Command(BaseCommand):
    help = 'Fetch stock price data from Yahoo Finance'

    def add_arguments(self, parser):
        parser.add_argument(
            '--symbol',
            type=str,
            help='Specific stock symbol to fetch (fetches all if not specified)',
        )
        parser.add_argument(
            '--days',
            type=int,
            default=60,
            help='Number of days of historical data to fetch (default: 60)',
        )

    def handle(self, *args, **options):
        symbol = options['symbol']
        days = options['days']

        fetcher = DataFetcher()

        if symbol:
            self.stdout.write(f'Fetching data for {symbol.upper()}...')
            try:
                count = fetcher.fetch_stock_data(symbol.upper(), days=days)
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully fetched {count} records for {symbol.upper()}')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Failed to fetch {symbol.upper()}: {e}')
                )
        else:
            self.stdout.write('Fetching data for all tracked stocks...')
            results = fetcher.fetch_all_stocks(days=days)

            success_count = 0
            for sym, result in results.items():
                if result.get('success'):
                    success_count += 1
                    self.stdout.write(f'  {sym}: {result["records"]} records')
                else:
                    self.stdout.write(
                        self.style.WARNING(f'  {sym}: Failed - {result.get("error")}')
                    )

            self.stdout.write(
                self.style.SUCCESS(f'\nFetch complete: {success_count}/{len(results)} successful')
            )
