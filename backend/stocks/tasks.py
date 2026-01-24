"""
Celery tasks for Stock Breakout Alert System.
"""

import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def fetch_daily_prices(self):
    """
    Fetch daily price data for all tracked stocks.

    Runs at 6 PM ET (after market close).
    """
    from stocks.services import DataFetcher

    logger.info("Starting daily price fetch...")

    try:
        fetcher = DataFetcher()
        results = fetcher.fetch_latest_prices()

        success_count = sum(1 for r in results.values() if r.get('success'))
        logger.info(f"Price fetch complete: {success_count}/{len(results)} successful")

        return results

    except Exception as e:
        logger.error(f"Price fetch failed: {e}")
        raise self.retry(exc=e, countdown=60)


@shared_task(bind=True, max_retries=3)
def run_consolidation_analysis(self):
    """
    Run ATR consolidation analysis for all stocks.

    Runs at 6:15 PM ET (after price fetch).
    """
    from stocks.services import ATRCalculator, AlertService

    logger.info("Starting consolidation analysis...")

    try:
        # Run analysis
        calculator = ATRCalculator()
        results = calculator.analyze_all_stocks()

        success_count = sum(1 for r in results.values() if r.get('success'))
        logger.info(f"Analysis complete: {success_count}/{len(results)} successful")

        # Generate alerts
        alert_service = AlertService()
        alerts = alert_service.process_all_analyses()
        logger.info(f"Generated {len(alerts)} new alerts")

        return {
            'analysis': results,
            'alerts_created': len(alerts)
        }

    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise self.retry(exc=e, countdown=60)


@shared_task
def send_alert_emails():
    """
    Send pending alert emails.

    Runs every 30 minutes.
    """
    from stocks.services import AlertService

    logger.info("Checking for unsent alert emails...")

    try:
        service = AlertService()
        sent_count = service.send_pending_emails(batch_size=50)

        logger.info(f"Sent {sent_count} alert emails")
        return {'emails_sent': sent_count}

    except Exception as e:
        logger.error(f"Email sending failed: {e}")
        return {'error': str(e)}


@shared_task
def fetch_single_stock(symbol: str):
    """
    Fetch price data for a single stock.

    Can be triggered manually or via API.
    """
    from stocks.services import DataFetcher

    logger.info(f"Fetching data for {symbol}...")

    try:
        fetcher = DataFetcher()
        count = fetcher.fetch_stock_data(symbol, days=30)

        logger.info(f"Fetched {count} records for {symbol}")
        return {'symbol': symbol, 'records': count}

    except Exception as e:
        logger.error(f"Fetch failed for {symbol}: {e}")
        return {'symbol': symbol, 'error': str(e)}


@shared_task
def analyze_single_stock(symbol: str):
    """
    Run analysis for a single stock.

    Can be triggered manually or via API.
    """
    from stocks.models import Stock
    from stocks.services import ATRCalculator, AlertService

    logger.info(f"Analyzing {symbol}...")

    try:
        stock = Stock.objects.get(symbol=symbol)
        calculator = ATRCalculator()
        analysis = calculator.analyze_stock(stock)

        if analysis:
            # Check for alerts
            alert_service = AlertService()
            alert = alert_service.process_analysis(analysis)

            return {
                'symbol': symbol,
                'is_consolidating': analysis.is_consolidating,
                'breakout_probability': analysis.breakout_probability,
                'alert_created': alert is not None
            }
        else:
            return {'symbol': symbol, 'error': 'Insufficient data'}

    except Stock.DoesNotExist:
        logger.error(f"Stock not found: {symbol}")
        return {'symbol': symbol, 'error': 'Stock not found'}
    except Exception as e:
        logger.error(f"Analysis failed for {symbol}: {e}")
        return {'symbol': symbol, 'error': str(e)}


@shared_task
def cleanup_old_data(days_to_keep: int = 365):
    """
    Clean up old price data and analyses.

    Keeps the most recent N days of data.
    """
    from datetime import date, timedelta
    from stocks.models import PriceData, ATRAnalysis

    cutoff_date = date.today() - timedelta(days=days_to_keep)

    logger.info(f"Cleaning up data older than {cutoff_date}...")

    price_deleted = PriceData.objects.filter(date__lt=cutoff_date).delete()[0]
    analysis_deleted = ATRAnalysis.objects.filter(date__lt=cutoff_date).delete()[0]

    logger.info(f"Deleted {price_deleted} price records, {analysis_deleted} analysis records")

    return {
        'price_records_deleted': price_deleted,
        'analysis_records_deleted': analysis_deleted
    }
