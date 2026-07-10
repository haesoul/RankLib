from rest_framework import serializers
from leaderboard.models import (
    GlobalObject, GlobalLeaderboard, UserObjectContribution,
    GlobalCategoryLeaderboard, TrendingObject, UserRatingHistory, PopularTag
)
from grading.serializers import GlobalClassSerializer


class GlobalObjectSerializer(serializers.ModelSerializer):
    """Сериализатор глобального объекта"""
    
    global_class_detail = GlobalClassSerializer(source='global_class', read_only=True)
    
    class Meta:
        model = GlobalObject
        fields = ['id', 'global_class', 'global_class_detail', 'name', 'canonical_name',
                  'total_ratings', 'average_rating', 'external_ids', 'metadata',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'canonical_name', 'total_ratings', 'average_rating', 
                            'created_at', 'updated_at']


class GlobalLeaderboardSerializer(serializers.ModelSerializer):
    """Сериализатор глобального рейтинга"""
    
    global_object_detail = GlobalObjectSerializer(source='global_object', read_only=True)
    
    class Meta:
        model = GlobalLeaderboard
        fields = ['id', 'global_object', 'global_object_detail', 'period', 
                  'rank_value', 'total_users', 'category_stats', 'updated_at']
        read_only_fields = ['id', 'total_users', 'updated_at']


class GlobalCategoryLeaderboardSerializer(serializers.ModelSerializer):
    """Сериализатор категорийного рейтинга"""
    
    global_object_detail = GlobalObjectSerializer(source='global_object', read_only=True)
    
    class Meta:
        model = GlobalCategoryLeaderboard
        fields = ['id', 'global_object', 'global_object_detail', 'category_name', 
                  'canonical_category_name', 'average_rank', 'total_ratings', 
                  'period', 'updated_at']
        read_only_fields = ['id', 'canonical_category_name', 'total_ratings', 'updated_at']


class TrendingObjectSerializer(serializers.ModelSerializer):
    """Сериализатор трендовых объектов"""
    
    global_object_detail = GlobalObjectSerializer(source='global_object', read_only=True)
    
    class Meta:
        model = TrendingObject
        fields = ['id', 'global_object', 'global_object_detail', 'period', 
                  'new_ratings_count', 'rating_velocity', 'trending_score', 
                  'trending_rank', 'calculated_at']
        read_only_fields = ['id', 'calculated_at']


class UserObjectContributionSerializer(serializers.ModelSerializer):
    """Сериализатор вклада пользователя"""
    
    global_object_detail = GlobalObjectSerializer(source='global_object', read_only=True)
    
    class Meta:
        model = UserObjectContribution
        fields = ['id', 'grade_object', 'global_object', 'global_object_detail',
                  'is_public', 'last_synced_rank', 'synced_at', 'created_at']
        read_only_fields = ['id', 'synced_at', 'created_at']


class UserRatingHistorySerializer(serializers.ModelSerializer):
    """Сериализатор истории оценок"""
    
    class Meta:
        model = UserRatingHistory
        fields = ['id', 'grade_object', 'old_rank', 'new_rank', 'changed_at']
        read_only_fields = ['id', 'changed_at']


class PopularTagSerializer(serializers.ModelSerializer):
    """Сериализатор популярных тегов"""
    
    class Meta:
        model = PopularTag
        fields = ['id', 'global_class', 'tag_name', 'canonical_tag_name', 
                  'usage_count', 'updated_at']
        read_only_fields = ['id', 'canonical_tag_name', 'usage_count', 'updated_at']


# Статистические сериализаторы

class LeaderboardStatsSerializer(serializers.Serializer):
    """Статистика по рейтингу"""
    
    total_objects = serializers.IntegerField()
    total_users = serializers.IntegerField()
    average_rating = serializers.FloatField()
    top_rated = GlobalObjectSerializer(many=True)
    trending = TrendingObjectSerializer(many=True)


class CategoryStatsSerializer(serializers.Serializer):
    """Статистика по категории"""
    
    category_name = serializers.CharField()
    average_rank = serializers.FloatField()
    total_ratings = serializers.IntegerField()
    top_objects = GlobalObjectSerializer(many=True)


class UserStatsSerializer(serializers.Serializer):
    """Статистика пользователя"""
    
    total_ratings = serializers.IntegerField()
    total_objects = serializers.IntegerField()
    average_rating = serializers.FloatField()
    top_rated_objects = serializers.ListField()
    recent_updates = UserRatingHistorySerializer(many=True)
