from rest_framework import serializers
from grading.models import (
    UserWorkspace, RankType, Tag, ClassOfGrading, Category, SubCategory,
    GradeObject, MediaItem, Note, Proof, CategoryOfObject, SubCategoryOfObject,
    ObjectTag, ClassRankType, ClassTag, GlobalClass
)


class UserWorkspaceSerializer(serializers.ModelSerializer):
    """Сериализатор рабочего пространства"""
    
    class Meta:
        model = UserWorkspace
        fields = ['id', 'user', 'created_at', 'updated_at', 'last_sync_at', 'sync_enabled']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class GlobalClassSerializer(serializers.ModelSerializer):
    """Сериализатор глобального класса"""
    
    class Meta:
        model = GlobalClass
        fields = ['id', 'name', 'canonical_name', 'category', 'description', 
                  'total_users', 'total_objects', 'created_at', 'updated_at']
        read_only_fields = ['id', 'canonical_name', 'total_users', 'total_objects', 'created_at', 'updated_at']


class RankTypeSerializer(serializers.ModelSerializer):
    """Сериализатор типа ранга"""
    
    class Meta:
        model = RankType
        fields = ['id', 'workspace', 'name', 'from_rank', 'color', 'created_at']
        read_only_fields = ['id', 'workspace', 'created_at']


class TagSerializer(serializers.ModelSerializer):
    """Сериализатор тега"""
    
    sub_tags = serializers.SerializerMethodField()
    
    class Meta:
        model = Tag
        fields = ['id', 'workspace', 'name', 'parent_tag', 'sub_tags', 'created_at']
        read_only_fields = ['id', 'workspace', 'created_at']
    
    def get_sub_tags(self, obj):
        if obj.sub_tags.exists():
            return TagSerializer(obj.sub_tags.all(), many=True).data
        return []


