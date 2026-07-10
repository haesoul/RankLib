"""
Утилиты для обработки данных синхронизации
Преобразование вложенных данных из Realm в плоскую структуру Django
"""

from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)


def flatten_realm_data(data: Dict[str, List[Dict]]) -> Dict[str, List[Dict]]:
    """
    Разворачивает вложенные данные из Realm в плоскую структуру для Django
    
    React Native отправляет данные в иерархической структуре:
    - ClassOfGrading содержит categories, objects, tags, rankTypes
    - Objects содержат media, notes, categories_of_object
    - CategoryOfObject содержит subcategories_of_category
    
    Django ожидает плоскую структуру, где каждая сущность в отдельном массиве
    
    Args:
        data: Вложенные данные из Realm
        
    Returns:
        Плоская структура данных для Django
    """
    
    flat_data = {
        'ClassOfGrading': [],
        'Category': [],
        'SubCategory': [],
        'GradeObject': [],
        'Tag': [],
        'RankType': [],
        'MediaItem': [],
        'Note': [],
        'CategoryOfObject': [],
        'SubCategoryOfObject': [],
        'Proof': [],
        'ObjectTag': [],
        'ClassTag': [],
        'ClassRankType': [],
    }
    
    try:
        # Обработка ClassOfGrading
        for class_data in data.get('ClassOfGrading', []):
            # Добавляем сам класс
            flat_class = {
                '_id': class_data['_id'],
                'name': class_data['name'],
                'photo': class_data.get('photo'),
                'photo_base64': class_data.get('photo_base64'),
                'priority': class_data.get('priority', 1),
                'objectName': class_data.get('objectName'),
                'objectsName': class_data.get('objectsName'),
                'noteName': class_data.get('noteName'),
                'notesName': class_data.get('notesName'),
            }
            flat_data['ClassOfGrading'].append(flat_class)
            
            # Извлекаем вложенные категории
            for category in class_data.get('categories', []):
                flat_category = {
                    '_id': category['_id'],
                    'name': category['name'],
                    'priority': category.get('priority', 1),
                    'weight': category.get('weight'),
                    'class_of_grading': class_data['_id'],
                }
                flat_data['Category'].append(flat_category)
                
                # Извлекаем подкатегории
                for subcategory in category.get('subcategories', []):
                    flat_subcategory = {
                        '_id': subcategory['_id'],
                        'name': subcategory['name'],
                        'priority': subcategory.get('priority', 1),
                        'weight': subcategory.get('weight'),
                        'category': category['_id'],
                    }
                    flat_data['SubCategory'].append(flat_subcategory)
            
            # Извлекаем вложенные объекты
            for obj in class_data.get('objects', []):
                flat_object = {
                    '_id': obj['_id'],
                    'name': obj['name'],
                    'photo': obj.get('photo'),
                    'photo_base64': obj.get('photo_base64'),
                    'object_name': obj.get('object_name'),
                    'description': obj.get('description'),
                    'overall_rank': obj.get('overall_rank'),
                    'class_of_grading': class_data['_id'],
                }
                flat_data['GradeObject'].append(flat_object)
                
                # Извлекаем медиа
                for idx, media in enumerate(obj.get('media', [])):
                    # MediaItem не имеет _id в Realm (embedded), создаем уникальный
                    media_id = f"{obj['_id']}_media_{idx}"
                    
                    flat_media = {
                        '_id': media_id,
                        'uri': media.get('uri'),
                        'uri_base64': media.get('uri_base64'),
                        'mediaType': media.get('mediaType'),
                        'mimeType': media.get('mimeType'),
                        'thumbnailUri': media.get('thumbnailUri'),
                        'thumbnail_base64': media.get('thumbnail_base64'),
                        'caption': media.get('caption'),
                        'createdAt': media.get('createdAt'),
                        'grade_object': obj['_id'],
                    }
                    flat_data['MediaItem'].append(flat_media)
                
                # Извлекаем заметки
                for idx, note in enumerate(obj.get('notes', [])):
                    # Note не имеет _id в Realm (embedded), создаем уникальный
                    note_id = f"{obj['_id']}_note_{idx}"
                    
                    flat_note = {
                        '_id': note_id,
                        'text': note['text'],
                        'author': note.get('author'),
                        'pinned': note.get('pinned', False),
                        'photoUri': note.get('photoUri'),
                        'photo_base64': note.get('photo_base64'),
                        'createdAt': note.get('createdAt'),
                        'grade_object': obj['_id'],
                    }
                    flat_data['Note'].append(flat_note)
                
                # Извлекаем оценки категорий
                for rating in obj.get('categories_of_object', []):
                    # Обработка proof для CategoryOfObject
                    proof_id = None
                    if rating.get('proof'):
                        proof_id = f"{rating['_id']}_proof"
                        flat_proof = {
                            '_id': proof_id,
                            'image': rating['proof'].get('image'),
                            'image_base64': rating['proof'].get('image_base64'),
                            'text': rating['proof'].get('text'),
                        }
                        flat_data['Proof'].append(flat_proof)
                    
                    flat_rating = {
                        '_id': rating['_id'],
                        'category': rating['category']['_id'],
                        'object': obj['_id'],
                        'rank': rating.get('rank'),
                        'proof': proof_id,
                    }
                    flat_data['CategoryOfObject'].append(flat_rating)
                    
                    # Извлекаем оценки подкатегорий
                    for subrating in rating.get('subcategories_of_category', []):
                        # Обработка proof для SubCategoryOfObject
                        subproof_id = None
                        if subrating.get('proof'):
                            subproof_id = f"{subrating['_id']}_proof"
                            flat_subproof = {
                                '_id': subproof_id,
                                'image': subrating['proof'].get('image'),
                                'image_base64': subrating['proof'].get('image_base64'),
                                'text': subrating['proof'].get('text'),
                            }
                            flat_data['Proof'].append(flat_subproof)
                        
                        flat_subrating = {
                            '_id': subrating['_id'],
                            'subcategory': subrating['subcategory']['_id'],
                            'category_of_object': rating['_id'],
                            'rank': subrating.get('rank'),
                            'color': subrating.get('color'),
                            'proof': subproof_id,
                        }
                        flat_data['SubCategoryOfObject'].append(flat_subrating)
                
                # Извлекаем теги объекта
                for tag in obj.get('tags', []):
                    flat_object_tag = {
                        '_id': f"{obj['_id']}_{tag['_id']}",
                        'grade_object': obj['_id'],
                        'tag': tag['_id'],
                    }
                    flat_data['ObjectTag'].append(flat_object_tag)
            
            # Извлекаем теги класса
            for tag in class_data.get('tags', []):
                flat_class_tag = {
                    '_id': f"{class_data['_id']}_{tag['_id']}",
                    'class_of_grading': class_data['_id'],
                    'tag': tag['_id'],
                }
                flat_data['ClassTag'].append(flat_class_tag)
            
            # Извлекаем типы рангов класса
            for rank_type in class_data.get('rankTypes', []):
                flat_class_rank = {
                    '_id': f"{class_data['_id']}_{rank_type['_id']}",
                    'class_of_grading': class_data['_id'],
                    'rank_type': rank_type['_id'],
                }
                flat_data['ClassRankType'].append(flat_class_rank)
        
        # Обработка тегов (если переданы отдельно на верхнем уровне)
        for tag in data.get('Tag', []):
            # Проверяем, не добавлен ли уже этот тег
            if not any(t['_id'] == tag['_id'] for t in flat_data['Tag']):
                flat_tag = {
                    '_id': tag['_id'],
                    'name': tag['name'],
                    'parent_tag': tag.get('parentTag', {}).get('_id') if tag.get('parentTag') else None,
                    'createdAt': tag.get('createdAt'),
                }
                flat_data['Tag'].append(flat_tag)
        
        # Обработка типов рангов (если переданы отдельно на верхнем уровне)
        for rank_type in data.get('RankType', []):
            # Проверяем, не добавлен ли уже этот тип ранга
            if not any(r['_id'] == rank_type['_id'] for r in flat_data['RankType']):
                flat_rank = {
                    '_id': rank_type['_id'],
                    'name': rank_type['name'],
                    'fromRank': rank_type.get('fromRank'),
                    'color': rank_type.get('color'),
                    'createdAt': rank_type.get('createdAt'),
                }
                flat_data['RankType'].append(flat_rank)
        
        # Логирование статистики
        total_items = sum(len(items) for items in flat_data.values())
        logger.info(f"Flattened {total_items} items from Realm data")
        
        for key, items in flat_data.items():
            if items:
                logger.debug(f"  - {key}: {len(items)} items")
        
        return flat_data
    
    except Exception as e:
        logger.error(f"Error flattening Realm data: {str(e)}", exc_info=True)
        raise ValueError(f"Failed to flatten Realm data: {str(e)}")


def normalize_data_keys(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Нормализует ключи данных из snake_case в PascalCase
    
    Args:
        data: Данные с ключами в snake_case
        
    Returns:
        Данные с ключами в PascalCase
    """
    
    KEY_MAPPING = {
        'classes': 'ClassOfGrading',
        'tags': 'Tag',
        'rank_types': 'RankType',
        'categories': 'Category',
        'subcategories': 'SubCategory',
        'objects': 'GradeObject',
        'media': 'MediaItem',
        'notes': 'Note',
        'proofs': 'Proof',
        'category_of_objects': 'CategoryOfObject',
        'subcategory_of_objects': 'SubCategoryOfObject',
        'object_tags': 'ObjectTag',
        'class_tags': 'ClassTag',
        'class_rank_types': 'ClassRankType',
    }
    
    normalized = {}
    
    for key, value in data.items():
        normalized_key = KEY_MAPPING.get(key, key)
        normalized[normalized_key] = value
    
    return normalized
