"""
Сервис экспорта данных из Realm в Django
Импортирует данные из React Native в PostgreSQL/SQLite
"""

from typing import Dict, List, Any
from django.db import transaction
from django.utils import timezone
import logging

from grading.models import (
    UserWorkspace, RankType, Tag, ClassOfGrading, Category, SubCategory,
    GradeObject, MediaItem, Note, Proof, CategoryOfObject, SubCategoryOfObject,
    ObjectTag, ClassTag, ClassRankType
)
from .file_handlers import FileUploadManager
from .validators import RealmDataValidator

logger = logging.getLogger(__name__)


class ExportService:
    """
    Сервис экспорта данных из Realm в Django
    Обрабатывает вложенные данные и файлы
    """
    
    def __init__(self, workspace: UserWorkspace):
        self.workspace = workspace
        self.file_manager = FileUploadManager(workspace.user.id)
        self.validator = RealmDataValidator()
        self.export_stats = {
            'total_items': 0,
            'created_items': 0,
            'updated_items': 0,
            'errors': [],
        }
    
    @transaction.atomic
    def export_data(
        self,
        realm_data: Dict[str, List[Dict]],
        merge: bool = True
    ) -> Dict[str, Any]:
        """
        Экспорт данных из Realm в Django
        
        Args:
            realm_data: Плоские данные из Realm
            merge: Объединить с существующими или заменить
        
        Returns:
            Результат экспорта со статистикой
        """
        try:
            logger.info(f"Starting export for workspace {self.workspace.id}")
            logger.info(f"Merge mode: {merge}")
            
            # Сброс статистики
            self.export_stats = {
                'total_items': 0,
                'created_items': 0,
                'updated_items': 0,
                'errors': [],
            }
            
            # Экспорт в правильном порядке (зависимости)
            self._export_rank_types(realm_data.get('RankType', []))
            self._export_tags(realm_data.get('Tag', []))
            self._export_classes(realm_data.get('ClassOfGrading', []))
            self._export_categories(realm_data.get('Category', []))
            self._export_subcategories(realm_data.get('SubCategory', []))
            self._export_grade_objects(realm_data.get('GradeObject', []))
            self._export_proofs(realm_data.get('Proof', []))
            self._export_media_items(realm_data.get('MediaItem', []))
            self._export_notes(realm_data.get('Note', []))
            self._export_category_of_objects(realm_data.get('CategoryOfObject', []))
            self._export_subcategory_of_objects(realm_data.get('SubCategoryOfObject', []))
            self._export_relationships(realm_data)
            
            # Обновление времени синхронизации
            self._update_workspace_sync_time()
            
            # Добавление статистики файлов
            file_stats = self.file_manager.get_stats()
            
            logger.info(f"Export completed successfully")
            logger.info(f"Stats: {self.export_stats}")
            logger.info(f"File stats: {file_stats}")
            
            return {
                'success': True,
                'message': 'Экспорт завершен успешно',
                'stats': {
                    **self.export_stats,
                    **file_stats,
                },
                'timestamp': timezone.now().isoformat(),
            }
            
        except Exception as e:
            logger.error(f"Export error: {str(e)}", exc_info=True)
            raise
    
    def _export_rank_types(self, rank_types: List[Dict]):
        """Экспорт типов рангов"""
        logger.info(f"Processing {len(rank_types)} rank types")
        
        for item in rank_types:
            try:
                defaults = {
                    'name': item['name'],
                    'from_rank': item.get('fromRank', 0),
                    'color': item.get('color'),
                    'workspace': self.workspace,
                }
                
                obj, created = RankType.objects.update_or_create(
                    id=item['_id'],
                    defaults=defaults
                )
                
                self.export_stats['total_items'] += 1
                if created:
                    self.export_stats['created_items'] += 1
                else:
                    self.export_stats['updated_items'] += 1
                    
            except Exception as e:
                error_msg = f"RankType {item.get('_id')}: {str(e)}"
                logger.error(error_msg)
                self.export_stats['errors'].append(error_msg)
    
    def _export_tags(self, tags: List[Dict]):
        """Экспорт тегов"""
        logger.info(f"Processing {len(tags)} tags")
        
        # Сортировка: сначала теги без родителя, потом с родителем
        tags_no_parent = [t for t in tags if not t.get('parent_tag')]
        tags_with_parent = [t for t in tags if t.get('parent_tag')]
        
        for item in tags_no_parent + tags_with_parent:
            try:
                parent_tag = None
                if item.get('parent_tag'):
                    try:
                        parent_tag = Tag.objects.get(id=item['parent_tag'])
                    except Tag.DoesNotExist:
                        logger.warning(f"Parent tag {item['parent_tag']} not found")
                
                defaults = {
                    'name': item['name'],
                    'parent_tag': parent_tag,
                    'workspace': self.workspace,
                }
                
                obj, created = Tag.objects.update_or_create(
                    id=item['_id'],
                    defaults=defaults
                )
                
                self.export_stats['total_items'] += 1
                if created:
                    self.export_stats['created_items'] += 1
                else:
                    self.export_stats['updated_items'] += 1
                    
            except Exception as e:
                error_msg = f"Tag {item.get('_id')}: {str(e)}"
                logger.error(error_msg)
                self.export_stats['errors'].append(error_msg)
    
    def _export_classes(self, classes: List[Dict]):
        """Экспорт классов"""
        logger.info(f"Processing {len(classes)} classes")
        
        for item in classes:
            try:
                if not self.validator.validate_class_of_grading(item):
                    raise ValueError("Invalid class data")
                
                defaults = {
                    'name': item['name'],
                    'priority': item.get('priority', 1),
                    'object_name': item.get('objectName'),
                    'objects_name': item.get('objectsName'),
                    'note_name': item.get('noteName'),
                    'notes_name': item.get('notesName'),
                    'workspace': self.workspace,
                }
                
                # Обработка фото
                if item.get('photo_base64'):
                    photo_url = self.file_manager.upload_file_from_base64(
                        item['photo_base64'],
                        item['_id'],
                        'class_photo'
                    )
                    if photo_url:
                        defaults['photo'] = photo_url
                elif item.get('photo'):
                    defaults['photo'] = item['photo']
                
                obj, created = ClassOfGrading.objects.update_or_create(
                    id=item['_id'],
                    defaults=defaults
                )
                
                self.export_stats['total_items'] += 1
                if created:
                    self.export_stats['created_items'] += 1
                else:
                    self.export_stats['updated_items'] += 1
                    
            except Exception as e:
                error_msg = f"ClassOfGrading {item.get('_id')}: {str(e)}"
                logger.error(error_msg)
                self.export_stats['errors'].append(error_msg)
    
    def _export_categories(self, categories: List[Dict]):
        """Экспорт категорий"""
        logger.info(f"Processing {len(categories)} categories")
        
        for item in categories:
            try:
                class_id = item.get('class_of_grading')
                if not class_id:
                    continue
                
                try:
                    class_obj = ClassOfGrading.objects.get(id=class_id)
                except ClassOfGrading.DoesNotExist:
                    continue
                
                defaults = {
                    'name': item['name'],
                    'priority': item.get('priority', 1),
                    'weight': item.get('weight'),
                }
                
                obj, created = Category.objects.update_or_create(
                    id=item['_id'],
                    class_of_grading=class_obj,
                    defaults=defaults
                )
                
                self.export_stats['total_items'] += 1
                if created:
                    self.export_stats['created_items'] += 1
                else:
                    self.export_stats['updated_items'] += 1
                    
            except Exception as e:
                error_msg = f"Category {item.get('_id')}: {str(e)}"
                logger.error(error_msg)
                self.export_stats['errors'].append(error_msg)
    
    def _export_subcategories(self, subcategories: List[Dict]):
        """Экспорт подкатегорий"""
        logger.info(f"Processing {len(subcategories)} subcategories")
        
        for item in subcategories:
            try:
                category_id = item.get('category')
                if not category_id:
                    continue
                
                try:
                    category = Category.objects.get(id=category_id)
                except Category.DoesNotExist:
                    continue
                
                defaults = {
                    'name': item['name'],
                    'priority': item.get('priority', 1),
                    'weight': item.get('weight'),
                }
                
                obj, created = SubCategory.objects.update_or_create(
                    id=item['_id'],
                    category=category,
                    defaults=defaults
                )
                
                self.export_stats['total_items'] += 1
                if created:
                    self.export_stats['created_items'] += 1
                else:
                    self.export_stats['updated_items'] += 1
                    
            except Exception as e:
                error_msg = f"SubCategory {item.get('_id')}: {str(e)}"
                logger.error(error_msg)
                self.export_stats['errors'].append(error_msg)
    
    def _export_grade_objects(self, grade_objects: List[Dict]):
        """Экспорт объектов"""
        logger.info(f"Processing {len(grade_objects)} grade objects")
        
        for item in grade_objects:
            try:
                class_id = item.get('class_of_grading')
                if not class_id:
                    continue
                
                try:
                    class_obj = ClassOfGrading.objects.get(id=class_id)
                except ClassOfGrading.DoesNotExist:
                    continue
                
                defaults = {
                    'name': item['name'],
                    'object_name': item.get('object_name'),
                    'description': item.get('description'),
                    'overall_rank': item.get('overall_rank'),
                }
                
                # Обработка фото
                if item.get('photo_base64'):
                    photo_url = self.file_manager.upload_file_from_base64(
                        item['photo_base64'],
                        item['_id'],
                        'object_photo'
                    )
                    if photo_url:
                        defaults['photo'] = photo_url
                elif item.get('photo'):
                    defaults['photo'] = item['photo']
                
                obj, created = GradeObject.objects.update_or_create(
                    id=item['_id'],
                    class_of_grading=class_obj,
                    defaults=defaults
                )
                
                self.export_stats['total_items'] += 1
                if created:
                    self.export_stats['created_items'] += 1
                else:
                    self.export_stats['updated_items'] += 1
                    
            except Exception as e:
                error_msg = f"GradeObject {item.get('_id')}: {str(e)}"
                logger.error(error_msg)
                self.export_stats['errors'].append(error_msg)
    
    def _export_proofs(self, proofs: List[Dict]):
        """Экспорт доказательств"""
        logger.info(f"Processing {len(proofs)} proofs")
        
        for item in proofs:
            try:
                defaults = {
                    'text': item.get('text'),
                }
                
                # Обработка изображения
                if item.get('image_base64'):
                    image_url = self.file_manager.upload_file_from_base64(
                        item['image_base64'],
                        item['_id'],
                        'proof'
                    )
                    if image_url:
                        defaults['image'] = image_url
                elif item.get('image'):
                    defaults['image'] = item['image']
                
                obj, created = Proof.objects.update_or_create(
                    id=item['_id'],
                    defaults=defaults
                )
                
                self.export_stats['total_items'] += 1
                if created:
                    self.export_stats['created_items'] += 1
                else:
                    self.export_stats['updated_items'] += 1
                    
            except Exception as e:
                error_msg = f"Proof {item.get('_id')}: {str(e)}"
                logger.error(error_msg)
                self.export_stats['errors'].append(error_msg)
    
    def _export_media_items(self, media_items: List[Dict]):
        """Экспорт медиа"""
        logger.info(f"Processing {len(media_items)} media items")
        
        for item in media_items:
            try:
                grade_object_id = item.get('grade_object')
                if not grade_object_id:
                    continue
                
                try:
                    grade_object = GradeObject.objects.get(id=grade_object_id)
                except GradeObject.DoesNotExist:
                    continue
                
                defaults = {
                    'media_type': item.get('mediaType', 'image'),
                    'mime_type': item.get('mimeType'),
                    'caption': item.get('caption'),
                }
                
                # Обработка URI
                if item.get('uri_base64'):
                    uri_url = self.file_manager.upload_file_from_base64(
                        item['uri_base64'],
                        item['_id'],
                        'media'
                    )
                    if uri_url:
                        defaults['uri'] = uri_url
                elif item.get('uri'):
                    defaults['uri'] = item['uri']
                
                # Обработка thumbnail
                if item.get('thumbnail_base64'):
                    thumb_url = self.file_manager.upload_file_from_base64(
                        item['thumbnail_base64'],
                        f"{item['_id']}_thumb",
                        'media'
                    )
                    if thumb_url:
                        defaults['thumbnail_uri'] = thumb_url
                elif item.get('thumbnailUri'):
                    defaults['thumbnail_uri'] = item['thumbnailUri']
                
                obj, created = MediaItem.objects.update_or_create(
                    id=item['_id'],
                    grade_object=grade_object,
                    defaults=defaults
                )
                
                self.export_stats['total_items'] += 1
                if created:
                    self.export_stats['created_items'] += 1
                else:
                    self.export_stats['updated_items'] += 1
                    
            except Exception as e:
                error_msg = f"MediaItem {item.get('_id')}: {str(e)}"
                logger.error(error_msg)
                self.export_stats['errors'].append(error_msg)
    
    def _export_notes(self, notes: List[Dict]):
        """Экспорт заметок"""
        logger.info(f"Processing {len(notes)} notes")
        
        for item in notes:
            try:
                grade_object_id = item.get('grade_object')
                if not grade_object_id:
                    continue
                
                try:
                    grade_object = GradeObject.objects.get(id=grade_object_id)
                except GradeObject.DoesNotExist:
                    continue
                
                defaults = {
                    'text': item['text'],
                    'author': item.get('author'),
                    'pinned': item.get('pinned', False),
                }
                
                # Обработка фото заметки
                if item.get('photo_base64'):
                    photo_url = self.file_manager.upload_file_from_base64(
                        item['photo_base64'],
                        item['_id'],
                        'note_photo'
                    )
                    if photo_url:
                        defaults['photo_uri'] = photo_url
                elif item.get('photoUri'):
                    defaults['photo_uri'] = item['photoUri']
                
                obj, created = Note.objects.update_or_create(
                    id=item['_id'],
                    grade_object=grade_object,
                    defaults=defaults
                )
                
                self.export_stats['total_items'] += 1
                if created:
                    self.export_stats['created_items'] += 1
                else:
                    self.export_stats['updated_items'] += 1
                    
            except Exception as e:
                error_msg = f"Note {item.get('_id')}: {str(e)}"
                logger.error(error_msg)
                self.export_stats['errors'].append(error_msg)
    
    def _export_category_of_objects(self, category_of_objects: List[Dict]):
        """Экспорт оценок категорий"""
        logger.info(f"Processing {len(category_of_objects)} category ratings")
        
        for item in category_of_objects:
            try:
                category_id = item.get('category')
                object_id = item.get('object')
                
                if not (category_id and object_id):
                    continue
                
                try:
                    category = Category.objects.get(id=category_id)
                    grade_object = GradeObject.objects.get(id=object_id)
                except (Category.DoesNotExist, GradeObject.DoesNotExist):
                    continue
                
                proof = None
                proof_id = item.get('proof')
                if proof_id:
                    try:
                        proof = Proof.objects.get(id=proof_id)
                    except Proof.DoesNotExist:
                        pass
                
                defaults = {
                    'rank': item.get('rank'),
                    'proof': proof,
                }
                
                obj, created = CategoryOfObject.objects.update_or_create(
                    id=item['_id'],
                    category=category,
                    grade_object=grade_object,
                    defaults=defaults
                )
                
                self.export_stats['total_items'] += 1
                if created:
                    self.export_stats['created_items'] += 1
                else:
                    self.export_stats['updated_items'] += 1
                    
            except Exception as e:
                error_msg = f"CategoryOfObject {item.get('_id')}: {str(e)}"
                logger.error(error_msg)
                self.export_stats['errors'].append(error_msg)
    
    def _export_subcategory_of_objects(self, subcategory_of_objects: List[Dict]):
        """Экспорт оценок подкатегорий"""
        logger.info(f"Processing {len(subcategory_of_objects)} subcategory ratings")
        
        for item in subcategory_of_objects:
            try:
                subcategory_id = item.get('subcategory')
                category_of_object_id = item.get('category_of_object')
                
                if not (subcategory_id and category_of_object_id):
                    continue
                
                try:
                    subcategory = SubCategory.objects.get(id=subcategory_id)
                    category_of_object = CategoryOfObject.objects.get(
                        id=category_of_object_id
                    )
                except (SubCategory.DoesNotExist, CategoryOfObject.DoesNotExist):
                    continue
                
                proof = None
                proof_id = item.get('proof')
                if proof_id:
                    try:
                        proof = Proof.objects.get(id=proof_id)
                    except Proof.DoesNotExist:
                        pass
                
                defaults = {
                    'rank': item.get('rank'),
                    'color': item.get('color'),
                    'proof': proof,
                }
                
                obj, created = SubCategoryOfObject.objects.update_or_create(
                    id=item['_id'],
                    subcategory=subcategory,
                    category_of_object=category_of_object,
                    defaults=defaults
                )
                
                self.export_stats['total_items'] += 1
                if created:
                    self.export_stats['created_items'] += 1
                else:
                    self.export_stats['updated_items'] += 1
                    
            except Exception as e:
                error_msg = f"SubCategoryOfObject {item.get('_id')}: {str(e)}"
                logger.error(error_msg)
                self.export_stats['errors'].append(error_msg)
    
    def _export_relationships(self, realm_data: Dict[str, List[Dict]]):
        """Экспорт M2M отношений"""
        logger.info("Processing relationships")
        
        # ObjectTag
        for item in realm_data.get('ObjectTag', []):
            try:
                if not item.get('grade_object') or not item.get('tag'):
                    continue
                
                grade_object = GradeObject.objects.get(id=item['grade_object'])
                tag = Tag.objects.get(id=item['tag'])
                
                obj, created = ObjectTag.objects.get_or_create(
                    id=item['_id'],
                    grade_object=grade_object,
                    tag=tag
                )
                
                self.export_stats['total_items'] += 1
                if created:
                    self.export_stats['created_items'] += 1
                else:
                    self.export_stats['updated_items'] += 1
                    
            except Exception as e:
                error_msg = f"ObjectTag {item.get('_id')}: {str(e)}"
                logger.error(error_msg)
                self.export_stats['errors'].append(error_msg)
        
        # ClassTag
        for item in realm_data.get('ClassTag', []):
            try:
                if not item.get('class_of_grading') or not item.get('tag'):
                    continue
                
                class_obj = ClassOfGrading.objects.get(id=item['class_of_grading'])
                tag = Tag.objects.get(id=item['tag'])
                
                obj, created = ClassTag.objects.get_or_create(
                    id=item['_id'],
                    class_of_grading=class_obj,
                    tag=tag
                )
                
                self.export_stats['total_items'] += 1
                if created:
                    self.export_stats['created_items'] += 1
                else:
                    self.export_stats['updated_items'] += 1
                    
            except Exception as e:
                error_msg = f"ClassTag {item.get('_id')}: {str(e)}"
                logger.error(error_msg)
                self.export_stats['errors'].append(error_msg)
        
        # ClassRankType
        for item in realm_data.get('ClassRankType', []):
            try:
                if not item.get('class_of_grading') or not item.get('rank_type'):
                    continue
                
                class_obj = ClassOfGrading.objects.get(id=item['class_of_grading'])
                rank_type = RankType.objects.get(id=item['rank_type'])
                
                obj, created = ClassRankType.objects.get_or_create(
                    id=item['_id'],
                    class_of_grading=class_obj,
                    rank_type=rank_type
                )
                
                self.export_stats['total_items'] += 1
                if created:
                    self.export_stats['created_items'] += 1
                else:
                    self.export_stats['updated_items'] += 1
                    
            except Exception as e:
                error_msg = f"ClassRankType {item.get('_id')}: {str(e)}"
                logger.error(error_msg)
                self.export_stats['errors'].append(error_msg)
    
    def _update_workspace_sync_time(self):
        """Обновление времени синхронизации"""
        self.workspace.last_sync_at = timezone.now()
        self.workspace.save()
