"""
API Views for user management.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from stocks.models import Stock
from .models import UserProfile, UserWatchlist
from .serializers import (
    UserSerializer,
    UserProfileSerializer,
    UserWatchlistSerializer,
    WatchlistCreateSerializer,
    LoginSerializer,
)


@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    """Handle user login."""

    permission_classes = [AllowAny]
    authentication_classes = []  # No auth required for login

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate(
            request,
            username=serializer.validated_data['username'],
            password=serializer.validated_data['password']
        )

        if user is not None:
            login(request, user)
            return Response({
                'user': UserSerializer(user).data,
                'message': 'Login successful'
            })
        else:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class LogoutView(APIView):
    """Handle user logout."""

    def post(self, request):
        logout(request)
        return Response({'message': 'Logged out successfully'})


class CurrentUserView(APIView):
    """Get current authenticated user."""

    permission_classes = [AllowAny]

    def get(self, request):
        if request.user.is_authenticated:
            return Response({
                'authenticated': True,
                'user': UserSerializer(request.user).data
            })
        return Response({
            'authenticated': False,
            'user': None
        })


class UserProfileView(APIView):
    """Manage user profile."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = request.user.profile
        return Response(UserProfileSerializer(profile).data)

    def patch(self, request):
        profile = request.user.profile
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class WatchlistViewSet(viewsets.ModelViewSet):
    """Manage user's watchlist."""

    permission_classes = [IsAuthenticated]
    serializer_class = UserWatchlistSerializer

    def get_queryset(self):
        return UserWatchlist.objects.filter(
            user=self.request.user
        ).select_related('stock')

    def create(self, request):
        serializer = WatchlistCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        symbol = serializer.validated_data['symbol'].upper()

        try:
            stock = Stock.objects.get(symbol=symbol)
        except Stock.DoesNotExist:
            return Response(
                {'error': f'Stock {symbol} not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        watchlist_item, created = UserWatchlist.objects.update_or_create(
            user=request.user,
            stock=stock,
            defaults={
                'tag': serializer.validated_data['tag'],
                'notes': serializer.validated_data.get('notes', ''),
            }
        )

        return Response(
            UserWatchlistSerializer(watchlist_item).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'])
    def by_tag(self, request):
        """Get watchlist items grouped by tag."""
        items = self.get_queryset()
        grouped = {}

        for item in items:
            tag = item.tag
            if tag not in grouped:
                grouped[tag] = []
            grouped[tag].append(UserWatchlistSerializer(item).data)

        return Response(grouped)

    @action(detail=True, methods=['post'])
    def update_tag(self, request, pk=None):
        """Update tag for a watchlist item."""
        item = self.get_object()
        new_tag = request.data.get('tag')

        if new_tag not in dict(UserWatchlist.TAG_CHOICES):
            return Response(
                {'error': 'Invalid tag'},
                status=status.HTTP_400_BAD_REQUEST
            )

        item.tag = new_tag
        item.save()
        return Response(UserWatchlistSerializer(item).data)
