from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Avg, Count, Q, F
from django.db import transaction
from django.utils import timezone
from datetime import timedelta

from leaderboard.models import (
    GlobalObject, GlobalLeaderboard, UserObjectContribution,
    GlobalCategoryLeaderboard, TrendingObject, UserRatingHistory, PopularTag
)
from leaderboard.serializers import (
    GlobalObjectSerializer, GlobalLeaderboardSerializer,
    GlobalCategoryLeaderboardSerializer, TrendingObjectSerializer,
    UserObjectContributionSerializer, UserRatingHistorySerializer,
    PopularTagSerializer, LeaderboardStatsSerializer, CategoryStatsSerializer
)
from grading.models import GradeObject, GlobalClass, UserWorkspace


class GlobalObjectViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для глобальных объектов (только чтение)"""
    
    queryset = GlobalObject.objects.all()
    serializer_class = GlobalObjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'canonical_name']
    ordering_fields = ['average_rating', 'total_ratings', 'created_at']
    ordering = ['-average_rating']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Фильтрация по глобальному классу
        global_class_id = self.request.query_params.get('global_class')
        if global_class_id:
            queryset = queryset.filter(global_class_id=global_class_id)
        
        # Фильтрация по внешнему ID
        external_id = self.request.query_params.get('external_id')
        if external_id:
            queryset = queryset.filter(external_ids__has_key=external_id)
        
        return queryset


class GlobalLeaderboardViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для глобального рейтинга"""
    
    queryset = GlobalLeaderboard.objects.all()
    serializer_class = GlobalLeaderboardSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering = ['-rank_value']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Фильтрация по периоду
        period = self.request.query_params.get('period', 'all-time')
        queryset = queryset.filter(period=period)
        
        # Фильтрация по глобальному классу
        global_class_id = self.request.query_params.get('global_class')
        if global_class_id:
            queryset = queryset.filter(global_object__global_class_id=global_class_id)
        
        return queryset.select_related('global_object', 'global_object__global_class')
    
    @action(detail=False, methods=['get'])
    def top(self, request):
        """Топ-100 объектов"""
        queryset = self.filter_queryset(self.get_queryset())[:100]
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Общая статистика рейтинга"""
        period = request.query_params.get('period', 'all-time')
        global_class_id = request.query_params.get('global_class')
        
        queryset = GlobalLeaderboard.objects.filter(period=period)
        if global_class_id:
            queryset = queryset.filter(global_object__global_class_id=global_class_id)
        
        stats = {
            'total_objects': queryset.count(),
            'total_users': queryset.aggregate(total=Count('total_users'))['total'] or 0,
            'average_rating': queryset.aggregate(avg=Avg('rank_value'))['avg'],
            'top_rated': GlobalLeaderboardSerializer(
                queryset.order_by('-rank_value')[:10],
                many=True
            ).data,
            'trending': []
        }
        
        return Response(stats)


class GlobalCategoryLeaderboardViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для категорийного рейтинга"""
    
    queryset = GlobalCategoryLeaderboard.objects.all()
    serializer_class = GlobalCategoryLeaderboardSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering = ['-average_rank']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Фильтрация
        period = self.request.query_params.get('period', 'all-time')
        category_name = self.request.query_params.get('category')
        global_object_id = self.request.query_params.get('global_object')
        
        queryset = queryset.filter(period=period)
        
        if category_name:
            queryset = queryset.filter(canonical_category_name__icontains=category_name.lower())
        
        if global_object_id:
            queryset = queryset.filter(global_object_id=global_object_id)
        
        return queryset.select_related('global_object')


class TrendingObjectViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для трендовых объектов"""
    
    queryset = TrendingObject.objects.all()
    serializer_class = TrendingObjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering = ['-trending_score']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Фильтрация по периоду
        period = self.request.query_params.get('period', '7days')
        queryset = queryset.filter(period=period)
        
        # Фильтрация по глобальному классу
        global_class_id = self.request.query_params.get('global_class')
        if global_class_id:
            queryset = queryset.filter(global_object__global_class_id=global_class_id)
        
        return queryset.select_related('global_object')[:50]


class UserObjectContributionViewSet(viewsets.ModelViewSet):
    """ViewSet для вкладов пользователей"""
    
    serializer_class = UserObjectContributionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        workspace = UserWorkspace.objects.get(user=self.request.user)
        return UserObjectContribution.objects.filter(
            grade_object__class_of_grading__workspace=workspace
        ).select_related('grade_object', 'global_object')
    
    @action(detail=False, methods=['post'])
    def sync_object(self, request):
        """Синхронизация объекта с глобальным рейтингом"""
        object_id = request.data.get('object_id')
        is_public = request.data.get('is_public', True)
        
        try:
            workspace = UserWorkspace.objects.get(user=request.user)
            grade_object = GradeObject.objects.get(
                id=object_id,
                class_of_grading__workspace=workspace
            )
            
            # Создание/обновление глобального объекта
            global_object = self._get_or_create_global_object(grade_object)
            
            # Создание/обновление вклада
            contribution, created = UserObjectContribution.objects.update_or_create(
                grade_object=grade_object,
                defaults={
                    'global_object': global_object,
                    'is_public': is_public,
                    'last_synced_rank': grade_object.overall_rank
                }
            )
            
            # Обновление глобальной статистики
            if is_public:
                self._update_global_statistics(global_object)
            
            return Response({
                'status': 'synced',
                'contribution': UserObjectContributionSerializer(contribution).data
            })
            
        except GradeObject.DoesNotExist:
            return Response(
                {'error': 'Object not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def _get_or_create_global_object(self, grade_object):
        """Получение или создание глобального объекта"""
        canonical_name = grade_object.name.lower().strip()
        
        global_class = grade_object.class_of_grading.global_class
        
        if not global_class:
            # Создание глобального класса если не существует
            canonical_class_name = grade_object.class_of_grading.name.lower().strip()
            global_class, _ = GlobalClass.objects.get_or_create(
                canonical_name=canonical_class_name,
                defaults={'name': grade_object.class_of_grading.name}
            )
            
            grade_object.class_of_grading.global_class = global_class
            grade_object.class_of_grading.save()
        
        global_object, _ = GlobalObject.objects.get_or_create(
            global_class=global_class,
            canonical_name=canonical_name,
            defaults={'name': grade_object.name}
        )
        
        return global_object
    
    def _update_global_statistics(self, global_object):
        """Обновление глобальной статистики"""
        contributions = UserObjectContribution.objects.filter(
            global_object=global_object,
            is_public=True
        ).select_related('grade_object')
        
        ratings = [c.grade_object.overall_rank for c in contributions if c.grade_object.overall_rank]
        
        if ratings:
            global_object.total_ratings = len(ratings)
            global_object.average_rating = sum(ratings) / len(ratings)
            global_object.save()
            
            # Обновление глобального рейтинга
            GlobalLeaderboard.objects.update_or_create(
                global_object=global_object,
                period='all-time',
                defaults={
                    'rank_value': global_object.average_rating,
                    'total_users': contributions.count()
                }
            )


class UserRatingHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для истории оценок пользователя"""
    
    serializer_class = UserRatingHistorySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering = ['-changed_at']
    
    def get_queryset(self):
        workspace = UserWorkspace.objects.get(user=self.request.user)
        queryset = UserRatingHistory.objects.filter(
            grade_object__class_of_grading__workspace=workspace
        ).select_related('grade_object')
        
        # Фильтрация по объекту
        object_id = self.request.query_params.get('grade_object')
        if object_id:
            queryset = queryset.filter(grade_object_id=object_id)
        
        # Фильтрация по периоду
        days = self.request.query_params.get('days')
        if days:
            since = timezone.now() - timedelta(days=int(days))
            queryset = queryset.filter(changed_at__gte=since)
        
        return queryset


class PopularTagViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для популярных тегов"""
    
    queryset = PopularTag.objects.all()
    serializer_class = PopularTagSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering = ['-usage_count']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Фильтрация по глобальному классу
        global_class_id = self.request.query_params.get('global_class')
        if global_class_id:
            queryset = queryset.filter(global_class_id=global_class_id)
        
        return queryset[:50]


# Дополнительные endpoints для аналитики

from rest_framework.decorators import api_view, permission_classes as perm_classes
from rest_framework.permissions import IsAuthenticated


@api_view(['GET'])
@perm_classes([IsAuthenticated])
def user_statistics(request):
    """Статистика пользователя"""
    workspace = UserWorkspace.objects.get(user=request.user)
    
    total_classes = workspace.classes.count()
    total_objects = GradeObject.objects.filter(
        class_of_grading__workspace=workspace
    ).count()
    
    rated_objects = GradeObject.objects.filter(
        class_of_grading__workspace=workspace,
        overall_rank__isnull=False
    )
    
    stats = {
        'total_classes': total_classes,
        'total_objects': total_objects,
        'total_ratings': rated_objects.count(),
        'average_rating': rated_objects.aggregate(avg=Avg('overall_rank'))['avg'],
        'top_rated_objects': [],
        'recent_updates': []
    }
    
    # Топ оцененных объектов
    top_objects = rated_objects.order_by('-overall_rank')[:10]
    stats['top_rated_objects'] = [
        {
            'id': str(obj.id),
            'name': obj.name,
            'rank': obj.overall_rank,
            'class': obj.class_of_grading.name
        }
        for obj in top_objects
    ]
    
    # Недавние изменения
    recent_history = UserRatingHistory.objects.filter(
        grade_object__class_of_grading__workspace=workspace
    ).order_by('-changed_at')[:10]
    
    stats['recent_updates'] = UserRatingHistorySerializer(recent_history, many=True).data
    
    return Response(stats)


@api_view(['GET'])
@perm_classes([IsAuthenticated])
def compare_with_global(request, object_id):
    """Сравнение пользовательской оценки с глобальной"""
    try:
        workspace = UserWorkspace.objects.get(user=request.user)
        grade_object = GradeObject.objects.get(
            id=object_id,
            class_of_grading__workspace=workspace
        )
        
        comparison = {
            'user_rank': grade_object.overall_rank,
            'global_rank': None,
            'difference': None,
            'position': None,
            'total_ratings': 0
        }
        
        try:
            contribution = UserObjectContribution.objects.get(grade_object=grade_object)
            global_object = contribution.global_object
            
            global_entry = GlobalLeaderboard.objects.get(
                global_object=global_object,
                period='all-time'
            )
            
            comparison['global_rank'] = global_entry.rank_value
            comparison['total_ratings'] = global_entry.total_users
            
            if grade_object.overall_rank and global_entry.rank_value:
                comparison['difference'] = grade_object.overall_rank - global_entry.rank_value
            
        except (UserObjectContribution.DoesNotExist, GlobalLeaderboard.DoesNotExist):
            pass
        
        return Response(comparison)
        
    except GradeObject.DoesNotExist:
        return Response(
            {'error': 'Object not found'},
            status=status.HTTP_404_NOT_FOUND
        )
