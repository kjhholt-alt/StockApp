"""
Data models for Stock Breakout Alert System.
"""

from django.db import models


class Stock(models.Model):
    """Represents a tracked stock or index."""

    STOCK_TYPE_CHOICES = [
        ('MAG7', 'Magnificent 7'),
        ('INDEX', 'Market Index'),
    ]

    symbol = models.CharField(max_length=10, unique=True, db_index=True)
    name = models.CharField(max_length=100)
    stock_type = models.CharField(max_length=10, choices=STOCK_TYPE_CHOICES)
    is_active = models.BooleanField(default=True)

    # Earnings calendar
    next_earnings_date = models.DateField(null=True, blank=True)
    earnings_time = models.CharField(
        max_length=10,
        choices=[('BMO', 'Before Market Open'), ('AMC', 'After Market Close'), ('TBD', 'TBD')],
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['symbol']

    def __str__(self):
        return f"{self.symbol} - {self.name}"


class PriceData(models.Model):
    """Daily OHLCV price data with calculated ATR values."""

    stock = models.ForeignKey(
        Stock,
        on_delete=models.CASCADE,
        related_name='price_data'
    )
    date = models.DateField(db_index=True)
    open = models.DecimalField(max_digits=12, decimal_places=4)
    high = models.DecimalField(max_digits=12, decimal_places=4)
    low = models.DecimalField(max_digits=12, decimal_places=4)
    close = models.DecimalField(max_digits=12, decimal_places=4)
    volume = models.BigIntegerField()

    # Calculated fields
    true_range = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        null=True,
        blank=True
    )
    atr_14 = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        null=True,
        blank=True
    )
    daily_range = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="High - Low for the day"
    )

    class Meta:
        ordering = ['-date']
        unique_together = ['stock', 'date']
        indexes = [
            models.Index(fields=['stock', 'date']),
        ]

    def __str__(self):
        return f"{self.stock.symbol} - {self.date}"

    def save(self, *args, **kwargs):
        # Auto-calculate daily range
        if self.high and self.low:
            self.daily_range = self.high - self.low
        super().save(*args, **kwargs)


class ATRAnalysis(models.Model):
    """ATR-based consolidation analysis results."""

    PROBABILITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
    ]

    stock = models.ForeignKey(
        Stock,
        on_delete=models.CASCADE,
        related_name='atr_analyses'
    )
    date = models.DateField(db_index=True)

    # Analysis metrics
    current_atr = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        help_text="Current 14-day ATR"
    )
    current_daily_range = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        help_text="Today's high-low range"
    )
    consecutive_tight_days = models.IntegerField(
        default=0,
        help_text="Days with daily range at or below ATR"
    )
    avg_volume_20d = models.BigIntegerField(
        null=True,
        blank=True,
        help_text="20-day average volume"
    )
    current_volume = models.BigIntegerField(
        null=True,
        blank=True
    )
    volume_ratio = models.DecimalField(
        max_digits=8,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="Current volume / 20-day average"
    )

    # Status flags
    is_consolidating = models.BooleanField(
        default=False,
        help_text="True if 3+ consecutive tight days"
    )
    volume_spike_detected = models.BooleanField(
        default=False,
        help_text="True if volume > 1.5x average during consolidation"
    )
    breakout_probability = models.CharField(
        max_length=10,
        choices=PROBABILITY_CHOICES,
        default='LOW'
    )

    # Confidence score (0-100) - composite of multiple factors
    confidence_score = models.IntegerField(
        default=0,
        help_text="0-100 composite score: tightness + volume + days"
    )

    # Range tightness (how far below ATR)
    range_tightness_pct = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="How much below ATR the daily range is (%)"
    )

    # Price context
    price_at_analysis = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        help_text="Closing price when analysis was run"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']
        unique_together = ['stock', 'date']
        verbose_name_plural = 'ATR Analyses'

    def __str__(self):
        return f"{self.stock.symbol} - {self.date} - {self.breakout_probability}"


class Alert(models.Model):
    """Alerts generated from consolidation analysis."""

    ALERT_TYPE_CHOICES = [
        ('CONSOLIDATION_START', 'Consolidation Started'),
        ('VOLUME_SPIKE', 'Volume Spike Detected'),
        ('BREAKOUT_READY', 'Breakout Ready'),
        ('BREAKOUT_OCCURRED', 'Breakout Occurred'),
    ]

    stock = models.ForeignKey(
        Stock,
        on_delete=models.CASCADE,
        related_name='alerts'
    )
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPE_CHOICES)
    message = models.TextField()

    # Related analysis
    analysis = models.ForeignKey(
        ATRAnalysis,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alerts'
    )

    # Status
    is_read = models.BooleanField(default=False)
    email_sent = models.BooleanField(default=False)
    email_sent_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['is_read', 'created_at']),
            models.Index(fields=['email_sent']),
        ]

    def __str__(self):
        return f"{self.stock.symbol} - {self.alert_type} - {self.created_at}"
