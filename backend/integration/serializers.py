"""
Сериализаторы для API синхронизации данных между Django и Realm
"""

from rest_framework import serializers
from typing import Dict, Any


class ExportRequestSerializer(serializers.Serializer):
    """Сериализатор запроса на экспорт данных"""
    
    include_media = serializers.BooleanField(default=True)
    include_notes = serializers.BooleanField(default=True)
    include_proofs = serializers.BooleanField(default=True)
    download_files = serializers.BooleanField(default=True)


class ImportRequestSerializer(serializers.Serializer):
    """
    Сериализатор запроса на импорт данных из Realm
    
    ИСПРАВЛЕНА ВАЛИДАЦИЯ:
    - data должен быть словарем (может быть пустым или содержать пустые массивы)
    - валидация структуры происходит в сервисном слое
    """
    
    data = serializers.DictField(
        required=True,
        help_text="Данные из Realm в формате {ModelName: [objects]}"
    )
    files = serializers.DictField(
        required=False,
        allow_null=True,
        help_text="Файлы в формате {object_id: base64_string}"
    )
    merge = serializers.BooleanField(
        default=True,
        help_text="Объединить с существующими данными или заменить"
    )
    validate_only = serializers.BooleanField(
        default=False,
        help_text="Только проверить данные без сохранения"
    )
    
    def validate_data(self, value: Dict[str, Any]) -> Dict[str, Any]:
        """
        Валидация структуры данных
        
        ИЗМЕНЕНО: Принимаем любой словарь, даже пустой
        Детальная валидация происходит в сервисном слое
        """
        if not isinstance(value, dict):
            raise serializers.ValidationError(
                "Data должен быть словарем"
            )
        
        # Проверяем, что если есть данные, они в правильном формате
        valid_keys = {
            'RankType', 'Tag', 'ClassOfGrading', 'Category', 'SubCategory',
            'GradeObject', 'MediaItem', 'Note', 'Proof',
            'CategoryOfObject', 'SubCategoryOfObject',
            'ObjectTag', 'ClassTag', 'ClassRankType'
        }
        
        for key in value.keys():
            if key not in valid_keys:
                raise serializers.ValidationError(
                    f"Неизвестный ключ: {key}. Допустимые ключи: {', '.join(valid_keys)}"
                )
            
            if not isinstance(value[key], list):
                raise serializers.ValidationError(
                    f"Значение для {key} должно быть массивом"
                )
        
        return value
    
    def validate_files(self, value: Dict[str, str]) -> Dict[str, str]:
        """Валидация файлов"""
        if value is None:
            return {}
        
        if not isinstance(value, dict):
            raise serializers.ValidationError(
                "Files должен быть словарем {object_id: base64_string}"
            )
        
        return value


class RealEventDataSerializer(serializers.Serializer):
    """Сериализатор для данных события синхронизации"""
    
    event_type = serializers.ChoiceField(
        choices=['created', 'updated', 'deleted'],
        required=True
    )
    model_name = serializers.CharField(max_length=100, required=True)
    object_id = serializers.UUIDField(required=True)
    timestamp = serializers.DateTimeField(required=True)
    data = serializers.DictField(required=False, allow_null=True)


class SyncStatusSerializer(serializers.Serializer):
    """Сериализатор статуса синхронизации"""
    
    last_sync_at = serializers.DateTimeField(allow_null=True)
    sync_enabled = serializers.BooleanField()
    pending_changes = serializers.IntegerField(default=0)


class SyncStatisticsSerializer(serializers.Serializer):
    """Сериализатор статистики синхронизации"""
    
    total_classes = serializers.IntegerField(default=0)
    total_objects = serializers.IntegerField(default=0)
    total_categories = serializers.IntegerField(default=0)
    total_ratings = serializers.IntegerField(default=0)
    total_media = serializers.IntegerField(default=0)
    total_notes = serializers.IntegerField(default=0)


class SyncResultSerializer(serializers.Serializer):
    """Сериализатор результата синхронизации"""
    
    success = serializers.BooleanField()
    message = serializers.CharField(max_length=500, required=False)
    timestamp = serializers.DateTimeField()
    stats = serializers.DictField(required=False)


class DataCheckpointSerializer(serializers.Serializer):
    """Сериализатор контрольной точки данных"""
    
    workspace_id = serializers.UUIDField()
    total_classes = serializers.IntegerField()
    total_objects = serializers.IntegerField()
    total_categories = serializers.IntegerField()
    total_ratings = serializers.IntegerField()
    data_size_bytes = serializers.IntegerField()
    created_at = serializers.DateTimeField()


class BulkExportSerializer(serializers.Serializer):
    """Сериализатор массового экспорта"""
    
    object_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
        default=list
    )
    category_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
        default=list
    )
    class_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
        default=list
    )
    with_relationships = serializers.BooleanField(default=True)
    download_files = serializers.BooleanField(default=True)


class ConflictResolutionSerializer(serializers.Serializer):
    """Сериализатор разрешения конфликтов"""
    
    conflict_type = serializers.ChoiceField(
        choices=['version_mismatch', 'deleted_on_server', 'modified_on_both']
    )
    resolution = serializers.ChoiceField(
        choices=['keep_local', 'keep_server', 'merge', 'skip']
    )
    object_id = serializers.UUIDField()
    model_name = serializers.CharField(max_length=100)


class ValidationReportSerializer(serializers.Serializer):
    """Сериализатор отчета валидации"""
    
    is_valid = serializers.BooleanField()
    total_records = serializers.IntegerField()
    valid_records = serializers.IntegerField()
    errors = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        allow_empty=True
    )
    warnings = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True
    )
