"""
Тестовый скрипт для проверки исправлений синхронизации
Запуск: python test_sync_fix.py
"""

import json

# Импорт утилит (поместите этот файл в backend/integration/)
from integration.utils import flatten_realm_data, normalize_data_keys


def test_normalize_keys():
    """Тест нормализации ключей"""
    print("=" * 60)
    print("ТЕСТ 1: Нормализация ключей")
    print("=" * 60)
    
    input_data = {
        'classes': [],
        'tags': [],
        'rank_types': [],
        'objects': [],
    }
    
    normalized = normalize_data_keys(input_data)
    
    print("Входные данные (ключи):", list(input_data.keys()))
    print("Нормализованные (ключи):", list(normalized.keys()))
    
    expected_keys = ['ClassOfGrading', 'Tag', 'RankType', 'GradeObject']
    assert set(normalized.keys()) == set(expected_keys), "Ошибка нормализации ключей"
    
    print("✅ ТЕСТ ПРОЙДЕН\n")


def test_flatten_simple():
    """Тест разворачивания простых данных"""
    print("=" * 60)
    print("ТЕСТ 2: Разворачивание простой структуры")
    print("=" * 60)
    
    input_data = {
        'ClassOfGrading': [
            {
                '_id': '507f1f77bcf86cd799439011',
                'name': 'Test Class',
                'priority': 1,
                'categories': [],
                'objects': [],
                'tags': [],
                'rankTypes': [],
            }
        ],
        'Tag': [
            {
                '_id': '507f1f77bcf86cd799439012',
                'name': 'Test Tag',
                'createdAt': '2024-01-01T00:00:00Z',
            }
        ],
        'RankType': [],
    }
    
    flattened = flatten_realm_data(input_data)
    
    print("Количество классов:", len(flattened['ClassOfGrading']))
    print("Количество тегов:", len(flattened['Tag']))
    
    assert len(flattened['ClassOfGrading']) == 1, "Должен быть 1 класс"
    assert len(flattened['Tag']) == 1, "Должен быть 1 тег"
    assert flattened['ClassOfGrading'][0]['name'] == 'Test Class'
    
    print("✅ ТЕСТ ПРОЙДЕН\n")


def test_flatten_nested():
    """Тест разворачивания вложенной структуры"""
    print("=" * 60)
    print("ТЕСТ 3: Разворачивание вложенной структуры")
    print("=" * 60)
    
    input_data = {
        'ClassOfGrading': [
            {
                '_id': '507f1f77bcf86cd799439011',
                'name': 'Anime Characters',
                'priority': 1,
                'categories': [
                    {
                        '_id': '507f1f77bcf86cd799439012',
                        'name': 'Design',
                        'priority': 1,
                        'weight': 40,
                        'subcategories': [
                            {
                                '_id': '507f1f77bcf86cd799439013',
                                'name': 'Color Scheme',
                                'priority': 1,
                                'weight': 50,
                            }
                        ]
                    }
                ],
                'objects': [
                    {
                        '_id': '507f1f77bcf86cd799439014',
                        'name': 'Naruto',
                        'overall_rank': 8.5,
                        'media': [
                            {
                                'uri': 'file:///image.jpg',
                                'mediaType': 'image',
                                'createdAt': '2024-01-01T00:00:00Z',
                            }
                        ],
                        'notes': [
                            {
                                'text': 'Great character',
                                'pinned': True,
                                'createdAt': '2024-01-01T00:00:00Z',
                            }
                        ],
                        'tags': [],
                        'categories_of_object': [],
                    }
                ],
                'tags': [],
                'rankTypes': [],
            }
        ],
        'Tag': [],
        'RankType': [],
    }
    
    flattened = flatten_realm_data(input_data)
    
    print("Статистика разворачивания:")
    for key, items in flattened.items():
        if items:
            print(f"  - {key}: {len(items)} items")
    
    # Проверки
    assert len(flattened['ClassOfGrading']) == 1, "Должен быть 1 класс"
    assert len(flattened['Category']) == 1, "Должна быть 1 категория"
    assert len(flattened['SubCategory']) == 1, "Должна быть 1 подкатегория"
    assert len(flattened['GradeObject']) == 1, "Должен быть 1 объект"
    assert len(flattened['MediaItem']) == 1, "Должен быть 1 медиа-элемент"
    assert len(flattened['Note']) == 1, "Должна быть 1 заметка"
    
    # Проверка связей
    category = flattened['Category'][0]
    assert category['class_of_grading'] == '507f1f77bcf86cd799439011'
    
    subcategory = flattened['SubCategory'][0]
    assert subcategory['category'] == '507f1f77bcf86cd799439012'
    
    grade_object = flattened['GradeObject'][0]
    assert grade_object['class_of_grading'] == '507f1f77bcf86cd799439011'
    assert grade_object['name'] == 'Naruto'
    
    print("✅ ТЕСТ ПРОЙДЕН\n")


