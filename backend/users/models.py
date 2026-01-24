"""
User models for Stock Breakout Alert System.
Extends Django's built-in User with profile and preferences.
"""

from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    """Extended user profile with app-specific settings."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile'
    )

    # Display preferences
    display_name = models.CharField(max_length=50, blank=True)
    theme = models.CharField(
        max_length=10,
        choices=[('light', 'Light'), ('dark', 'Dark')],
        default='light'
    )

    # Notification preferences
    email_alerts = models.BooleanField(default=True)
    alert_on_consolidation = models.BooleanField(default=True)
    alert_on_volume_spike = models.BooleanField(default=True)
    alert_on_breakout = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s profile"

    @property
    def name(self):
        return self.display_name or self.user.username


class UserWatchlist(models.Model):
    """User's custom watchlist with tagged stocks."""

    TAG_CHOICES = [
        ('WATCHING', 'Watching'),
        ('SETTING_UP', 'Setting Up'),
        ('BREAKING_OUT', 'Breaking Out'),
        ('POSITION', 'Have Position'),
        ('AVOID', 'Avoid'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='watchlist_items'
    )
    stock = models.ForeignKey(
        'stocks.Stock',
        on_delete=models.CASCADE,
        related_name='watchlist_entries'
    )
    tag = models.CharField(
        max_length=20,
        choices=TAG_CHOICES,
        default='WATCHING'
    )
    notes = models.TextField(blank=True)

    # Custom alert thresholds (override defaults)
    custom_tight_days_threshold = models.IntegerField(null=True, blank=True)
    custom_volume_spike_threshold = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'stock']
        ordering = ['tag', 'stock__symbol']

    def __str__(self):
        return f"{self.user.username} - {self.stock.symbol} ({self.tag})"


# Signal to create UserProfile when User is created
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()
