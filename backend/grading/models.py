from django.db import models
from django.contrib.postgres.fields import ArrayField
from user.models import CustomUser
import bson

def generate_object_id():
    return str(bson.ObjectId())

class UserWorkspace(models.Model):
    """Контейнер для всех пользовательских данных"""
    
    id = models.CharField(
        primary_key=True, 
        max_length=24, 
        default=generate_object_id, 
        editable=False
    )
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='workspace')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    last_sync_at = models.DateTimeField(null=True, blank=True)
    sync_enabled = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = 'Рабочее пространство'
        verbose_name_plural = 'Рабочие пространства'
    
    def __str__(self):
        return f"Workspace: {self.user.username}"


class GlobalClass(models.Model):
    """Глобальные шаблоны классов (для агрегации)"""
    
    id = models.CharField(primary_key=True,  max_length=24,  default=generate_object_id, editable=False)
    name = models.CharField(max_length=200, unique=True, db_index=True)
    canonical_name = models.CharField(max_length=200, unique=True, db_index=True) 
    
    category = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    
    total_users = models.IntegerField(default=0)
    total_objects = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Глобальный класс'
        verbose_name_plural = 'Глобальные классы'
        ordering = ['-total_users', 'name']
    
    def __str__(self):
        return self.name


class RankType(models.Model):
    """Типы рангов (S, A, B, C и т.д.)"""
    
    id = models.CharField(primary_key=True,  max_length=24,  default=generate_object_id, editable=False)
    workspace = models.ForeignKey(UserWorkspace, on_delete=models.CASCADE, related_name='rank_types')
    
    name = models.CharField(max_length=50)
    from_rank = models.FloatField()
    color = models.CharField(max_length=20, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Тип ранга'
        verbose_name_plural = 'Типы рангов'
        ordering = ['-from_rank']
        unique_together = [['workspace', 'name']]
    
    def __str__(self):
        return f"{self.name} (>= {self.from_rank})"


class Tag(models.Model):
    """Теги для объектов"""
    
    id = models.CharField(primary_key=True,  max_length=24,  default=generate_object_id, editable=False)
    workspace = models.ForeignKey(UserWorkspace, on_delete=models.CASCADE, related_name='tags')
    
    name = models.CharField(max_length=100, db_index=True)
    parent_tag = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='sub_tags')
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Тег'
        verbose_name_plural = 'Теги'
        unique_together = [['workspace', 'name', 'parent_tag']]
        ordering = ['name']
    
    def __str__(self):
        return self.name


class ClassOfGrading(models.Model):
    """Класс оценки (например: Character Writing, Anime Series)"""
    
    id = models.CharField(primary_key=True,  max_length=24,  default=generate_object_id, editable=False)
    workspace = models.ForeignKey(UserWorkspace, on_delete=models.CASCADE, related_name='grading_classes')
    
    name = models.CharField(max_length=200, db_index=True)
    photo = models.URLField(blank=True, null=True)
    priority = models.IntegerField(default=1)
    
    global_class = models.ForeignKey(GlobalClass, on_delete=models.SET_NULL, null=True, blank=True, related_name='class_instances')
    
    object_name = models.CharField(max_length=100, blank=True, null=True)
    objects_name = models.CharField(max_length=100, blank=True, null=True)
    note_name = models.CharField(max_length=100, blank=True, null=True)
    notes_name = models.CharField(max_length=100, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Класс оценки'
        verbose_name_plural = 'Классы оценки'
        unique_together = [['workspace', 'name']]
        ordering = ['-priority', 'name']
    
    def __str__(self):
        return f"{self.workspace.user.username} - {self.name}"


class Category(models.Model):
    """Категория оценки"""
    
    id = models.CharField(primary_key=True,  max_length=24,  default=generate_object_id, editable=False)
    class_of_grading = models.ForeignKey(ClassOfGrading, on_delete=models.CASCADE, related_name='categories')
    
    name = models.CharField(max_length=200)
    priority = models.IntegerField(default=1)
    weight = models.IntegerField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Категория'
        verbose_name_plural = 'Категории'
        ordering = ['priority', 'name']
    
    def __str__(self):
        return f"{self.class_of_grading.name} - {self.name}"


class SubCategory(models.Model):
    """Подкатегория"""
    
    id = models.CharField(primary_key=True,  max_length=24,  default=generate_object_id, editable=False)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='subcategories')
    
    name = models.CharField(max_length=200)
    priority = models.IntegerField(default=1)
    weight = models.IntegerField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Подкатегория'
        verbose_name_plural = 'Подкатегории'
        ordering = ['priority', 'name']
    
    def __str__(self):
        return f"{self.category.name} - {self.name}"


