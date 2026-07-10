"""
Сервис импорта данных из Django в Realm
Экспортирует данные из Django для отправки в React Native
"""

from typing import Dict, Any, List
from datetime import datetime
from django.utils import timezone
import logging

from grading.models import (
    UserWorkspace, RankType, Tag, ClassOfGrading, Category, SubCategory,
    GradeObject, MediaItem, Note, Proof, CategoryOfObject, SubCategoryOfObject
)
from .file_handlers import FileUploadManager

logger = logging.getLogger(__name__)


class ImportService:
    """
    Сервис импорта данных из Django в Realm
    Преобразует данные Django в формат для React Native Realm
    """
    
    def __init__(self, workspace: UserWorkspace):
        self.workspace = workspace
        self.file_manager = FileUploadManager(workspace.user.id)
    
    def import_all(
        self,
        download_files: bool = True,
        batch_size: int = 100
    ) -> Dict[str, Any]:
        """
        Импортирует все данные из Django в формат Realm
        
        Args:
            download_files: Скачивать файлы в base64
            batch_size: Размер батча для обработки объектов
        
        Returns:
            Словарь с данными в формате Realm
        """
        try:
            logger.info(f"Starting import for workspace {self.workspace.id}")
            
            data = {
                'RankType': self._serialize_rank_types(),
                'Tag': self._serialize_tags(),
                'ClassOfGrading': self._serialize_classes(download_files),
            }
            
            logger.info(f"Import completed successfully")
            
            return {
                'success': True,
                'data': data,
                'timestamp': timezone.now().isoformat(),
                'file_stats': self.file_manager.get_stats() if download_files else None,
            }
            
        except Exception as e:
            logger.error(f"Import error: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'timestamp': timezone.now().isoformat(),
            }
    
    def _serialize_rank_types(self) -> List[Dict]:
        """Сериализация типов рангов"""
        rank_types = RankType.objects.filter(
            workspace=self.workspace
        ).order_by('from_rank')
        
        result = []
        for rt in rank_types:
            result.append({
                '_id': str(rt.id),
                'name': rt.name,
                'fromRank': float(rt.from_rank) if rt.from_rank else 0.0,
                'color': rt.color,
                'createdAt': rt.created_at.isoformat(),
            })
        
        logger.info(f"Serialized {len(result)} rank types")
        return result
    
    def _serialize_tags(self) -> List[Dict]:
        """Сериализация тегов"""
        tags = Tag.objects.filter(
            workspace=self.workspace
        ).order_by('name')
        
        result = []
        for tag in tags:
            result.append({
                '_id': str(tag.id),
                'name': tag.name,
                'parentTag': str(tag.parent_tag.id) if tag.parent_tag else None,
                'createdAt': tag.created_at.isoformat(),
            })
        
        logger.info(f"Serialized {len(result)} tags")
        return result
    
    def _serialize_classes(self, download_files: bool) -> List[Dict]:
        """Сериализация классов с вложенными данными"""
        classes = ClassOfGrading.objects.filter(
            workspace=self.workspace
        ).prefetch_related(
            'categories__subcategories',
            'grade_objects__media',
            'grade_objects__notes',
            'grade_objects__category_ratings__subcategory_ratings',
            'class_tags',
            'class_rank_types',
        ).order_by('priority', 'name')
        
        result = []
        
        for cls in classes:
            logger.info(f"Serializing class: {cls.name}")
            
            class_data = {
                '_id': str(cls.id),
                'name': cls.name,
                'photo': cls.photo if cls.photo else None,
                'photo_base64': None,
                'priority': cls.priority,
                'objectName': cls.object_name,
                'objectsName': cls.objects_name,
                'noteName': cls.note_name,
                'notesName': cls.notes_name,
                'categories': self._serialize_categories(cls),
                'objects': self._serialize_objects(cls, download_files),
                'tags': [{'_id': str(tag.id)} for tag in cls.class_tags.all()],
                'rankTypes': [{'_id': str(rt.id)} for rt in cls.class_rank_types.all()],
            }
            
            # Скачивание фото класса
            if download_files and cls.photo:
                class_data['photo_base64'] = self.file_manager.download_file_to_base64(
                    cls.photo
                )
            
            result.append(class_data)
        
        logger.info(f"Serialized {len(result)} classes")
        return result
    
    def _serialize_categories(self, class_obj: ClassOfGrading) -> List[Dict]:
        """Сериализация категорий"""
        result = []
        
        for cat in class_obj.categories.all():
            result.append({
                '_id': str(cat.id),
                'name': cat.name,
                'priority': cat.priority,
                'weight': cat.weight,
                'subcategories': [
                    {
                        '_id': str(sub.id),
                        'name': sub.name,
                        'priority': sub.priority,
                        'weight': sub.weight,
                    }
                    for sub in cat.subcategories.all()
                ],
            })
        
        return result
    
    def _serialize_objects(
        self,
        class_obj: ClassOfGrading,
        download_files: bool
    ) -> List[Dict]:
        """Сериализация объектов"""
        result = []
        
        for obj in class_obj.grade_objects.all():
            logger.debug(f"  Serializing object: {obj.name}")
            
            obj_data = {
                '_id': str(obj.id),
                'name': obj.name,
                'photo': obj.photo if obj.photo else None,
                'photo_base64': None,
                'object_name': obj.object_name,
                'description': obj.description,
                'overall_rank': float(obj.overall_rank) if obj.overall_rank else None,
                'tags': [{'_id': str(tag.id)} for tag in obj.object_tags.all()],
                'media': self._serialize_media(obj, download_files),
                'notes': self._serialize_notes(obj, download_files),
                'categories_of_object': self._serialize_ratings(obj, download_files),
            }
            
            # Скачивание фото объекта
            if download_files and obj.photo:
                obj_data['photo_base64'] = self.file_manager.download_file_to_base64(
                    obj.photo
                )
            
            result.append(obj_data)
        
        return result
    
    def _serialize_media(
        self,
        grade_object: GradeObject,
        download_files: bool
    ) -> List[Dict]:
        """Сериализация медиа"""
        result = []
        
        for media in grade_object.media.all():
            media_data = {
                'uri': media.uri if media else None,
                'uri_base64': None,
                'mediaType': media.media_type,
                'mimeType': media.mime_type,
                'thumbnailUri': media.thumbnail_uri if media.thumbnail_uri else None,
                'thumbnail_base64': None,
                'caption': media.caption,
                'createdAt': media.created_at.isoformat(),
            }
            
            # Скачивание медиа
            if download_files:
                if media.uri:
                    media_data['uri_base64'] = (
                        self.file_manager.download_file_to_base64(media.uri)
                    )
                
                if media.thumbnail_uri:
                    media_data['thumbnail_base64'] = (
                        self.file_manager.download_file_to_base64(
                            media.thumbnail_uri
                        )
                    )
            
            result.append(media_data)
        
        return result
    
    def _serialize_notes(
        self,
        grade_object: GradeObject,
        download_files: bool
    ) -> List[Dict]:
        """Сериализация заметок"""
        result = []
        
        for note in grade_object.notes.all():
            note_data = {
                'text': note.text,
                'author': note.author,
                'pinned': note.pinned,
                'photoUri': note.photo_uri if note.photo_uri else None,
                'photo_base64': None,
                'createdAt': note.created_at.isoformat(),
            }
            
            # Скачивание фото заметки
            if download_files and note.photo_uri:
                note_data['photo_base64'] = (
                    self.file_manager.download_file_to_base64(note.photo_uri)
                )
            
            result.append(note_data)
        
        return result
    
    def _serialize_ratings(
        self,
        grade_object: GradeObject,
        download_files: bool
    ) -> List[Dict]:
        """Сериализация оценок категорий"""
        result = []
        
        for rating in grade_object.category_ratings.all():
            rating_data = {
                '_id': str(rating.id),
                'category': {'_id': str(rating.category.id)},
                'rank': float(rating.rank) if rating.rank else None,
                'proof': self._serialize_proof(rating.proof, download_files) if rating.proof else None,
                'subcategories_of_category': self._serialize_subratings(
                    rating,
                    download_files
                ),
            }
            
            result.append(rating_data)
        
        return result
    
    def _serialize_subratings(
        self,
        rating: CategoryOfObject,
        download_files: bool
    ) -> List[Dict]:
        """Сериализация оценок подкатегорий"""
        result = []
        
        for subrating in rating.subcategory_ratings.all():
            result.append({
                '_id': str(subrating.id),
                'subcategory': {'_id': str(subrating.subcategory.id)},
                'rank': float(subrating.rank) if subrating.rank else None,
                'color': subrating.color,
                'proof': self._serialize_proof(
                    subrating.proof,
                    download_files
                ) if subrating.proof else None,
            })
        
        return result
    
    def _serialize_proof(self, proof: Proof, download_files: bool) -> Dict:
        """Сериализация доказательства"""
        proof_data = {
            'image': proof.image if proof.image else None,
            'image_base64': None,
            'text': proof.text,
        }
        
        # Скачивание изображения доказательства
        if download_files and proof.image:
            proof_data['image_base64'] = (
                self.file_manager.download_file_to_base64(proof.image)
            )
        
        return proof_data
