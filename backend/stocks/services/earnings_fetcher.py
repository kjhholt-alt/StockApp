"""
Earnings calendar fetcher service.
"""

import logging
from datetime import date
from typing import Optional

import yfinance as yf

from stocks.models import Stock

logger = logging.getLogger(__name__)


class EarningsFetcher:
    """Service for fetching earnings dates from Yahoo Finance."""

    def fetch_all_earnings(self) -> dict:
        """
        Fetch earnings dates for all tracked stocks.

        Returns:
            Dictionary with results per symbol
        """
        results = {}
        stocks = Stock.objects.filter(is_active=True)

        for stock in stocks:
            try:
                result = self.fetch_earnings(stock)
                results[stock.symbol] = result
            except Exception as e:
                results[stock.symbol] = {'success': False, 'error': str(e)}
                logger.error(f"Failed to fetch earnings for {stock.symbol}: {e}")

        return results

    def fetch_earnings(self, stock: Stock) -> dict:
        """
        Fetch and update earnings date for a single stock.

        Args:
            stock: Stock model instance

        Returns:
            Dict with success status and earnings info
        """
        try:
            ticker = yf.Ticker(stock.symbol)
            calendar = ticker.calendar

            if calendar is None or calendar.empty:
                return {'success': True, 'earnings_date': None, 'message': 'No earnings data'}

            # Get next earnings date
            earnings_date = None
            earnings_time = None

            if 'Earnings Date' in calendar.index:
                earnings_dates = calendar.loc['Earnings Date']
                if len(earnings_dates) > 0:
                    next_date = earnings_dates.iloc[0]
                    if hasattr(next_date, 'date'):
                        earnings_date = next_date.date()
                    elif isinstance(next_date, str):
                        from datetime import datetime
                        earnings_date = datetime.strptime(next_date, '%Y-%m-%d').date()

            # Update stock
            stock.next_earnings_date = earnings_date
            stock.earnings_time = 'TBD'  # Yahoo doesn't always provide time
            stock.save()

            logger.info(f"Updated earnings for {stock.symbol}: {earnings_date}")

            return {
                'success': True,
                'earnings_date': str(earnings_date) if earnings_date else None,
            }

        except Exception as e:
            logger.error(f"Error fetching earnings for {stock.symbol}: {e}")
            return {'success': False, 'error': str(e)}

    def get_upcoming_earnings(self, days: int = 14) -> list:
        """
        Get stocks with earnings in the next N days.

        Args:
            days: Number of days to look ahead

        Returns:
            List of Stock objects with upcoming earnings
        """
        from datetime import timedelta

        today = date.today()
        end_date = today + timedelta(days=days)

        return list(Stock.objects.filter(
            is_active=True,
            next_earnings_date__gte=today,
            next_earnings_date__lte=end_date
        ).order_by('next_earnings_date'))