def test_flatten_with_ratings():
    """Тест разворачивания с оценками"""
    print("=" * 60)
    print("ТЕСТ 4: Разворачивание с оценками и доказательствами")
    print("=" * 60)
    
    input_data = {
        'ClassOfGrading': [
            {
                '_id': 'class1',
                'name': 'Test Class',
                'priority': 1,
                'categories': [
                    {
                        '_id': 'cat1',
                        'name': 'Category 1',
                        'priority': 1,
                        'subcategories': [
                            {
                                '_id': 'subcat1',
                                'name': 'SubCategory 1',
                                'priority': 1,
                            }
                        ]
                    }
                ],
                'objects': [
                    {
                        '_id': 'obj1',
                        'name': 'Object 1',
                        'media': [],
                        'notes': [],
                        'tags': [],
                        'categories_of_object': [
                            {
                                '_id': 'rating1',
                                'category': {'_id': 'cat1'},
                                'rank': 8.5,
                                'proof': {
                                    'image': 'file:///proof.jpg',
                                    'text': 'Proof text',
                                },
                                'subcategories_of_category': [
                                    {
                                        '_id': 'subrating1',
                                        'subcategory': {'_id': 'subcat1'},
                                        'rank': 9.0,
                                        'color': '#FF0000',
                                        'proof': {
                                            'text': 'Sub proof',
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                ],
                'tags': [],
                'rankTypes': [],
            }
        ]
    }
    
    flattened = flatten_realm_data(input_data)
    
    print("Статистика разворачивания:")
    for key, items in flattened.items():
        if items:
            print(f"  - {key}: {len(items)} items")
    
    # Проверки
    assert len(flattened['CategoryOfObject']) == 1
    assert len(flattened['SubCategoryOfObject']) == 1
    assert len(flattened['Proof']) == 2  # 1 для category, 1 для subcategory
    
    rating = flattened['CategoryOfObject'][0]
    assert rating['category'] == 'cat1'
    assert rating['object'] == 'obj1'
    assert rating['rank'] == 8.5
    assert rating['proof'] is not None
    
    subrating = flattened['SubCategoryOfObject'][0]
    assert subrating['subcategory'] == 'subcat1'
    assert subrating['category_of_object'] == 'rating1'
    assert subrating['rank'] == 9.0
    assert subrating['color'] == '#FF0000'
    
    print("✅ ТЕСТ ПРОЙДЕН\n")


def test_real_world_data():
    """Тест с реальными данными из React Native"""
    print("=" * 60)
    print("ТЕСТ 5: Реальные данные из React Native")
    print("=" * 60)
    
    # Данные в формате, который отправляет React Native
    input_data = {
        'classes': [  # snake_case ключ
            {
                '_id': '507f1f77bcf86cd799439011',
                'name': 'Anime Series',
                'photo': 'https://example.com/photo.jpg',
                'priority': 1,
                'objectName': 'Series',
                'objectsName': 'Series',
                'noteName': 'Note',
                'notesName': 'Notes',
                'categories': [
                    {
                        '_id': '507f1f77bcf86cd799439012',
                        'name': 'Story',
                        'priority': 1,
                        'weight': 30,
                        'subcategories': []
                    },
                    {
                        '_id': '507f1f77bcf86cd799439013',
                        'name': 'Animation',
                        'priority': 2,
                        'weight': 25,
                        'subcategories': []
                    }
                ],
                'objects': [
                    {
                        '_id': '507f1f77bcf86cd799439014',
                        'name': 'Naruto',
                        'photo': 'https://example.com/naruto.jpg',
                        'overall_rank': 8.5,
                        'description': 'Great anime',
                        'media': [],
                        'notes': [],
                        'tags': [],
                        'categories_of_object': []
                    },
                    {
                        '_id': '507f1f77bcf86cd799439015',
                        'name': 'One Piece',
                        'overall_rank': 9.0,
                        'media': [],
                        'notes': [],
                        'tags': [],
                        'categories_of_object': []
                    }
                ],
                'tags': [],
                'rankTypes': []
            }
        ],
        'tags': [  # snake_case ключ
            {
                '_id': '507f1f77bcf86cd799439016',
                'name': 'Shonen',
                'createdAt': '2024-01-01T00:00:00Z',
            }
        ],
        'rank_types': []  # snake_case ключ
    }
    
    # Шаг 1: Нормализация ключей
    normalized = normalize_data_keys(input_data)
    print("Нормализованные ключи:", list(normalized.keys()))
    
    # Шаг 2: Разворачивание
    flattened = flatten_realm_data(normalized)
    
    print("\nСтатистика разворачивания:")
    for key, items in flattened.items():
        if items:
            print(f"  - {key}: {len(items)} items")
    
    # Проверки
    assert len(flattened['ClassOfGrading']) == 1
    assert len(flattened['Category']) == 2
    assert len(flattened['GradeObject']) == 2
    assert len(flattened['Tag']) == 1
    
    print("\n✅ ТЕСТ ПРОЙДЕН\n")


def run_all_tests():
    """Запуск всех тестов"""
    print("\n" + "=" * 60)
    print("ЗАПУСК ВСЕХ ТЕСТОВ")
    print("=" * 60 + "\n")
    
    try:
        test_normalize_keys()
        test_flatten_simple()
        test_flatten_nested()
        test_flatten_with_ratings()
        test_real_world_data()
        
        print("=" * 60)
        print("✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО")
        print("=" * 60)
        
    except AssertionError as e:
        print("\n" + "=" * 60)
        print("❌ ТЕСТ НЕ ПРОЙДЕН")
        print("=" * 60)
        print(f"Ошибка: {str(e)}")
        raise
    except Exception as e:
        print("\n" + "=" * 60)
        print("❌ ОШИБКА ПРИ ВЫПОЛНЕНИИ ТЕСТА")
        print("=" * 60)
        print(f"Ошибка: {str(e)}")
        raise


if __name__ == '__main__':
    run_all_tests()
