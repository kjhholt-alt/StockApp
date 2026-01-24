"""
URL configuration for users app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    LoginView,
    LogoutView,
    CurrentUserView,
    UserProfileView,
    WatchlistViewSet,
)

router = DefaultRouter()
router.register(r'watchlist', WatchlistViewSet, basename='watchlist')

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', CurrentUserView.as_view(), name='current-user'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('', include(router.urls)),
]
