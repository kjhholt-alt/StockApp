"""
API Views for notifications.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    """ViewSet for Notification model."""

    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer

    def get_queryset(self):
        queryset = Notification.objects.all()

        # Filter by read status
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')

        # Filter by type
        notification_type = self.request.query_params.get('type')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type.upper())

        # Filter by stock symbol
        symbol = self.request.query_params.get('symbol')
        if symbol:
            queryset = queryset.filter(stock_symbol=symbol.upper())

        return queryset

    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        """Mark a notification as read."""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'marked as read'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read."""
        count = Notification.objects.filter(is_read=False).update(is_read=True)
        return Response({'marked_read': count})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications."""
        count = Notification.objects.filter(is_read=False).count()
        return Response({'unread_count': count})

    @action(detail=False, methods=['delete'])
    def clear_read(self, request):
        """Delete all read notifications."""
        count = Notification.objects.filter(is_read=True).delete()[0]
        return Response({'deleted': count})
