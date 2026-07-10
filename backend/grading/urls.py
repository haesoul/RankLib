from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from user.views import (
    RegisterView, VerifyEmailView, ResendVerificationEmailView,
    LogoutView, CurrentUserView, ChangePasswordView,
    PasswordResetRequestView, PasswordResetConfirmView, delete_account, CustomLoginView
)
from grading.views import (
    UserWorkspaceViewSet, GlobalClassViewSet, RankTypeViewSet, TagViewSet,
    ClassOfGradingViewSet, CategoryViewSet, SubCategoryViewSet,
    GradeObjectViewSet, MediaItemViewSet, NoteViewSet,
    CategoryOfObjectViewSet, SubCategoryOfObjectViewSet
)
from leaderboard.views import (
    GlobalObjectViewSet, GlobalLeaderboardViewSet,
    GlobalCategoryLeaderboardViewSet, TrendingObjectViewSet,
    UserObjectContributionViewSet, UserRatingHistoryViewSet,
    PopularTagViewSet, user_statistics, compare_with_global
)

# Создание роутеров
router = DefaultRouter()

# User & Workspace
router.register(r'workspaces', UserWorkspaceViewSet, basename='workspace')

# Global
router.register(r'global/classes', GlobalClassViewSet, basename='global-class')
router.register(r'global/objects', GlobalObjectViewSet, basename='global-object')
router.register(r'global/leaderboard', GlobalLeaderboardViewSet, basename='global-leaderboard')
router.register(r'global/category-leaderboard', GlobalCategoryLeaderboardViewSet, basename='category-leaderboard')
router.register(r'global/trending', TrendingObjectViewSet, basename='trending')
router.register(r'global/popular-tags', PopularTagViewSet, basename='popular-tag')

# User data
router.register(r'rank-types', RankTypeViewSet, basename='rank-type')
router.register(r'tags', TagViewSet, basename='tag')
router.register(r'classes', ClassOfGradingViewSet, basename='class')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'subcategories', SubCategoryViewSet, basename='subcategory')
router.register(r'objects', GradeObjectViewSet, basename='object')
router.register(r'media', MediaItemViewSet, basename='media')
router.register(r'notes', NoteViewSet, basename='note')
router.register(r'category-ratings', CategoryOfObjectViewSet, basename='category-rating')
router.register(r'subcategory-ratings', SubCategoryOfObjectViewSet, basename='subcategory-rating')

# Leaderboard
router.register(r'contributions', UserObjectContributionViewSet, basename='contribution')
router.register(r'rating-history', UserRatingHistoryViewSet, basename='rating-history')

app_name = "grading"

urlpatterns = [

    
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', CustomLoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),

    path('auth/verify-email/', VerifyEmailView.as_view(), name='verify-email'),
    path('auth/resend-verification/', ResendVerificationEmailView.as_view(), name='resend-verify'),

    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/token/verify/', TokenVerifyView.as_view(), name='token_verify'),


    path('auth/password/change/', ChangePasswordView.as_view(), name='password-change'),
    path('auth/password/reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('auth/password/reset-confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    
    path('auth/me/', CurrentUserView.as_view(), name='current-user'),
    path('auth/delete-account/', delete_account, name='delete-account'),
    
    path('statistics/user/', user_statistics, name='user-statistics'),
    path('statistics/compare/<uuid:object_id>/', compare_with_global, name='compare-with-global'),
    
    path('', include(router.urls)),
]

