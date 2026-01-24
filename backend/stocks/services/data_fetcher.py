"""
Yahoo Finance data fetching service.
"""

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

import yfinance as yf
import pandas as pd
from django.conf import settings
from django.db import transaction

from stocks.models import Stock, PriceData

logger = logging.getLogger(__name__)


class DataFetcher:
    """Service for fetching stock data from Yahoo Finance."""

    def __init__(self):
        self.symbols = settings.TRACKED_SYMBOLS

    def fetch_all_stocks(self, days: int = 60) -> dict:
        """
        Fetch price data for all tracked symbols.

        Args:
            days: Number of historical days to fetch

        Returns:
            Dictionary with fetch results per symbol
        """
        results = {}
        for symbol in self.symbols:
            try:
                count = self.fetch_stock_data(symbol, days)
                results[symbol] = {'success': True, 'records': count}
                logger.info(f"Fetched {count} records for {symbol}")
            except Exception as e:
                results[symbol] = {'success': False, 'error': str(e)}
                logger.error(f"Failed to fetch {symbol}: {e}")

        return results

    def fetch_stock_data(self, symbol: str, days: int = 60) -> int:
        """
        Fetch and store price data for a single stock.

        Args:
            symbol: Stock ticker symbol
            days: Number of historical days to fetch

        Returns:
            Number of records created/updated
        """
        # Ensure stock exists
        stock = self._get_or_create_stock(symbol)
        if not stock:
            raise ValueError(f"Could not create stock record for {symbol}")

        # Fetch data from Yahoo Finance
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        ticker = yf.Ticker(symbol)
        df = ticker.history(start=start_date, end=end_date)

        if df.empty:
            logger.warning(f"No data returned for {symbol}")
            return 0

        # Store price data
        return self._store_price_data(stock, df)

    def _get_or_create_stock(self, symbol: str) -> Optional[Stock]:
        """Get or create a Stock record."""
        stock_info = self._get_stock_info(symbol)

        stock, created = Stock.objects.update_or_create(
            symbol=symbol,
            defaults={
                'name': stock_info['name'],
                'stock_type': stock_info['type'],
                'is_active': True,
            }
        )

        if created:
            logger.info(f"Created new stock record for {symbol}")

        return stock

    def _get_stock_info(self, symbol: str) -> dict:
        """Get stock name and type."""
        # Define known stocks
        stock_data = {
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
        }

        if symbol in stock_data:
            return {'name': stock_data[symbol][0], 'type': stock_data[symbol][1]}

        # Fallback: try to get from yfinance
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            name = info.get('longName', info.get('shortName', symbol))
            return {'name': name, 'type': 'MAG7'}  # Default to MAG7
        except Exception:
            return {'name': symbol, 'type': 'MAG7'}

    @transaction.atomic
    def _store_price_data(self, stock: Stock, df: pd.DataFrame) -> int:
        """Store price data from DataFrame."""
        records_count = 0

        for date, row in df.iterrows():
            # Convert timestamp to date
            if hasattr(date, 'date'):
                price_date = date.date()
            else:
                price_date = date

            # Calculate daily range
            daily_range = Decimal(str(row['High'])) - Decimal(str(row['Low']))

            # Create or update price data
            price_data, created = PriceData.objects.update_or_create(
                stock=stock,
                date=price_date,
                defaults={
                    'open': Decimal(str(row['Open'])),
                    'high': Decimal(str(row['High'])),
                    'low': Decimal(str(row['Low'])),
                    'close': Decimal(str(row['Close'])),
                    'volume': int(row['Volume']),
                    'daily_range': daily_range,
                }
            )

            if created:
                records_count += 1

        return records_count

    def fetch_latest_prices(self) -> dict:
        """Fetch only the most recent price data (last 5 days) for all stocks."""
        return self.fetch_all_stocks(days=5)

    def get_stock_current_price(self, symbol: str) -> Optional[Decimal]:
        """Get current/latest price for a symbol."""
        try:
            ticker = yf.Ticker(symbol)
            data = ticker.history(period='1d')
            if not data.empty:
                return Decimal(str(data['Close'].iloc[-1]))
        except Exception as e:
            logger.error(f"Error fetching current price for {symbol}: {e}")

        return None
