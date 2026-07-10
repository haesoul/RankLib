from django.db import models
from grading.models import GlobalClass, ClassOfGrading, Category, GradeObject, generate_object_id

import bson




class GlobalObject(models.Model):
    """Глобальный объект (для агрегации оценок разных пользователей)"""
    
    id = models.CharField(primary_key=True,  max_length=24,  default=generate_object_id, editable=False)
    global_class = models.ForeignKey(GlobalClass, on_delete=models.CASCADE, related_name='global_objects')
    
    name = models.CharField(max_length=300, db_index=True)
    canonical_name = models.CharField(max_length=300, db_index=True) 
    
    total_ratings = models.IntegerField(default=0)
    average_rating = models.FloatField(null=True, blank=True)
    
    external_ids = models.JSONField(default=dict, blank=True)
    
    metadata = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Глобальный объект'
        verbose_name_plural = 'Глобальные объекты'
        unique_together = [['global_class', 'canonical_name']]
        ordering = ['-average_rating', '-total_ratings']
        indexes = [
            models.Index(fields=['global_class', '-average_rating']),
            models.Index(fields=['global_class', '-total_ratings']),
        ]
    
    def __str__(self):
        return f"{self.global_class.name} - {self.name}"


class GlobalLeaderboard(models.Model):
    """Глобальная таблица лидеров"""
    
    id = models.CharField(primary_key=True,  max_length=24,  default=generate_object_id, editable=False)
    global_object = models.ForeignKey(GlobalObject, on_delete=models.CASCADE, related_name='leaderboard_entries')
    
    period = models.CharField(max_length=50, default='all-time', db_index=True)
    
    rank_value = models.FloatField()
    total_users = models.IntegerField(default=0)
    
    category_stats = models.JSONField(default=dict, blank=True)
    
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Запись глобального рейтинга'
        verbose_name_plural = 'Записи глобального рейтинга'
        unique_together = [['global_object', 'period']]
        ordering = ['-rank_value']
        indexes = [
            models.Index(fields=['period', '-rank_value']),
        ]
    
    def __str__(self):
        return f"{self.global_object.name} - {self.rank_value} ({self.period})"


class UserObjectContribution(models.Model):
    
    id = models.CharField(primary_key=True,  max_length=24,  default=generate_object_id, editable=False)
    grade_object = models.OneToOneField(GradeObject, on_delete=models.CASCADE, related_name='global_contribution')
    global_object = models.ForeignKey(GlobalObject, on_delete=models.CASCADE, related_name='user_contributions')
    
    is_public = models.BooleanField(default=True)
    
    last_synced_rank = models.FloatField(null=True, blank=True)
    synced_at = models.DateTimeField(auto_now=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Вклад пользователя'
        verbose_name_plural = 'Вклады пользователей'
        indexes = [
            models.Index(fields=['global_object', 'is_public']),
        ]
    
    def __str__(self):
        return f"{self.grade_object.name} -> {self.global_object.name}"


class GlobalCategoryLeaderboard(models.Model):
    """Рейтинг по конкретной категории"""
    
    id = models.CharField(primary_key=True,  max_length=24,  default=generate_object_id, editable=False)
    global_object = models.ForeignKey(GlobalObject, on_delete=models.CASCADE, related_name='category_leaderboards')
    
    category_name = models.CharField(max_length=200, db_index=True)
    canonical_category_name = models.CharField(max_length=200, db_index=True)
    
    average_rank = models.FloatField()
    total_ratings = models.IntegerField(default=0)
    
    period = models.CharField(max_length=50, default='all-time')
    
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Категорийный рейтинг'
        verbose_name_plural = 'Категорийные рейтинги'
        unique_together = [['global_object', 'canonical_category_name', 'period']]
        ordering = ['-average_rank']
        indexes = [
            models.Index(fields=['canonical_category_name', '-average_rank']),
        ]
    
    def __str__(self):
        return f"{self.global_object.name} - {self.category_name}: {self.average_rank}"


class TrendingObject(models.Model):
    """Трендовые объекты (за последние N дней)"""
    
    id = models.CharField(primary_key=True,  max_length=24,  default=generate_object_id, editable=False)
    global_object = models.ForeignKey(GlobalObject, on_delete=models.CASCADE, related_name='trending_entries')
    
    period = models.CharField(max_length=50, default='7days') 
    
    new_ratings_count = models.IntegerField(default=0)
    rating_velocity = models.FloatField(default=0.0) 
    
    trending_score = models.FloatField()
    trending_rank = models.IntegerField(default=0)
    
    calculated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Трендовый объект'
        verbose_name_plural = 'Трендовые объекты'
        unique_together = [['global_object', 'period']]
        ordering = ['-trending_score']
        indexes = [
            models.Index(fields=['period', '-trending_score']),
        ]
    
    def __str__(self):
        return f"Trending: {self.global_object.name} ({self.period})"


class UserRatingHistory(models.Model):
    """История изменения оценок пользователя"""
    
    id = models.CharField(primary_key=True,  max_length=24,  default=generate_object_id, editable=False)
    grade_object = models.ForeignKey(GradeObject, on_delete=models.CASCADE, related_name='rating_history')
    
    old_rank = models.FloatField(null=True, blank=True)
    new_rank = models.FloatField(null=True, blank=True)
    
    changed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'История оценок'
        verbose_name_plural = 'История оценок'
        ordering = ['-changed_at']
        indexes = [
            models.Index(fields=['grade_object', '-changed_at']),
        ]
    
    def __str__(self):
        return f"{self.grade_object.name}: {self.old_rank} -> {self.new_rank}"


class PopularTag(models.Model):
    """Популярные теги (агрегация)"""
    
    id = models.CharField(primary_key=True,  max_length=24,  default=generate_object_id, editable=False)
    global_class = models.ForeignKey(GlobalClass, on_delete=models.CASCADE, related_name='popular_tags')
    
    tag_name = models.CharField(max_length=100, db_index=True)
    canonical_tag_name = models.CharField(max_length=100, db_index=True)
    
    usage_count = models.IntegerField(default=0)
    
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Популярный тег'
        verbose_name_plural = 'Популярные теги'
        unique_together = [['global_class', 'canonical_tag_name']]
        ordering = ['-usage_count']
    
    def __str__(self):
        return f"{self.tag_name} ({self.usage_count})"
