from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Avg, Count
from django_filters.rest_framework import DjangoFilterBackend

from grading.models import (
    UserWorkspace, RankType, Tag, ClassOfGrading, Category, SubCategory,
    GradeObject, MediaItem, Note, CategoryOfObject, SubCategoryOfObject,
    ObjectTag, ClassTag, ClassRankType, GlobalClass
)
from grading.serializers import (
    UserWorkspaceSerializer, RankTypeSerializer, TagSerializer,
    ClassOfGradingSerializer, ClassOfGradingListSerializer,
    CategorySerializer, CategoryCreateSerializer, SubCategorySerializer,
    GradeObjectSerializer, GradeObjectListSerializer, GradeObjectCreateSerializer,
    MediaItemSerializer, NoteSerializer, CategoryOfObjectSerializer,
    SubCategoryOfObjectSerializer, ObjectTagSerializer, ClassTagSerializer,
    ClassRankTypeSerializer, GlobalClassSerializer
)


class IsOwnerPermission(permissions.BasePermission):
    """Права доступа: только владелец"""
    
    def has_object_permission(self, request, view, obj):
        # Для UserWorkspace
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        # Для моделей с workspace
        if hasattr(obj, 'workspace'):
            return obj.workspace.user == request.user
        
        # Для вложенных моделей
        if hasattr(obj, 'class_of_grading'):
            return obj.class_of_grading.workspace.user == request.user
        
        if hasattr(obj, 'category'):
            return obj.category.class_of_grading.workspace.user == request.user
        
        if hasattr(obj, 'grade_object'):
            return obj.grade_object.class_of_grading.workspace.user == request.user
        
        return False


class UserWorkspaceViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для рабочего пространства"""
    
    serializer_class = UserWorkspaceSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerPermission]
    
    def get_queryset(self):
        return UserWorkspace.objects.filter(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def sync(self, request, pk=None):
        """Синхронизация данных"""
        workspace = self.get_object()
        
        from django.utils import timezone
        workspace.last_sync_at = timezone.now()
        workspace.save()
        
        return Response({
            'status': 'synced',
            'last_sync_at': workspace.last_sync_at
        })


class GlobalClassViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для глобальных классов (только чтение)"""
    
    queryset = GlobalClass.objects.all()
    serializer_class = GlobalClassSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'canonical_name', 'category']
    ordering_fields = ['total_users', 'total_objects', 'created_at']
    ordering = ['-total_users']


class RankTypeViewSet(viewsets.ModelViewSet):
    """ViewSet для типов рангов"""
    
    serializer_class = RankTypeSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerPermission]
    filter_backends = [filters.OrderingFilter]
    ordering = ['-from_rank']
    
    def get_queryset(self):
        workspace = UserWorkspace.objects.get(user=self.request.user)
        return RankType.objects.filter(workspace=workspace)
    
    def perform_create(self, serializer):
        workspace = UserWorkspace.objects.get(user=self.request.user)
        serializer.save(workspace=workspace)


class TagViewSet(viewsets.ModelViewSet):
    """ViewSet для тегов"""
    
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerPermission]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering = ['name']
    
    def get_queryset(self):
        workspace = UserWorkspace.objects.get(user=self.request.user)
        queryset = Tag.objects.filter(workspace=workspace)
        
        # Фильтрация по parent_tag
        parent_tag_id = self.request.query_params.get('parent_tag')
        if parent_tag_id:
            queryset = queryset.filter(parent_tag_id=parent_tag_id)
        elif parent_tag_id == 'null':
            queryset = queryset.filter(parent_tag__isnull=True)
        
        return queryset
    
    def perform_create(self, serializer):
        workspace = UserWorkspace.objects.get(user=self.request.user)
        serializer.save(workspace=workspace)


class ClassOfGradingViewSet(viewsets.ModelViewSet):
    """ViewSet для классов оценки"""
    
    permission_classes = [permissions.IsAuthenticated, IsOwnerPermission]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = ['name']
    ordering_fields = ['priority', 'created_at', 'name']
    ordering = ['-priority']
    filterset_fields = ['global_class']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ClassOfGradingListSerializer
        return ClassOfGradingSerializer
    
    def get_queryset(self):
        workspace = UserWorkspace.objects.get(user=self.request.user)
        return ClassOfGrading.objects.filter(workspace=workspace).prefetch_related(
            'categories', 'objects', 'class_tags', 'class_rank_types'
        )
    
    def perform_create(self, serializer):
        workspace = UserWorkspace.objects.get(user=self.request.user)
        serializer.save(workspace=workspace)
    
    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Статистика по классу"""
        class_obj = self.get_object()
        
        objects = class_obj.objects.all()
        
        stats = {
            'total_objects': objects.count(),
            'average_rank': objects.aggregate(avg=Avg('overall_rank'))['avg'],
            'top_rated': GradeObjectListSerializer(
                objects.order_by('-overall_rank')[:10],
                many=True
            ).data
        }
        
        return Response(stats)


class CategoryViewSet(viewsets.ModelViewSet):
    """ViewSet для категорий"""
    
    permission_classes = [permissions.IsAuthenticated, IsOwnerPermission]
    filter_backends = [filters.OrderingFilter]
    ordering = ['priority']
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return CategoryCreateSerializer
        return CategorySerializer
    
    def get_queryset(self):
        workspace = UserWorkspace.objects.get(user=self.request.user)
        queryset = Category.objects.filter(
            class_of_grading__workspace=workspace
        ).prefetch_related('subcategories')
        
        # Фильтрация по классу
        class_id = self.request.query_params.get('class_of_grading')
        if class_id:
            queryset = queryset.filter(class_of_grading_id=class_id)
        
        return queryset


class SubCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet для подкатегорий"""
    
    serializer_class = SubCategorySerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerPermission]
    filter_backends = [filters.OrderingFilter]
    ordering = ['priority']
    
    def get_queryset(self):
        workspace = UserWorkspace.objects.get(user=self.request.user)
        queryset = SubCategory.objects.filter(
            category__class_of_grading__workspace=workspace
        )
        
        # Фильтрация по категории
        category_id = self.request.query_params.get('category')
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        
        return queryset