class SubCategorySerializer(serializers.ModelSerializer):
    """Сериализатор подкатегории"""
    
    class Meta:
        model = SubCategory
        fields = ['id', 'category', 'name', 'priority', 'weight', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class CategorySerializer(serializers.ModelSerializer):
    """Сериализатор категории"""
    
    subcategories = SubCategorySerializer(many=True, read_only=True)
    
    class Meta:
        model = Category
        fields = ['id', 'class_of_grading', 'name', 'priority', 'weight', 
                  'subcategories', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class MediaItemSerializer(serializers.ModelSerializer):
    """Сериализатор медиа-элемента"""
    
    class Meta:
        model = MediaItem
        fields = ['id', 'grade_object', 'uri', 'media_type', 'mime_type', 
                  'thumbnail_uri', 'caption', 'created_at']
        read_only_fields = ['id', 'grade_object', 'created_at']


class NoteSerializer(serializers.ModelSerializer):
    """Сериализатор заметки"""
    
    class Meta:
        model = Note
        fields = ['id', 'grade_object', 'text', 'author', 'pinned', 'photo_uri', 'created_at']
        read_only_fields = ['id', 'grade_object', 'created_at']


class ProofSerializer(serializers.ModelSerializer):
    """Сериализатор доказательства"""
    
    class Meta:
        model = Proof
        fields = ['id', 'image', 'text', 'created_at']
        read_only_fields = ['id', 'created_at']


class SubCategoryOfObjectSerializer(serializers.ModelSerializer):
    """Сериализатор оценки по подкатегории"""
    
    subcategory_detail = SubCategorySerializer(source='subcategory', read_only=True)
    proof_detail = ProofSerializer(source='proof', read_only=True)
    
    class Meta:
        model = SubCategoryOfObject
        fields = ['id', 'subcategory', 'subcategory_detail', 'category_of_object', 
                  'rank', 'color', 'proof', 'proof_detail', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class CategoryOfObjectSerializer(serializers.ModelSerializer):
    """Сериализатор оценки по категории"""
    
    category_detail = CategorySerializer(source='category', read_only=True)
    subcategory_ratings = SubCategoryOfObjectSerializer(many=True, read_only=True)
    proof_detail = ProofSerializer(source='proof', read_only=True)
    
    class Meta:
        model = CategoryOfObject
        fields = ['id', 'category', 'category_detail', 'grade_object', 'rank', 
                  'subcategory_ratings', 'proof', 'proof_detail', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class GradeObjectSerializer(serializers.ModelSerializer):
    """Сериализатор оцениваемого объекта"""
    
    category_ratings = CategoryOfObjectSerializer(many=True, read_only=True)
    media = MediaItemSerializer(many=True, read_only=True)
    notes = NoteSerializer(many=True, read_only=True)
    tags = serializers.SerializerMethodField()
    
    class Meta:
        model = GradeObject
        fields = ['id', 'class_of_grading', 'name', 'photo', 'object_name', 'description',
                  'overall_rank', 'category_ratings', 'media', 'notes', 'tags',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_tags(self, obj):
        object_tags = obj.object_tags.all()
        return [{'id': str(ot.tag.id), 'name': ot.tag.name} for ot in object_tags]


class GradeObjectListSerializer(serializers.ModelSerializer):
    """Упрощенный сериализатор для списка объектов"""
    
    class Meta:
        model = GradeObject
        fields = ['id', 'name', 'photo', 'overall_rank', 'created_at']
        read_only_fields = ['id', 'created_at']


class ClassOfGradingSerializer(serializers.ModelSerializer):
    """Сериализатор класса оценки"""
    
    categories = CategorySerializer(many=True, read_only=True)
    objects = GradeObjectListSerializer(many=True, read_only=True)
    tags = serializers.SerializerMethodField()
    rank_types = serializers.SerializerMethodField()
    global_class_detail = GlobalClassSerializer(source='global_class', read_only=True)
    
    class Meta:
        model = ClassOfGrading
        fields = ['id', 'workspace', 'name', 'photo', 'priority', 'global_class', 
                  'global_class_detail', 'object_name', 'objects_name', 'note_name', 
                  'notes_name', 'categories', 'objects', 'tags', 'rank_types',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'workspace', 'created_at', 'updated_at']
    
    def get_tags(self, obj):
        class_tags = obj.class_tags.all()
        return [{'id': str(ct.tag.id), 'name': ct.tag.name} for ct in class_tags]
    
    def get_rank_types(self, obj):
        class_rank_types = obj.class_rank_types.all()
        return RankTypeSerializer([crt.rank_type for crt in class_rank_types], many=True).data


class ClassOfGradingListSerializer(serializers.ModelSerializer):
    """Упрощенный сериализатор для списка классов"""
    
    objects_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ClassOfGrading
        fields = ['id', 'name', 'photo', 'priority', 'objects_count', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_objects_count(self, obj):
        return obj.objects.count()


class ObjectTagSerializer(serializers.ModelSerializer):
    """Сериализатор связи объекта и тега"""
    
    class Meta:
        model = ObjectTag
        fields = ['id', 'grade_object', 'tag', 'created_at']
        read_only_fields = ['id', 'created_at']


class ClassTagSerializer(serializers.ModelSerializer):
    """Сериализатор связи класса и тега"""
    
    class Meta:
        model = ClassTag
        fields = ['id', 'class_of_grading', 'tag', 'created_at']
        read_only_fields = ['id', 'created_at']


class ClassRankTypeSerializer(serializers.ModelSerializer):
    """Сериализатор связи класса и типа ранга"""
    
    class Meta:
        model = ClassRankType
        fields = ['id', 'class_of_grading', 'rank_type', 'created_at']
        read_only_fields = ['id', 'created_at']


# Сериализаторы для создания/обновления с вложенными данными

class CategoryCreateSerializer(serializers.ModelSerializer):
    """Сериализатор создания категории с подкатегориями"""
    
    subcategories = SubCategorySerializer(many=True, required=False)
    
    class Meta:
        model = Category
        fields = ['id', 'class_of_grading', 'name', 'priority', 'weight', 'subcategories']
        read_only_fields = ['id']
    
    def create(self, validated_data):
        subcategories_data = validated_data.pop('subcategories', [])
        category = Category.objects.create(**validated_data)
        
        for subcategory_data in subcategories_data:
            SubCategory.objects.create(category=category, **subcategory_data)
        
        return category


class GradeObjectCreateSerializer(serializers.ModelSerializer):
    """Сериализатор создания объекта с вложенными данными"""
    
    media = MediaItemSerializer(many=True, required=False)
    notes = NoteSerializer(many=True, required=False)
    tag_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = GradeObject
        fields = ['id', 'class_of_grading', 'name', 'photo', 'object_name', 
                  'description', 'overall_rank', 'media', 'notes', 'tag_ids']
        read_only_fields = ['id']
    
    def create(self, validated_data):
        media_data = validated_data.pop('media', [])
        notes_data = validated_data.pop('notes', [])
        tag_ids = validated_data.pop('tag_ids', [])
        
        grade_object = GradeObject.objects.create(**validated_data)
        
        # Создание медиа
        for media_item in media_data:
            MediaItem.objects.create(grade_object=grade_object, **media_item)
        
        # Создание заметок
        for note_item in notes_data:
            Note.objects.create(grade_object=grade_object, **note_item)
        
        # Добавление тегов
        workspace = grade_object.class_of_grading.workspace
        for tag_id in tag_ids:
            try:
                tag = Tag.objects.get(id=tag_id, workspace=workspace)
                ObjectTag.objects.create(grade_object=grade_object, tag=tag)
            except Tag.DoesNotExist:
                pass
        
        return grade_object
