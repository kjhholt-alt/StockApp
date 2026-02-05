"""
Backtesting Service for Stock Breakout Alert System.

Analyzes historical alerts and consolidation patterns to measure
the accuracy and performance of the detection system.
"""

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional
from django.db.models import Avg, Count, Q
from django.utils import timezone

from ..models import Stock, PriceData, ATRAnalysis, Alert

logger = logging.getLogger(__name__)


class BacktestService:
    """Service to analyze historical performance of the alert system."""

    def __init__(self):
        self.breakout_threshold_pct = Decimal('2.0')  # 2% move = breakout
        self.lookforward_days = 5  # Days to check after alert

    def analyze_alert_performance(self, days_back: int = 90) -> dict:
        """
        Analyze all alerts from the past N days and check their outcomes.

        Returns performance metrics including:
        - Total alerts generated
        - Alerts that led to breakouts
        - Win rate
        - Average gain/loss after alerts
        """
        cutoff_date = timezone.now() - timedelta(days=days_back)

        alerts = Alert.objects.filter(
            created_at__gte=cutoff_date
        ).select_related('stock').order_by('-created_at')

        results = {
            'period_days': days_back,
            'total_alerts': alerts.count(),
            'by_type': {},
            'by_stock': {},
            'detailed_alerts': [],
            'summary': {
                'total_breakouts': 0,
                'total_non_breakouts': 0,
                'pending_evaluation': 0,
                'win_rate': 0,
                'avg_gain_pct': 0,
                'avg_loss_pct': 0,
                'best_gain_pct': 0,
                'worst_loss_pct': 0,
            }
        }

        gains = []
        losses = []

        for alert in alerts:
            outcome = self._evaluate_alert_outcome(alert)
            results['detailed_alerts'].append(outcome)

            # Aggregate by type
            alert_type = alert.alert_type
            if alert_type not in results['by_type']:
                results['by_type'][alert_type] = {
                    'total': 0,
                    'breakouts': 0,
                    'non_breakouts': 0,
                    'pending': 0,
                    'avg_move_pct': 0,
                    'moves': []
                }

            results['by_type'][alert_type]['total'] += 1

            # Aggregate by stock
            symbol = alert.stock.symbol
            if symbol not in results['by_stock']:
                results['by_stock'][symbol] = {
                    'name': alert.stock.name,
                    'total': 0,
                    'breakouts': 0,
                    'non_breakouts': 0,
                    'pending': 0,
                    'avg_move_pct': 0,
                    'moves': []
                }

            results['by_stock'][symbol]['total'] += 1

            # Count outcomes
            if outcome['status'] == 'BREAKOUT':
                results['summary']['total_breakouts'] += 1
                results['by_type'][alert_type]['breakouts'] += 1
                results['by_stock'][symbol]['breakouts'] += 1
                if outcome['max_gain_pct']:
                    gains.append(float(outcome['max_gain_pct']))
                    results['by_type'][alert_type]['moves'].append(float(outcome['max_gain_pct']))
                    results['by_stock'][symbol]['moves'].append(float(outcome['max_gain_pct']))
            elif outcome['status'] == 'NO_BREAKOUT':
                results['summary']['total_non_breakouts'] += 1
                results['by_type'][alert_type]['non_breakouts'] += 1
                results['by_stock'][symbol]['non_breakouts'] += 1
                if outcome['max_loss_pct']:
                    losses.append(float(outcome['max_loss_pct']))
                    results['by_type'][alert_type]['moves'].append(float(outcome['max_loss_pct']))
                    results['by_stock'][symbol]['moves'].append(float(outcome['max_loss_pct']))
            else:
                results['summary']['pending_evaluation'] += 1
                results['by_type'][alert_type]['pending'] += 1
                results['by_stock'][symbol]['pending'] += 1

        # Calculate summary stats
        evaluated = results['summary']['total_breakouts'] + results['summary']['total_non_breakouts']
        if evaluated > 0:
            results['summary']['win_rate'] = round(
                (results['summary']['total_breakouts'] / evaluated) * 100, 1
            )

        if gains:
            results['summary']['avg_gain_pct'] = round(sum(gains) / len(gains), 2)
            results['summary']['best_gain_pct'] = round(max(gains), 2)

        if losses:
            results['summary']['avg_loss_pct'] = round(sum(losses) / len(losses), 2)
            results['summary']['worst_loss_pct'] = round(min(losses), 2)

        # Calculate averages for by_type and by_stock
        for type_data in results['by_type'].values():
            if type_data['moves']:
                type_data['avg_move_pct'] = round(sum(type_data['moves']) / len(type_data['moves']), 2)
            del type_data['moves']

        for stock_data in results['by_stock'].values():
            if stock_data['moves']:
                stock_data['avg_move_pct'] = round(sum(stock_data['moves']) / len(stock_data['moves']), 2)
            del stock_data['moves']

        return results

    def _evaluate_alert_outcome(self, alert: Alert) -> dict:
        """
        Evaluate what happened after a specific alert was generated.

        Checks price movement in the days following the alert to determine
        if a breakout occurred.
        """
        result = {
            'id': alert.id,
            'symbol': alert.stock.symbol,
            'stock_name': alert.stock.name,
            'alert_type': alert.alert_type,
            'alert_type_display': alert.get_alert_type_display(),
            'message': alert.message,
            'created_at': alert.created_at.isoformat(),
            'status': 'PENDING',
            'price_at_alert': None,
            'max_price_after': None,
            'min_price_after': None,
            'max_gain_pct': None,
            'max_loss_pct': None,
            'days_to_breakout': None,
            'outcome_details': '',
        }

        alert_date = alert.created_at.date()

        # Get price at alert time
        price_at_alert = PriceData.objects.filter(
            stock=alert.stock,
            date__lte=alert_date
        ).order_by('-date').first()

        if not price_at_alert:
            result['outcome_details'] = 'No price data at alert time'
            return result

        result['price_at_alert'] = float(price_at_alert.close)

        # Get prices for the lookforward period
        end_date = alert_date + timedelta(days=self.lookforward_days)

        # If we don't have enough future data yet, mark as pending
        if end_date > timezone.now().date():
            result['status'] = 'PENDING'
            result['outcome_details'] = f'Waiting for {self.lookforward_days} days of data'
            return result

        future_prices = PriceData.objects.filter(
            stock=alert.stock,
            date__gt=alert_date,
            date__lte=end_date
        ).order_by('date')

        if not future_prices.exists():
            result['outcome_details'] = 'No future price data available'
            return result

        # Find max and min prices after alert
        max_price = None
        min_price = None
        max_price_date = None
        min_price_date = None

        for price in future_prices:
            if max_price is None or price.high > max_price:
                max_price = price.high
                max_price_date = price.date
            if min_price is None or price.low < min_price:
                min_price = price.low
                min_price_date = price.date

        result['max_price_after'] = float(max_price) if max_price else None
        result['min_price_after'] = float(min_price) if min_price else None

        # Calculate percentage moves
        alert_price = Decimal(str(price_at_alert.close))

        if max_price:
            max_gain = ((max_price - alert_price) / alert_price) * 100
            result['max_gain_pct'] = float(round(max_gain, 2))
            result['days_to_breakout'] = (max_price_date - alert_date).days

        if min_price:
            max_loss = ((min_price - alert_price) / alert_price) * 100
            result['max_loss_pct'] = float(round(max_loss, 2))

        # Determine if breakout occurred
        if result['max_gain_pct'] and result['max_gain_pct'] >= float(self.breakout_threshold_pct):
            result['status'] = 'BREAKOUT'
            result['outcome_details'] = f"Price moved +{result['max_gain_pct']}% within {result['days_to_breakout']} days"
        else:
            result['status'] = 'NO_BREAKOUT'
            if result['max_loss_pct'] and result['max_loss_pct'] < -float(self.breakout_threshold_pct):
                result['outcome_details'] = f"Price dropped {result['max_loss_pct']}% (breakdown instead)"
            else:
                result['outcome_details'] = f"Price moved +{result['max_gain_pct'] or 0}% (below {self.breakout_threshold_pct}% threshold)"

        return result

    def analyze_consolidation_patterns(self, days_back: int = 90) -> dict:
        """
        Analyze historical consolidation patterns and their outcomes.

        Looks at all instances where stocks entered consolidation (3+ tight days)
        and checks what happened afterward.
        """
        cutoff_date = timezone.now().date() - timedelta(days=days_back)

        # Find all consolidation periods
        consolidations = ATRAnalysis.objects.filter(
            date__gte=cutoff_date,
            is_consolidating=True,
            consecutive_tight_days__gte=3
        ).select_related('stock').order_by('stock', 'date')

        # Group by stock and find consolidation start points
        patterns = []
        current_stock = None
        current_start = None

        for analysis in consolidations:
            if current_stock != analysis.stock_id:
                # New stock, start fresh
                current_stock = analysis.stock_id
                current_start = analysis
                patterns.append({
                    'stock': analysis.stock,
                    'start_date': analysis.date,
                    'start_analysis': analysis,
                    'tight_days': analysis.consecutive_tight_days,
                    'probability': analysis.breakout_probability,
                    'confidence_score': analysis.confidence_score,
                })
            elif analysis.consecutive_tight_days > patterns[-1]['tight_days']:
                # Continuing consolidation, update
                patterns[-1]['tight_days'] = analysis.consecutive_tight_days
                patterns[-1]['probability'] = analysis.breakout_probability
                patterns[-1]['confidence_score'] = analysis.confidence_score

        # Evaluate each pattern
        results = {
            'period_days': days_back,
            'total_patterns': len(patterns),
            'patterns': [],
            'by_probability': {
                'HIGH': {'total': 0, 'breakouts': 0, 'avg_gain': 0, 'gains': []},
                'MEDIUM': {'total': 0, 'breakouts': 0, 'avg_gain': 0, 'gains': []},
                'LOW': {'total': 0, 'breakouts': 0, 'avg_gain': 0, 'gains': []},
            },
            'by_tight_days': {},
            'summary': {
                'overall_accuracy': 0,
                'high_prob_accuracy': 0,
                'avg_days_to_breakout': 0,
            }
        }

        days_to_breakout_list = []

        for pattern in patterns:
            outcome = self._evaluate_pattern_outcome(pattern)
            results['patterns'].append(outcome)

            prob = pattern['probability']
            results['by_probability'][prob]['total'] += 1

            tight_days = str(pattern['tight_days'])
            if tight_days not in results['by_tight_days']:
                results['by_tight_days'][tight_days] = {
                    'total': 0, 'breakouts': 0, 'avg_gain': 0, 'gains': []
                }
            results['by_tight_days'][tight_days]['total'] += 1

            if outcome['had_breakout']:
                results['by_probability'][prob]['breakouts'] += 1
                results['by_tight_days'][tight_days]['breakouts'] += 1
                if outcome['max_gain_pct']:
                    results['by_probability'][prob]['gains'].append(outcome['max_gain_pct'])
                    results['by_tight_days'][tight_days]['gains'].append(outcome['max_gain_pct'])
                if outcome['days_to_max']:
                    days_to_breakout_list.append(outcome['days_to_max'])

        # Calculate summary stats
        for prob, data in results['by_probability'].items():
            if data['total'] > 0:
                data['accuracy'] = round((data['breakouts'] / data['total']) * 100, 1)
            else:
                data['accuracy'] = 0
            if data['gains']:
                data['avg_gain'] = round(sum(data['gains']) / len(data['gains']), 2)
            del data['gains']

        for days, data in results['by_tight_days'].items():
            if data['total'] > 0:
                data['accuracy'] = round((data['breakouts'] / data['total']) * 100, 1)
            else:
                data['accuracy'] = 0
            if data['gains']:
                data['avg_gain'] = round(sum(data['gains']) / len(data['gains']), 2)
            del data['gains']

        total_patterns = results['total_patterns']
        total_breakouts = sum(d['breakouts'] for d in results['by_probability'].values())

        if total_patterns > 0:
            results['summary']['overall_accuracy'] = round((total_breakouts / total_patterns) * 100, 1)

        high_prob = results['by_probability']['HIGH']
        if high_prob['total'] > 0:
            results['summary']['high_prob_accuracy'] = high_prob['accuracy']

        if days_to_breakout_list:
            results['summary']['avg_days_to_breakout'] = round(
                sum(days_to_breakout_list) / len(days_to_breakout_list), 1
            )

        return results

    def _evaluate_pattern_outcome(self, pattern: dict) -> dict:
        """Evaluate what happened after a consolidation pattern."""
        stock = pattern['stock']
        start_date = pattern['start_date']

        result = {
            'symbol': stock.symbol,
            'stock_name': stock.name,
            'start_date': start_date.isoformat(),
            'tight_days': pattern['tight_days'],
            'probability': pattern['probability'],
            'confidence_score': pattern['confidence_score'],
            'price_at_start': None,
            'max_price_after': None,
            'max_gain_pct': None,
            'days_to_max': None,
            'had_breakout': False,
        }

        # Get price at consolidation start
        start_price = PriceData.objects.filter(
            stock=stock,
            date=start_date
        ).first()

        if not start_price:
            return result

        result['price_at_start'] = float(start_price.close)

        # Look at next 10 trading days
        end_date = start_date + timedelta(days=14)
        future_prices = PriceData.objects.filter(
            stock=stock,
            date__gt=start_date,
            date__lte=end_date
        ).order_by('date')

        if not future_prices.exists():
            return result

        max_price = None
        max_date = None

        for price in future_prices:
            if max_price is None or price.high > max_price:
                max_price = price.high
                max_date = price.date

        if max_price:
            result['max_price_after'] = float(max_price)
            gain_pct = ((max_price - start_price.close) / start_price.close) * 100
            result['max_gain_pct'] = float(round(gain_pct, 2))
            result['days_to_max'] = (max_date - start_date).days
            result['had_breakout'] = result['max_gain_pct'] >= float(self.breakout_threshold_pct)

        return result

    def get_historical_day_analysis(self, date_str: str) -> dict:
        """
        Get a snapshot of what the system showed on a specific historical date.

        Useful for reviewing past recommendations.
        """
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return {'error': 'Invalid date format. Use YYYY-MM-DD'}

        analyses = ATRAnalysis.objects.filter(
            date=target_date
        ).select_related('stock').order_by('-breakout_probability', '-confidence_score')

        if not analyses.exists():
            return {
                'date': date_str,
                'error': 'No analysis data for this date',
                'stocks': []
            }

        stocks = []
        for analysis in analyses:
            # Get price data for that day
            price = PriceData.objects.filter(
                stock=analysis.stock,
                date=target_date
            ).first()

            # Get what happened in the following days
            future_prices = PriceData.objects.filter(
                stock=analysis.stock,
                date__gt=target_date
            ).order_by('date')[:5]

            future_data = []
            for fp in future_prices:
                if price:
                    change_pct = ((fp.close - price.close) / price.close) * 100
                else:
                    change_pct = 0
                future_data.append({
                    'date': fp.date.isoformat(),
                    'close': float(fp.close),
                    'change_pct': round(float(change_pct), 2)
                })

            stocks.append({
                'symbol': analysis.stock.symbol,
                'name': analysis.stock.name,
                'price': float(price.close) if price else None,
                'atr': float(analysis.current_atr),
                'daily_range': float(analysis.current_daily_range),
                'consecutive_tight_days': analysis.consecutive_tight_days,
                'is_consolidating': analysis.is_consolidating,
                'volume_spike': analysis.volume_spike_detected,
                'breakout_probability': analysis.breakout_probability,
                'confidence_score': analysis.confidence_score,
                'future_prices': future_data,
                'max_future_gain': max([f['change_pct'] for f in future_data], default=0) if future_data else 0,
            })

        return {
            'date': date_str,
            'total_stocks': len(stocks),
            'consolidating': sum(1 for s in stocks if s['is_consolidating']),
            'high_probability': sum(1 for s in stocks if s['breakout_probability'] == 'HIGH'),
            'stocks': stocks
        }

    def get_available_dates(self) -> list:
        """Get list of dates that have analysis data."""
        dates = ATRAnalysis.objects.values_list('date', flat=True).distinct().order_by('-date')[:90]
        return [d.isoformat() for d in dates]
