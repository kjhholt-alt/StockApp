"""
Serializers for User models.
"""

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, UserWatchlist


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for UserProfile."""

    class Meta:
        model = UserProfile
        fields = [
            'display_name', 'theme', 'email_alerts',
            'alert_on_consolidation', 'alert_on_volume_spike',
            'alert_on_breakout'
        ]


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User with profile."""

    profile = UserProfileSerializer(read_only=True)
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'name', 'profile']
        read_only_fields = ['id', 'username']

    def get_name(self, obj):
        if hasattr(obj, 'profile') and obj.profile.display_name:
            return obj.profile.display_name
        return obj.username


class UserWatchlistSerializer(serializers.ModelSerializer):
    """Serializer for UserWatchlist."""

    symbol = serializers.CharField(source='stock.symbol', read_only=True)
    stock_name = serializers.CharField(source='stock.name', read_only=True)
    tag_display = serializers.CharField(source='get_tag_display', read_only=True)

    class Meta:
        model = UserWatchlist
        fields = [
            'id', 'symbol', 'stock_name', 'tag', 'tag_display',
            'notes', 'custom_tight_days_threshold',
            'custom_volume_spike_threshold', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class WatchlistCreateSerializer(serializers.Serializer):
    """Serializer for creating watchlist entries."""

    symbol = serializers.CharField(max_length=10)
    tag = serializers.ChoiceField(choices=UserWatchlist.TAG_CHOICES, default='WATCHING')
    notes = serializers.CharField(required=False, allow_blank=True, default='')


class LoginSerializer(serializers.Serializer):
    """Serializer for login."""

    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
