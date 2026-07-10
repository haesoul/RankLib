"""
Views для API синхронизации данных между Django и React Native Realm
Поддержка больших файлов через FormData и батч-обработки
ИСПРАВЛЕНО: Правильная обработка MediaItem и всех типов файлов
"""

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.views import APIView
from django.db.models import Count, Q
from django.utils import timezone
from django.core.cache import cache
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
import json
import logging
import uuid

from grading.models import (
    UserWorkspace, ClassOfGrading, Category, SubCategory,
    GradeObject, CategoryOfObject, SubCategoryOfObject, 
    MediaItem, Note, Proof, RankType, Tag
)
from integration.serializers import (
    ExportRequestSerializer, ImportRequestSerializer,
    SyncStatusSerializer, DataCheckpointSerializer,
    BulkExportSerializer, ValidationReportSerializer
)
from integration.service import ExportService, ImportService, RealmDataValidator

logger = logging.getLogger(__name__)


class IsOwnerPermission(permissions.BasePermission):
    """Проверка владения рабочим пространством"""
    
    def has_object_permission(self, request, view, obj):
        if isinstance(obj, UserWorkspace):
            return obj.user == request.user
        return True


class FileUploadView(APIView):
    """
    API endpoint для загрузки отдельных файлов через FormData
    Используется после отправки метаданных для загрузки больших файлов
    
    ИСПРАВЛЕНО:
    - MediaItem создается с правильными связями
    - Note поддерживает фото
    - Proof поддерживает изображения
    - Все файлы сохраняются в правильные директории
    """
    
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """
        Загрузка файла и привязка к объекту
        
        Form Data:
            file: файл для загрузки
            object_id: UUID объекта Django
            model_name: название модели (ClassOfGrading, GradeObject, MediaItem, Note, etc.)
            field_name: название поля (photo, uri, photoUri, proof_image, etc.)
        """
        try:
            # Получение данных
            file_obj = request.FILES.get('file')
            object_id = request.data.get('object_id')
            model_name = request.data.get('model_name')
            field_name = request.data.get('field_name')
            
            # Дополнительные параметры для MediaItem
            media_type = request.data.get('media_type', 'photo')
            mime_type = request.data.get('mime_type')
            caption = request.data.get('caption')
            
            if not all([file_obj, object_id, model_name, field_name]):
                return Response(
                    {
                        'success': False,
                        'error': 'Missing required parameters: file, object_id, model_name, field_name'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            logger.info(
                f"File upload request: {model_name}.{field_name} "
                f"for object {object_id}, file: {file_obj.name} ({file_obj.size} bytes)"
            )
            
            # === ОБРАБОТКА ПО ТИПУ МОДЕЛИ ===
            
            # 1. CLASSOFGRADING - фото класса
            if model_name == 'ClassOfGrading':
                return self._handle_class_photo(
                    request.user, object_id, field_name, file_obj
                )
            
            # 2. GRADEOBJECT - фото объекта
            elif model_name == 'GradeObject':
                return self._handle_object_photo(
                    request.user, object_id, field_name, file_obj
                )
            
            # 3. MEDIAITEM - медиа файлы (фото/видео)
            elif model_name == 'MediaItem':
                return self._handle_media_item(
                    request.user, object_id, field_name, file_obj,
                    media_type, mime_type, caption
                )
            
            # 4. NOTE - фото в заметке
            elif model_name == 'Note':
                return self._handle_note_photo(
                    request.user, object_id, field_name, file_obj
                )
            
            # 5. CATEGORYOFOBJECT или SUBCATEGORYOFOBJECT - proof image
            elif model_name in ['CategoryOfObject', 'SubCategoryOfObject']:
                return self._handle_proof_image(
                    request.user, object_id, model_name, file_obj
                )
            
            else:
                return Response(
                    {
                        'success': False,
                        'error': f'Unknown model: {model_name}'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
        except Exception as e:
            logger.error(f"File upload error: {str(e)}", exc_info=True)
            return Response(
                {
                    'success': False,
                    'error': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _handle_class_photo(self, user, object_id, field_name, file_obj):
        """Обработка фото класса"""
        try:
            cls = ClassOfGrading.objects.get(id=object_id)
            
            # Проверка прав
            if cls.workspace.user != user:
                return Response(
                    {'success': False, 'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Сохранение в правильную директорию
            file_path = f"users/{user.id}/class_photos/{uuid.uuid4()}{self._get_extension(file_obj.name)}"
            saved_path = default_storage.save(file_path, ContentFile(file_obj.read()))
            file_url = default_storage.url(saved_path)
            
            # Обновление объекта
            cls.photo = file_url
            cls.save()
            
            logger.info(f"Updated ClassOfGrading {object_id} photo: {file_url}")
            
            return Response({
                'success': True,
                'message': 'Class photo uploaded successfully',
                'file_url': file_url,
                'file_size': file_obj.size,
            }, status=status.HTTP_200_OK)
            
        except ClassOfGrading.DoesNotExist:
            return Response(
                {'success': False, 'error': f'ClassOfGrading {object_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def _handle_object_photo(self, user, object_id, field_name, file_obj):
        """Обработка фото объекта"""
        try:
            obj = GradeObject.objects.get(id=object_id)
            
            # Проверка прав
            if obj.class_of_grading.workspace.user != user:
                return Response(
                    {'success': False, 'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Сохранение в правильную директорию
            file_path = f"users/{user.id}/object_photos/{uuid.uuid4()}{self._get_extension(file_obj.name)}"
            saved_path = default_storage.save(file_path, ContentFile(file_obj.read()))
            file_url = default_storage.url(saved_path)
            
            # Обновление объекта
            obj.photo = file_url
            obj.save()
            
            logger.info(f"Updated GradeObject {object_id} photo: {file_url}")
            
            return Response({
                'success': True,
                'message': 'Object photo uploaded successfully',
                'file_url': file_url,
                'file_size': file_obj.size,
            }, status=status.HTTP_200_OK)
            
        except GradeObject.DoesNotExist:
            return Response(
                {'success': False, 'error': f'GradeObject {object_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def _handle_media_item(self, user, object_id, field_name, file_obj, 
                          media_type, mime_type, caption):
        """
        Обработка MediaItem
        
        ВАЖНО: object_id здесь - это ID GradeObject, к которому принадлежит медиа
        """
        try:
            # object_id - это ID GradeObject, а не MediaItem!
            grade_object = GradeObject.objects.get(id=object_id)
            
            # Проверка прав
            if grade_object.class_of_grading.workspace.user != user:
                return Response(
                    {'success': False, 'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Определение типа медиа по MIME
            if not mime_type:
                mime_type = file_obj.content_type
            
            if not media_type:
                if mime_type and 'video' in mime_type:
                    media_type = 'video'
                else:
                    media_type = 'photo'
            
            # Сохранение файла
            subdir = 'videos' if media_type == 'video' else 'photos'
            file_path = f"users/{user.id}/media/{subdir}/{uuid.uuid4()}{self._get_extension(file_obj.name)}"
            saved_path = default_storage.save(file_path, ContentFile(file_obj.read()))
            file_url = default_storage.url(saved_path)
            
            # Создание MediaItem
            media_item = MediaItem.objects.create(
                grade_object=grade_object,
                media_type=media_type,
                mime_type=mime_type or 'application/octet-stream',
                caption=caption or '',
            )
            
            # Сохранение URI в зависимости от field_name
            if field_name == 'uri':
                media_item.uri = file_url
            elif field_name == 'thumbnailUri':
                media_item.thumbnail_uri = file_url
            else:
                media_item.uri = file_url  # по умолчанию
            
            media_item.save()
            
            logger.info(
                f"Created MediaItem for GradeObject {object_id}: "
                f"type={media_type}, url={file_url}"
            )
            
            return Response({
                'success': True,
                'message': 'Media uploaded successfully',
                'media_id': str(media_item.id),
                'file_url': file_url,
                'file_size': file_obj.size,
                'media_type': media_type,
            }, status=status.HTTP_200_OK)
            
        except GradeObject.DoesNotExist:
            return Response(
                {'success': False, 'error': f'GradeObject {object_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def _handle_note_photo(self, user, object_id, field_name, file_obj):
        """Обработка фото заметки"""
        try:
            # object_id - это ID GradeObject
            grade_object = GradeObject.objects.get(id=object_id)
            
            # Проверка прав
            if grade_object.class_of_grading.workspace.user != user:
                return Response(
                    {'success': False, 'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Сохранение файла
            file_path = f"users/{user.id}/note_photos/{uuid.uuid4()}{self._get_extension(file_obj.name)}"
            saved_path = default_storage.save(file_path, ContentFile(file_obj.read()))
            file_url = default_storage.url(saved_path)
            
            # Создание заметки с фото
            # Примечание: текст заметки должен быть отправлен в метаданных
            note = Note.objects.create(
                grade_object=grade_object,
                text='',  # Будет обновлено позже из метаданных
                photo_uri=file_url,
            )
            
            logger.info(f"Created Note with photo for GradeObject {object_id}")
            
            return Response({
                'success': True,
                'message': 'Note photo uploaded successfully',
                'note_id': str(note.id),
                'file_url': file_url,
                'file_size': file_obj.size,
            }, status=status.HTTP_200_OK)
            
        except GradeObject.DoesNotExist:
            return Response(
                {'success': False, 'error': f'GradeObject {object_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def _handle_proof_image(self, user, object_id, model_name, file_obj):
        """Обработка proof image для CategoryOfObject или SubCategoryOfObject"""
        try:
            # Получение объекта
            if model_name == 'CategoryOfObject':
                instance = CategoryOfObject.objects.get(id=object_id)
                workspace_user = instance.grade_object.class_of_grading.workspace.user
            else:  # SubCategoryOfObject
                instance = SubCategoryOfObject.objects.get(id=object_id)
                workspace_user = instance.category_of_object.grade_object.class_of_grading.workspace.user
            
            # Проверка прав
            if workspace_user != user:
                return Response(
                    {'success': False, 'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Сохранение файла
            file_path = f"users/{user.id}/proofs/{uuid.uuid4()}{self._get_extension(file_obj.name)}"
            saved_path = default_storage.save(file_path, ContentFile(file_obj.read()))
            file_url = default_storage.url(saved_path)
            
            # Создание или обновление Proof
            if instance.proof is None:
                proof = Proof.objects.create(image=file_url)
                instance.proof = proof
                instance.save()
            else:
                instance.proof.image = file_url
                instance.proof.save()
            
            logger.info(f"Updated proof image for {model_name} {object_id}")
            
            return Response({
                'success': True,
                'message': 'Proof image uploaded successfully',
                'file_url': file_url,
                'file_size': file_obj.size,
            }, status=status.HTTP_200_OK)
            
        except (CategoryOfObject.DoesNotExist, SubCategoryOfObject.DoesNotExist):
            return Response(
                {'success': False, 'error': f'{model_name} {object_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def _get_extension(self, filename):
        """Получение расширения файла"""
        if '.' in filename:
            return '.' + filename.rsplit('.', 1)[1].lower()
        return '.bin'


class SyncViewSet(viewsets.GenericViewSet):
    """
    ViewSet для синхронизации данных
    """
    
    permission_classes = [permissions.IsAuthenticated, IsOwnerPermission]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    def get_workspace(self):
        """Получение активного workspace пользователя"""
        workspace = UserWorkspace.objects.filter(
            user=self.request.user,
            # is_active=True
        ).first()
        
        if not workspace:
            # Создать workspace если его нет
            workspace = UserWorkspace.objects.create(
                user=self.request.user,
                # name='Default Workspace',
                # is_active=True
            )
        
        return workspace
    
    @action(detail=False, methods=['post'], url_path='import')
    def import_data(self, request):
        """
        Импорт данных из Realm в Django
        POST /api/integration/sync/import/
        
        Body:
        {
            "data": {...},  // Данные из Realm
            "merge": true,  // Объединить или заменить
            "validate_only": false
        }
        """
        try:
            workspace = self.get_workspace()
            
            serializer = ImportRequestSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            realm_data = serializer.validated_data['data']
            merge = serializer.validated_data['merge']
            validate_only = serializer.validated_data['validate_only']
            
            # Валидация
            if validate_only:
                validation = self._validate_realm_data(realm_data)
                serializer = ValidationReportSerializer(validation)
                return Response(serializer.data, status=status.HTTP_200_OK)
            
            # Экспорт данных
            export_service = ExportService(workspace)
            result = export_service.export_data(realm_data, merge=merge)
            
            return Response(
                {
                    'success': result['success'],
                    'message': result.get('message', ''),
                    'stats': result.get('stats', {}),
                    'timestamp': result.get('timestamp'),
                },
                status=status.HTTP_200_OK if result['success'] else status.HTTP_400_BAD_REQUEST
            )
            
        except Exception as e:
            logger.error(f"Import error: {str(e)}", exc_info=True)
            return Response(
                {
                    'success': False,
                    'error': str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='export')
    def export_data(self, request):
        """
        Экспорт данных из Django в Realm
        GET /api/integration/sync/export/
        """
        try:
            workspace = self.get_workspace()
            
            serializer = ExportRequestSerializer(data=request.query_params)
            serializer.is_valid(raise_exception=True)
            
            params = serializer.validated_data
            download_files = params.get('download_files', True)
            
            # Импорт данных
            import_service = ImportService(workspace)
            result = import_service.import_all(download_files=download_files)
            
            return Response(
                {
                    'success': True,
                    'data': result['data'],
                    'stats': result.get('stats', {}),
                },
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Export error: {str(e)}")
            return Response(
                {
                    'success': False,
                    'error': str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='status')
    def get_status(self, request):
        """Получить статус синхронизации"""
        try:
            workspace = self.get_workspace()
            
            pending_changes = 0  # TODO: реализовать отслеживание изменений
            
            data = {
                'last_sync_at': workspace.last_sync_at,
                'sync_enabled': True,
                'pending_changes': pending_changes,
            }
            
            serializer = SyncStatusSerializer(data)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Status error: {str(e)}")
            return Response(
                {
                    'success': False,
                    'error': str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='statistics')
    def get_statistics(self, request):
        """Получить статистику"""
        try:
            workspace = self.get_workspace()
            
            total_classes = ClassOfGrading.objects.filter(workspace=workspace).count()
            total_objects = GradeObject.objects.filter(
                class_of_grading__workspace=workspace
            ).count()
            total_categories = Category.objects.filter(
                class_of_grading__workspace=workspace
            ).count()
            total_ratings = CategoryOfObject.objects.filter(
                grade_object__class_of_grading__workspace=workspace
            ).count()
            total_media = MediaItem.objects.filter(
                grade_object__class_of_grading__workspace=workspace
            ).count()
            total_notes = Note.objects.filter(
                grade_object__class_of_grading__workspace=workspace
            ).count()
            
            data = {
                'total_classes': total_classes,
                'total_objects': total_objects,
                'total_categories': total_categories,
                'total_ratings': total_ratings,
                'total_media': total_media,
                'total_notes': total_notes,
            }
            
            return Response(data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Statistics error: {str(e)}")
            return Response(
                {
                    'success': False,
                    'error': str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='bulk-export')
    def bulk_export(self, request):
        """Массовый экспорт выбранных данных"""
        try:
            workspace = self.get_workspace()
            
            serializer = BulkExportSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            params = serializer.validated_data
            object_ids = params.get('object_ids', [])
            category_ids = params.get('category_ids', [])
            class_ids = params.get('class_ids', [])
            with_relationships = params.get('with_relationships', True)
            download_files = params.get('download_files', True)
            
            # Экспорт
            import_service = ImportService(workspace)
            all_data = import_service.import_all(download_files=download_files)['data']
            
            filtered_data = {'ClassOfGrading': [], 'Tag': [], 'RankType': []}
            
            # Фильтрация
            if class_ids:
                class_id_strs = [str(id) for id in class_ids]
                filtered_data['ClassOfGrading'] = [
                    c for c in all_data.get('ClassOfGrading', [])
                    if c['_id'] in class_id_strs
                ]
            
            if object_ids:
                object_id_strs = [str(id) for id in object_ids]
                for cls in all_data.get('ClassOfGrading', []):
                    filtered_objects = [
                        o for o in cls.get('objects', [])
                        if o['_id'] in object_id_strs
                    ]
                    if filtered_objects:
                        cls_copy = cls.copy()
                        cls_copy['objects'] = filtered_objects
                        filtered_data['ClassOfGrading'].append(cls_copy)
            
            if category_ids:
                category_id_strs = [str(id) for id in category_ids]
                for cls in all_data.get('ClassOfGrading', []):
                    filtered_categories = [
                        c for c in cls.get('categories', [])
                        if c['_id'] in category_id_strs
                    ]
                    if filtered_categories:
                        cls_copy = cls.copy()
                        cls_copy['categories'] = filtered_categories
                        filtered_data['ClassOfGrading'].append(cls_copy)
            
            # Копирование тегов и типов рангов
            filtered_data['Tag'] = all_data.get('Tag', [])
            filtered_data['RankType'] = all_data.get('RankType', [])
            
            return Response(
                {
                    'success': True,
                    'data': filtered_data,
                    'size_bytes': self._get_json_size(filtered_data),
                    'files_included': download_files,
                },
                status=status.HTTP_200_OK
            )
        
        except Exception as e:
            logger.error(f"Bulk export error: {str(e)}")
            return Response(
                {
                    'success': False,
                    'error': str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get', 'post'], url_path='checkpoint')
    def checkpoint(self, request):
        """
        GET: Получить последнюю контрольную точку
        POST: Создать новую контрольную точку
        """
        try:
            workspace = self.get_workspace()
            
            if request.method == 'GET':
                cache_key = f'checkpoint_{workspace.id}'
                checkpoint = cache.get(cache_key)
                
                if not checkpoint:
                    checkpoint = self._create_checkpoint(workspace)
                    cache.set(cache_key, checkpoint, 86400)
                
                serializer = DataCheckpointSerializer(checkpoint)
                return Response(serializer.data)
            
            else:  # POST
                checkpoint = self._create_checkpoint(workspace)
                cache_key = f'checkpoint_{workspace.id}'
                cache.set(cache_key, checkpoint, 86400)
                
                serializer = DataCheckpointSerializer(checkpoint)
                return Response(
                    {
                        'success': True,
                        'checkpoint': serializer.data,
                    },
                    status=status.HTTP_201_CREATED
                )
        
        except Exception as e:
            logger.error(f"Checkpoint error: {str(e)}")
            return Response(
                {
                    'success': False,
                    'error': str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    # === Вспомогательные методы ===
    
    def _validate_realm_data(self, data: dict) -> dict:
        """Валидация структуры данных Realm"""
        validator = RealmDataValidator()
        errors = []
        warnings = []
        total_records = 0
        valid_records = 0
        
        # Валидация
        for model_name, items in data.items():
            if not items:
                continue
            
            total_records += len(items)
            
            for item in items:
                is_valid = True
                
                if model_name == 'ClassOfGrading':
                    is_valid = validator.validate_class_of_grading(item)
                elif model_name == 'Category':
                    is_valid = validator.validate_category(item)
                elif model_name == 'GradeObject':
                    is_valid = validator.validate_grade_object(item)
                elif model_name == 'Tag':
                    is_valid = validator.validate_tag(item)
                elif model_name == 'RankType':
                    is_valid = validator.validate_rank_type(item)
                
                if is_valid:
                    valid_records += 1
                else:
                    errors.append({
                        'type': model_name,
                        'id': item.get('_id'),
                        'message': 'Missing required fields',
                    })
        
        return {
            'is_valid': len(errors) == 0,
            'total_records': total_records,
            'valid_records': valid_records,
            'errors': errors,
            'warnings': warnings,
        }
    
    def _create_checkpoint(self, workspace: UserWorkspace) -> dict:
        """Создание контрольной точки"""
        import_service = ImportService(workspace)
        all_data = import_service.import_all(download_files=False)['data']
        
        # Подсчет объектов
        total_classes = len(all_data.get('ClassOfGrading', []))
        total_objects = sum(
            len(cls.get('objects', []))
            for cls in all_data.get('ClassOfGrading', [])
        )
        total_categories = sum(
            len(cls.get('categories', []))
            for cls in all_data.get('ClassOfGrading', [])
        )
        total_ratings = sum(
            len(obj.get('categories_of_object', []))
            for cls in all_data.get('ClassOfGrading', [])
            for obj in cls.get('objects', [])
        )
        
        return {
            'workspace_id': str(workspace.id),
            'total_classes': total_classes,
            'total_objects': total_objects,
            'total_categories': total_categories,
            'total_ratings': total_ratings,
            'data_size_bytes': self._get_json_size(all_data),
            'created_at': timezone.now(),
        }
    
    @staticmethod
    def _get_json_size(data: dict) -> int:
        """Получение размера JSON"""
        return len(json.dumps(data, ensure_ascii=False).encode('utf-8'))