class GradeObjectViewSet(viewsets.ModelViewSet):
    """ViewSet для оцениваемых объектов"""
    
    permission_classes = [permissions.IsAuthenticated, IsOwnerPermission]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = ['name', 'description']
    ordering_fields = ['overall_rank', 'created_at', 'name']
    ordering = ['-overall_rank']
    filterset_fields = ['class_of_grading']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return GradeObjectListSerializer
        elif self.action in ['create', 'update']:
            return GradeObjectCreateSerializer
        return GradeObjectSerializer
    
    def get_queryset(self):
        workspace = UserWorkspace.objects.get(user=self.request.user)
        queryset = GradeObject.objects.filter(
            class_of_grading__workspace=workspace
        ).prefetch_related(
            'category_ratings', 'media', 'notes', 'object_tags'
        )
        
        # Фильтрация по тегам
        tag_ids = self.request.query_params.getlist('tags')
        if tag_ids:
            queryset = queryset.filter(object_tags__tag_id__in=tag_ids).distinct()
        
        # Фильтрация по рангу
        min_rank = self.request.query_params.get('min_rank')
        max_rank = self.request.query_params.get('max_rank')
        
        if min_rank:
            queryset = queryset.filter(overall_rank__gte=float(min_rank))
        if max_rank:
            queryset = queryset.filter(overall_rank__lte=float(max_rank))
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def add_tag(self, request, pk=None):
        """Добавление тега к объекту"""
        grade_object = self.get_object()
        tag_id = request.data.get('tag_id')
        
        try:
            tag = Tag.objects.get(
                id=tag_id,
                workspace=grade_object.class_of_grading.workspace
            )
            ObjectTag.objects.get_or_create(grade_object=grade_object, tag=tag)
            
            return Response({'status': 'tag added'})
        except Tag.DoesNotExist:
            return Response(
                {'error': 'Tag not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def remove_tag(self, request, pk=None):
        """Удаление тега у объекта"""
        grade_object = self.get_object()
        tag_id = request.data.get('tag_id')
        
        ObjectTag.objects.filter(
            grade_object=grade_object,
            tag_id=tag_id
        ).delete()
        
        return Response({'status': 'tag removed'})


class MediaItemViewSet(viewsets.ModelViewSet):
    """ViewSet для медиа-элементов"""
    
    serializer_class = MediaItemSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerPermission]
    
    def get_queryset(self):
        workspace = UserWorkspace.objects.get(user=self.request.user)
        queryset = MediaItem.objects.filter(
            grade_object__class_of_grading__workspace=workspace
        )
        
        # Фильтрация по объекту
        object_id = self.request.query_params.get('grade_object')
        if object_id:
            queryset = queryset.filter(grade_object_id=object_id)
        
        return queryset


class NoteViewSet(viewsets.ModelViewSet):
    """ViewSet для заметок"""
    
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerPermission]
    filter_backends = [filters.OrderingFilter]
    ordering = ['-pinned', '-created_at']
    
    def get_queryset(self):
        workspace = UserWorkspace.objects.get(user=self.request.user)
        queryset = Note.objects.filter(
            grade_object__class_of_grading__workspace=workspace
        )
        
        # Фильтрация по объекту
        object_id = self.request.query_params.get('grade_object')
        if object_id:
            queryset = queryset.filter(grade_object_id=object_id)
        
        return queryset


class CategoryOfObjectViewSet(viewsets.ModelViewSet):
    """ViewSet для оценок по категориям"""
    
    serializer_class = CategoryOfObjectSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerPermission]
    
    def get_queryset(self):
        workspace = UserWorkspace.objects.get(user=self.request.user)
        queryset = CategoryOfObject.objects.filter(
            grade_object__class_of_grading__workspace=workspace
        ).select_related('category', 'grade_object', 'proof')
        
        # Фильтрация
        object_id = self.request.query_params.get('grade_object')
        category_id = self.request.query_params.get('category')
        
        if object_id:
            queryset = queryset.filter(grade_object_id=object_id)
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        
        return queryset


class SubCategoryOfObjectViewSet(viewsets.ModelViewSet):
    """ViewSet для оценок по подкатегориям"""
    
    serializer_class = SubCategoryOfObjectSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerPermission]
    
    def get_queryset(self):
        workspace = UserWorkspace.objects.get(user=self.request.user)
        queryset = SubCategoryOfObject.objects.filter(
            category_of_object__grade_object__class_of_grading__workspace=workspace
        ).select_related('subcategory', 'category_of_object', 'proof')
        
        # Фильтрация
        category_of_object_id = self.request.query_params.get('category_of_object')
        if category_of_object_id:
            queryset = queryset.filter(category_of_object_id=category_of_object_id)
        
        return queryset
