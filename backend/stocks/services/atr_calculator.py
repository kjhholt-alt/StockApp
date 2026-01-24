"""
ATR (Average True Range) calculation and consolidation detection service.
"""

import logging
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional, Tuple

from django.conf import settings
from django.db import transaction
from django.db.models import Avg

from stocks.models import Stock, PriceData, ATRAnalysis

logger = logging.getLogger(__name__)


class ATRCalculator:
    """
    Service for calculating ATR and detecting consolidation patterns.

    Consolidation Detection Logic:
    1. Calculate 14-day ATR (Average True Range)
    2. Compare each day's actual range (high-low) to ATR
    3. Count consecutive days where daily_range <= ATR
    4. Track volume: compare to 20-day average
    5. Detect volume spike (volume > 1.5x avg while still consolidating)

    Breakout Probability:
    - LOW: Less than 3 consecutive tight days
    - MEDIUM: 3+ consecutive tight days, no volume spike
    - HIGH: 3+ consecutive tight days WITH volume spike
    """

    def __init__(self):
        self.atr_period = getattr(settings, 'ATR_PERIOD', 14)
        self.consolidation_threshold = getattr(settings, 'CONSOLIDATION_THRESHOLD_DAYS', 3)
        self.volume_spike_multiplier = Decimal(str(getattr(settings, 'VOLUME_SPIKE_MULTIPLIER', 1.5)))
        self.volume_avg_period = getattr(settings, 'VOLUME_AVG_PERIOD', 20)

    def analyze_all_stocks(self) -> dict:
        """
        Run consolidation analysis for all active stocks.

        Returns:
            Dictionary with analysis results per symbol
        """
        results = {}
        stocks = Stock.objects.filter(is_active=True)

        for stock in stocks:
            try:
                analysis = self.analyze_stock(stock)
                if analysis:
                    results[stock.symbol] = {
                        'success': True,
                        'is_consolidating': analysis.is_consolidating,
                        'breakout_probability': analysis.breakout_probability,
                        'consecutive_tight_days': analysis.consecutive_tight_days,
                    }
                else:
                    results[stock.symbol] = {
                        'success': False,
                        'error': 'Insufficient data'
                    }
            except Exception as e:
                results[stock.symbol] = {'success': False, 'error': str(e)}
                logger.error(f"Analysis failed for {stock.symbol}: {e}")

        return results

    @transaction.atomic
    def analyze_stock(self, stock: Stock, analysis_date: Optional[date] = None) -> Optional[ATRAnalysis]:
        """
        Perform ATR consolidation analysis for a single stock.

        Args:
            stock: Stock model instance
            analysis_date: Date to analyze (defaults to today)

        Returns:
            ATRAnalysis instance or None if insufficient data
        """
        if analysis_date is None:
            analysis_date = date.today()

        # Get price data - need at least ATR period + some buffer
        price_data = PriceData.objects.filter(
            stock=stock,
            date__lte=analysis_date
        ).order_by('-date')[:self.atr_period + self.volume_avg_period + 5]

        price_list = list(price_data)

        if len(price_list) < self.atr_period:
            logger.warning(f"Insufficient data for {stock.symbol}: {len(price_list)} days")
            return None

        # Calculate ATR
        self._calculate_atr_for_stock(stock, price_list)

        # Refresh price list to get updated ATR values
        price_data = PriceData.objects.filter(
            stock=stock,
            date__lte=analysis_date
        ).order_by('-date')[:self.volume_avg_period + 5]

        price_list = list(price_data)

        if not price_list:
            return None

        latest_price = price_list[0]

        if not latest_price.atr_14:
            logger.warning(f"No ATR calculated for {stock.symbol}")
            return None

        # Calculate consecutive tight days
        consecutive_tight_days = self._count_consecutive_tight_days(price_list)

        # Calculate volume metrics
        avg_volume, volume_ratio = self._calculate_volume_metrics(price_list)

        # Determine consolidation status
        is_consolidating = consecutive_tight_days >= self.consolidation_threshold

        # Detect volume spike
        volume_spike = (
            volume_ratio is not None and
            volume_ratio >= self.volume_spike_multiplier and
            is_consolidating
        )

        # Determine breakout probability
        breakout_probability = self._determine_probability(
            consecutive_tight_days,
            is_consolidating,
            volume_spike
        )

        # Create or update analysis
        analysis, created = ATRAnalysis.objects.update_or_create(
            stock=stock,
            date=analysis_date,
            defaults={
                'current_atr': latest_price.atr_14,
                'current_daily_range': latest_price.daily_range or Decimal('0'),
                'consecutive_tight_days': consecutive_tight_days,
                'avg_volume_20d': avg_volume,
                'current_volume': latest_price.volume,
                'volume_ratio': volume_ratio,
                'is_consolidating': is_consolidating,
                'volume_spike_detected': volume_spike,
                'breakout_probability': breakout_probability,
                'price_at_analysis': latest_price.close,
            }
        )

        logger.info(
            f"Analysis for {stock.symbol}: "
            f"tight_days={consecutive_tight_days}, "
            f"consolidating={is_consolidating}, "
            f"volume_spike={volume_spike}, "
            f"probability={breakout_probability}"
        )

        return analysis

    def _calculate_atr_for_stock(self, stock: Stock, price_list: list):
        """Calculate and store ATR values for price data."""
        # Sort by date ascending for calculation
        sorted_prices = sorted(price_list, key=lambda x: x.date)

        for i, price in enumerate(sorted_prices):
            # Calculate True Range
            if i == 0:
                # First day: TR = High - Low
                true_range = price.high - price.low
            else:
                prev_close = sorted_prices[i - 1].close
                tr1 = price.high - price.low
                tr2 = abs(price.high - prev_close)
                tr3 = abs(price.low - prev_close)
                true_range = max(tr1, tr2, tr3)

            price.true_range = true_range

            # Calculate ATR (14-day EMA)
            if i >= self.atr_period - 1:
                if i == self.atr_period - 1:
                    # First ATR: simple average of first N true ranges
                    atr_sum = sum(
                        p.true_range for p in sorted_prices[:self.atr_period]
                        if p.true_range
                    )
                    price.atr_14 = atr_sum / self.atr_period
                else:
                    # Subsequent ATR: EMA calculation
                    prev_atr = sorted_prices[i - 1].atr_14
                    if prev_atr:
                        # ATR = ((Prior ATR * 13) + Current TR) / 14
                        price.atr_14 = (
                            (prev_atr * (self.atr_period - 1) + true_range) /
                            self.atr_period
                        )

            price.save()

    def _count_consecutive_tight_days(self, price_list: list) -> int:
        """
        Count consecutive days where daily range is at or below ATR.

        Args:
            price_list: List of PriceData, most recent first

        Returns:
            Number of consecutive tight days
        """
        consecutive = 0

        for price in price_list:
            if not price.atr_14 or not price.daily_range:
                break

            if price.daily_range <= price.atr_14:
                consecutive += 1
            else:
                break

        return consecutive

    def _calculate_volume_metrics(self, price_list: list) -> Tuple[Optional[int], Optional[Decimal]]:
        """
        Calculate volume metrics.

        Returns:
            Tuple of (20-day average volume, current volume ratio)
        """
        if len(price_list) < 2:
            return None, None

        current_volume = price_list[0].volume

        # Calculate 20-day average (excluding today)
        volume_data = [p.volume for p in price_list[1:self.volume_avg_period + 1]]

        if not volume_data:
            return None, None

        avg_volume = sum(volume_data) // len(volume_data)

        if avg_volume == 0:
            return avg_volume, None

        volume_ratio = Decimal(str(current_volume)) / Decimal(str(avg_volume))

        return avg_volume, volume_ratio

    def _determine_probability(
        self,
        consecutive_tight_days: int,
        is_consolidating: bool,
        volume_spike: bool
    ) -> str:
        """Determine breakout probability level."""
        if consecutive_tight_days >= self.consolidation_threshold:
            if volume_spike:
                return 'HIGH'
            return 'MEDIUM'
        return 'LOW'

    def get_latest_analysis(self, stock: Stock) -> Optional[ATRAnalysis]:
        """Get the most recent analysis for a stock."""
        return ATRAnalysis.objects.filter(stock=stock).first()

    def get_consolidating_stocks(self) -> list:
        """Get all stocks currently in consolidation."""
        from django.db.models import Max

        # Get latest analysis date per stock
        latest_dates = ATRAnalysis.objects.values('stock').annotate(
            latest_date=Max('date')
        )

        consolidating = []
        for item in latest_dates:
            analysis = ATRAnalysis.objects.filter(
                stock_id=item['stock'],
                date=item['latest_date'],
                is_consolidating=True
            ).first()

            if analysis:
                consolidating.append(analysis)

        return consolidating

    def get_high_probability_stocks(self) -> list:
        """Get stocks with HIGH breakout probability."""
        from django.db.models import Max

        latest_dates = ATRAnalysis.objects.values('stock').annotate(
            latest_date=Max('date')
        )

        high_prob = []
        for item in latest_dates:
            analysis = ATRAnalysis.objects.filter(
                stock_id=item['stock'],
                date=item['latest_date'],
                breakout_probability='HIGH'
            ).first()

            if analysis:
                high_prob.append(analysis)

        return high_prob
