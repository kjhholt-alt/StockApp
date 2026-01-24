"""
Alert generation and email notification service.
"""

import logging
from datetime import datetime
from typing import List, Optional

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone

from stocks.models import Stock, ATRAnalysis, Alert

logger = logging.getLogger(__name__)


class AlertService:
    """Service for generating and sending alerts."""

    def __init__(self):
        self.recipient_email = getattr(settings, 'ALERT_RECIPIENT_EMAIL', '')

    def process_analysis(self, analysis: ATRAnalysis) -> Optional[Alert]:
        """
        Process an ATR analysis and generate appropriate alert.

        Args:
            analysis: ATRAnalysis instance to process

        Returns:
            Alert instance if created, None otherwise
        """
        stock = analysis.stock

        # Determine alert type based on analysis
        alert_type = self._determine_alert_type(analysis)

        if not alert_type:
            return None

        # Check if we already have this alert type for today
        existing = Alert.objects.filter(
            stock=stock,
            alert_type=alert_type,
            created_at__date=analysis.date
        ).exists()

        if existing:
            logger.debug(f"Alert {alert_type} already exists for {stock.symbol} on {analysis.date}")
            return None

        # Generate alert message
        message = self._generate_message(analysis, alert_type)

        # Create alert
        alert = Alert.objects.create(
            stock=stock,
            alert_type=alert_type,
            message=message,
            analysis=analysis,
        )

        logger.info(f"Created {alert_type} alert for {stock.symbol}")

        # Create in-app notification
        self._create_notification(alert)

        return alert

    def process_all_analyses(self) -> List[Alert]:
        """
        Process all recent analyses and generate alerts.

        Returns:
            List of created alerts
        """
        from django.db.models import Max

        alerts = []

        # Get latest analysis for each stock
        latest_dates = ATRAnalysis.objects.values('stock').annotate(
            latest_date=Max('date')
        )

        for item in latest_dates:
            analysis = ATRAnalysis.objects.filter(
                stock_id=item['stock'],
                date=item['latest_date']
            ).first()

            if analysis:
                alert = self.process_analysis(analysis)
                if alert:
                    alerts.append(alert)

        return alerts

    def _determine_alert_type(self, analysis: ATRAnalysis) -> Optional[str]:
        """Determine which alert type (if any) to generate."""
        # HIGH probability - breakout ready
        if analysis.breakout_probability == 'HIGH':
            return 'BREAKOUT_READY'

        # Volume spike during consolidation
        if analysis.volume_spike_detected and analysis.is_consolidating:
            return 'VOLUME_SPIKE'

        # Just started consolidating (exactly at threshold)
        if analysis.consecutive_tight_days == getattr(settings, 'CONSOLIDATION_THRESHOLD_DAYS', 3):
            return 'CONSOLIDATION_START'

        return None

    def _generate_message(self, analysis: ATRAnalysis, alert_type: str) -> str:
        """Generate alert message based on type."""
        stock = analysis.stock
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
                f"This could indicate an imminent breakout. "
                f"Current price: ${price:.2f}. ATR: ${analysis.current_atr:.2f}."
            ),
            'BREAKOUT_READY': (
                f"BREAKOUT ALERT: {stock.symbol} ({stock.name}) is showing HIGH breakout probability! "
                f"{analysis.consecutive_tight_days} tight days with volume spike detected. "
                f"Volume is {analysis.volume_ratio:.1f}x average. "
                f"Current price: ${price:.2f}. ATR: ${analysis.current_atr:.2f}. "
                f"Consider setting alerts for a move above recent highs."
            ),
            'BREAKOUT_OCCURRED': (
                f"BREAKOUT: {stock.symbol} ({stock.name}) has broken out of consolidation! "
                f"Current price: ${price:.2f}."
            ),
        }

        return messages.get(alert_type, f"Alert for {stock.symbol}")

    def _create_notification(self, alert: Alert):
        """Create in-app notification for alert."""
        from notifications.models import Notification

        notification_types = {
            'CONSOLIDATION_START': 'INFO',
            'VOLUME_SPIKE': 'WARNING',
            'BREAKOUT_READY': 'ALERT',
            'BREAKOUT_OCCURRED': 'SUCCESS',
        }

        titles = {
            'CONSOLIDATION_START': f"{alert.stock.symbol} Consolidating",
            'VOLUME_SPIKE': f"{alert.stock.symbol} Volume Spike",
            'BREAKOUT_READY': f"{alert.stock.symbol} Breakout Ready!",
            'BREAKOUT_OCCURRED': f"{alert.stock.symbol} Breakout!",
        }

        Notification.objects.create(
            title=titles.get(alert.alert_type, f"{alert.stock.symbol} Alert"),
            message=alert.message,
            notification_type=notification_types.get(alert.alert_type, 'INFO'),
            stock_symbol=alert.stock.symbol,
        )

    def send_pending_emails(self, batch_size: int = 50) -> int:
        """
        Send email notifications for unsent alerts.

        Args:
            batch_size: Maximum number of emails to send

        Returns:
            Number of emails sent
        """
        if not self.recipient_email:
            logger.warning("No recipient email configured")
            return 0

        unsent_alerts = Alert.objects.filter(
            email_sent=False
        ).select_related('stock')[:batch_size]

        sent_count = 0

        for alert in unsent_alerts:
            try:
                self._send_alert_email(alert)
                alert.email_sent = True
                alert.email_sent_at = timezone.now()
                alert.save()
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send email for alert {alert.id}: {e}")

        logger.info(f"Sent {sent_count} alert emails")
        return sent_count

    def _send_alert_email(self, alert: Alert):
        """Send email for a single alert."""
        subject_prefixes = {
            'CONSOLIDATION_START': '[Stock Watch]',
            'VOLUME_SPIKE': '[Stock Watch - VOLUME]',
            'BREAKOUT_READY': '[Stock Watch - BREAKOUT]',
            'BREAKOUT_OCCURRED': '[Stock Watch - BREAKOUT]',
        }

        subject = f"{subject_prefixes.get(alert.alert_type, '[Stock Watch]')} {alert.stock.symbol} - {alert.get_alert_type_display()}"

        # Plain text email
        message = f"""
Stock Alert: {alert.stock.symbol}
Type: {alert.get_alert_type_display()}
Time: {alert.created_at.strftime('%Y-%m-%d %H:%M %Z')}

{alert.message}

---
Stock Breakout Alert System
"""

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[self.recipient_email],
            fail_silently=False,
        )

        logger.info(f"Sent email for {alert.stock.symbol} - {alert.alert_type}")

    def get_unread_alerts(self, stock: Optional[Stock] = None) -> List[Alert]:
        """Get unread alerts, optionally filtered by stock."""
        queryset = Alert.objects.filter(is_read=False)
        if stock:
            queryset = queryset.filter(stock=stock)
        return list(queryset.select_related('stock'))

    def mark_as_read(self, alert_ids: List[int]) -> int:
        """Mark alerts as read."""
        return Alert.objects.filter(id__in=alert_ids).update(is_read=True)

    def get_alert_summary(self) -> dict:
        """Get summary of alerts."""
        from django.db.models import Count

        summary = Alert.objects.aggregate(
            total=Count('id'),
            unread=Count('id', filter=Alert.objects.filter(is_read=False).query.where),
        )

        by_type = Alert.objects.values('alert_type').annotate(
            count=Count('id')
        )

        return {
            'total': Alert.objects.count(),
            'unread': Alert.objects.filter(is_read=False).count(),
            'by_type': {item['alert_type']: item['count'] for item in by_type},
        }
