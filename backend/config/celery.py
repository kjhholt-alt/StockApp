"""
Celery configuration for Stock Breakout Alert System.
"""

import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('stockapp')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Celery Beat Schedule
app.conf.beat_schedule = {
    # Fetch daily prices at 6 PM ET (after market close)
    'fetch-daily-prices': {
        'task': 'stocks.tasks.fetch_daily_prices',
        'schedule': crontab(hour=18, minute=0),
    },
    # Run consolidation analysis after price fetch (6:15 PM ET)
    'run-consolidation-analysis': {
        'task': 'stocks.tasks.run_consolidation_analysis',
        'schedule': crontab(hour=18, minute=15),
    },
    # Send alert emails every 30 minutes during market hours
    'send-alert-emails': {
        'task': 'stocks.tasks.send_alert_emails',
        'schedule': crontab(minute='*/30'),
    },
}
