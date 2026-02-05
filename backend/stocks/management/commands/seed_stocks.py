"""
Management command to seed initial stock data.
"""

from django.core.management.base import BaseCommand
from django.conf import settings
from stocks.models import Stock


class Command(BaseCommand):
    help = 'Seed initial stock data for tracked symbols'

    STOCK_DATA = {
        'AAPL': ('Apple Inc.', 'MAG7'),
        'MSFT': ('Microsoft Corporation', 'MAG7'),
        'GOOGL': ('Alphabet Inc.', 'MAG7'),
        'AMZN': ('Amazon.com Inc.', 'MAG7'),
        'META': ('Meta Platforms Inc.', 'MAG7'),
        'NVDA': ('NVIDIA Corporation', 'MAG7'),
        'TSLA': ('Tesla Inc.', 'MAG7'),
        'SPY': ('SPDR S&P 500 ETF', 'INDEX'),
        'QQQ': ('Invesco QQQ Trust', 'INDEX'),
        'IWM': ('iShares Russell 2000 ETF', 'INDEX'),
        'U': ('Unity Software Inc.', 'OTHER'),
    }

    def handle(self, *args, **options):
        self.stdout.write('Seeding stock data...\n')

        created_count = 0
        updated_count = 0

        for symbol, (name, stock_type) in self.STOCK_DATA.items():
            stock, created = Stock.objects.update_or_create(
                symbol=symbol,
                defaults={
                    'name': name,
                    'stock_type': stock_type,
                    'is_active': True,
                }
            )

            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'  Created: {symbol} - {name}'))
            else:
                updated_count += 1
                self.stdout.write(f'  Updated: {symbol} - {name}')

        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(self.style.SUCCESS(f'Created: {created_count}'))
        self.stdout.write(f'Updated: {updated_count}')
        self.stdout.write(f'Total: {len(self.STOCK_DATA)}')