class GradeObject(models.Model):
    """Оцениваемый объект (персонаж, аниме, новелла и т.д.)"""
    
    id = models.CharField(primary_key=True,  max_length=24,  default=generate_object_id, editable=False)
    class_of_grading = models.ForeignKey(ClassOfGrading, on_delete=models.CASCADE, related_name='grade_objects')
    
    name = models.CharField(max_length=300, db_index=True)
    photo = models.URLField(blank=True, null=True)
    object_name = models.CharField(max_length=200, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    
    overall_rank = models.FloatField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Оцениваемый объект'
        verbose_name_plural = 'Оцениваемые объекты'
        ordering = ['-overall_rank', 'name']
    
    def __str__(self):
        return f"{self.class_of_grading.name} - {self.name}"


class MediaItem(models.Model):
    """Медиа-элемент (фото, видео)"""
    
    id = models.CharField(primary_key=True,  max_length=24,  default=generate_object_id, editable=False)
    grade_object = models.ForeignKey(GradeObject, on_delete=models.CASCADE, related_name='media')
    
    uri = models.URLField()
    media_type = models.CharField(max_length=50)
    mime_type = models.CharField(max_length=100, blank=True, null=True)
    thumbnail_uri = models.URLField(blank=True, null=True)
    caption = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Медиа-элемент'
        verbose_name_plural = 'Медиа-элементы'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.grade_object.name} - {self.media_type}"


class Note(models.Model):
    """Заметка к объекту"""
    
    id = models.CharField(primary_key=True,  max_length=24,  default=generate_object_id, editable=False)
    grade_object = models.ForeignKey(GradeObject, on_delete=models.CASCADE, related_name='notes')
    
    text = models.TextField()
    author = models.CharField(max_length=200, blank=True, null=True)
    pinned = models.BooleanField(default=False)
    photo_uri = models.URLField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Заметка'
        verbose_name_plural = 'Заметки'
        ordering = ['-pinned', '-created_at']
    
    def __str__(self):
        return f"Note for {self.grade_object.name}"


class Proof(models.Model):
    """Доказательство оценки (скриншот, текст)"""
    
    id = models.CharField(primary_key=True,  max_length=24,  default=generate_object_id, editable=False)
    image = models.URLField(blank=True, null=True)
    text = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Доказательство'
        verbose_name_plural = 'Доказательства'
    
    def __str__(self):
        return f"Proof {self.id}"


class CategoryOfObject(models.Model):
    """Оценка объекта по категории"""
    
    id = models.CharField(primary_key=True,  max_length=24,  default=generate_object_id, editable=False)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='category_ratings')
    grade_object = models.ForeignKey(GradeObject, on_delete=models.CASCADE, related_name='category_ratings')
    
    rank = models.FloatField(null=True, blank=True)
    proof = models.ForeignKey(Proof, on_delete=models.SET_NULL, null=True, blank=True, related_name='category_proofs')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Оценка по категории'
        verbose_name_plural = 'Оценки по категориям'
        unique_together = [['category', 'grade_object']]
    
    def __str__(self):
        return f"{self.grade_object.name} - {self.category.name}: {self.rank}"


class SubCategoryOfObject(models.Model):
    """Оценка объекта по подкатегории"""
    
    id = models.CharField(primary_key=True,  max_length=24,  default=generate_object_id, editable=False)
    subcategory = models.ForeignKey(SubCategory, on_delete=models.CASCADE, related_name='subcategory_ratings')
    category_of_object = models.ForeignKey(CategoryOfObject, on_delete=models.CASCADE, related_name='subcategory_ratings')
    
    rank = models.FloatField(null=True, blank=True)
    color = models.CharField(max_length=20, blank=True, null=True)
    proof = models.ForeignKey(Proof, on_delete=models.SET_NULL, null=True, blank=True, related_name='subcategory_proofs')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Оценка по подкатегории'
        verbose_name_plural = 'Оценки по подкатегориям'
        unique_together = [['subcategory', 'category_of_object']]
    
    def __str__(self):
        return f"{self.subcategory.name}: {self.rank}"


class ObjectTag(models.Model):
    """Связь объектов и тегов (M2M)"""
    
    id = models.CharField(primary_key=True,  max_length=24,  default=generate_object_id, editable=False)
    grade_object = models.ForeignKey(GradeObject, on_delete=models.CASCADE, related_name='object_tags')
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE, related_name='tagged_objects')
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Тег объекта'
        verbose_name_plural = 'Теги объектов'
        unique_together = [['grade_object', 'tag']]
    
    def __str__(self):
        return f"{self.grade_object.name} - {self.tag.name}"


class ClassRankType(models.Model):
    """Связь классов с типами рангов (M2M)"""
    
    id = models.CharField(primary_key=True,  max_length=24,  default=generate_object_id, editable=False)
    class_of_grading = models.ForeignKey(ClassOfGrading, on_delete=models.CASCADE, related_name='class_rank_types')
    rank_type = models.ForeignKey(RankType, on_delete=models.CASCADE, related_name='rank_classes')
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Тип ранга класса'
        verbose_name_plural = 'Типы рангов классов'
        unique_together = [['class_of_grading', 'rank_type']]


class ClassTag(models.Model):
    """Связь классов с тегами (M2M)"""
    
    id = models.CharField(primary_key=True,  max_length=24,  default=generate_object_id, editable=False)
    class_of_grading = models.ForeignKey(ClassOfGrading, on_delete=models.CASCADE, related_name='class_tags')
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE, related_name='tagged_classes')
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Тег класса'
        verbose_name_plural = 'Теги классов'
        unique_together = [['class_of_grading', 'tag']]
