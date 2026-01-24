"""
Notification models for in-app notifications.
"""

from django.db import models


class Notification(models.Model):
    """In-app notification for the dashboard."""

    NOTIFICATION_TYPE_CHOICES = [
        ('INFO', 'Information'),
        ('WARNING', 'Warning'),
        ('SUCCESS', 'Success'),
        ('ALERT', 'Alert'),
    ]

    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=10,
        choices=NOTIFICATION_TYPE_CHOICES,
        default='INFO'
    )

    # Link to related stock (optional)
    stock_symbol = models.CharField(max_length=10, null=True, blank=True)

    # Status
    is_read = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.notification_type}: {self.title}"
