"""
Тесты для новой системы загрузки файлов
"""

from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from grading.models import UserWorkspace, ClassOfGrading, GradeObject
import json

User = get_user_model()


class FileUploadTestCase(TestCase):
    """Тесты для FileUploadView"""
    
    def setUp(self):
        """Подготовка тестовых данных"""
        self.client = Client()
        
        # Создание пользователя
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        
        # Создание workspace
        self.workspace = UserWorkspace.objects.create(user=self.user)
        
        # Создание класса
        self.class_obj = ClassOfGrading.objects.create(
            workspace=self.workspace,
            name='Test Class',
            priority=1
        )
        
        # Создание объекта
        self.grade_object = GradeObject.objects.create(
            class_of_grading=self.class_obj,
            name='Test Object'
        )
        
        # Авторизация
        self.client.force_login(self.user)
    
    def test_upload_file_to_class(self):
        """Тест загрузки фото для класса"""
        # Создание тестового файла
        test_file = SimpleUploadedFile(
            "test_photo.jpg",
            b"fake image content",
            content_type="image/jpeg"
        )
        
        response = self.client.post(
            '/api/integration/sync/upload-file/',
            {
                'file': test_file,
                'object_id': str(self.class_obj.id),
                'model_name': 'ClassOfGrading',
                'field_name': 'photo',
            }
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['success'])
        
        # Проверка что файл загрузился
        self.class_obj.refresh_from_db()
        self.assertIsNotNone(self.class_obj.photo)
    
    def test_upload_file_to_object(self):
        """Тест загрузки фото для объекта"""
        test_file = SimpleUploadedFile(
            "object_photo.jpg",
            b"fake image content",
            content_type="image/jpeg"
        )
        
        response = self.client.post(
            '/api/integration/sync/upload-file/',
            {
                'file': test_file,
                'object_id': str(self.grade_object.id),
                'model_name': 'GradeObject',
                'field_name': 'photo',
            }
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['success'])
        
        self.grade_object.refresh_from_db()
        self.assertIsNotNone(self.grade_object.photo)
    
    def test_upload_missing_parameters(self):
        """Тест загрузки без обязательных параметров"""
        test_file = SimpleUploadedFile(
            "test.jpg",
            b"content",
            content_type="image/jpeg"
        )
        
        # Без object_id
        response = self.client.post(
            '/api/integration/sync/upload-file/',
            {
                'file': test_file,
                'model_name': 'ClassOfGrading',
                'field_name': 'photo',
            }
        )
        
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()['success'])
    
    def test_upload_invalid_model(self):
        """Тест загрузки с неправильной моделью"""
        test_file = SimpleUploadedFile(
            "test.jpg",
            b"content",
            content_type="image/jpeg"
        )
        
        response = self.client.post(
            '/api/integration/sync/upload-file/',
            {
                'file': test_file,
                'object_id': str(self.class_obj.id),
                'model_name': 'InvalidModel',
                'field_name': 'photo',
            }
        )
        
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()['success'])
    
    def test_upload_nonexistent_object(self):
        """Тест загрузки для несуществующего объекта"""
        test_file = SimpleUploadedFile(
            "test.jpg",
            b"content",
            content_type="image/jpeg"
        )
        
        response = self.client.post(
            '/api/integration/sync/upload-file/',
            {
                'file': test_file,
                'object_id': '00000000-0000-0000-0000-000000000000',
                'model_name': 'ClassOfGrading',
                'field_name': 'photo',
            }
        )
        
        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.json()['success'])
    
    def test_unauthorized_upload(self):
        """Тест загрузки без авторизации"""
        self.client.logout()
        
        test_file = SimpleUploadedFile(
            "test.jpg",
            b"content",
            content_type="image/jpeg"
        )
        
        response = self.client.post(
            '/api/integration/sync/upload-file/',
            {
                'file': test_file,
                'object_id': str(self.class_obj.id),
                'model_name': 'ClassOfGrading',
                'field_name': 'photo',
            }
        )
        
        self.assertEqual(response.status_code, 401)


class MetadataImportTestCase(TestCase):
    """Тесты для импорта метаданных"""
    
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.workspace = UserWorkspace.objects.create(user=self.user)
        self.client.force_login(self.user)
    
    def test_import_metadata_only(self):
        """Тест импорта только метаданных без файлов"""
        data = {
            "data": {
                "ClassOfGrading": [
                    {
                        "_id": "507f1f77bcf86cd799439011",
                        "name": "Test Class",
                        "priority": 1,
                        "objectName": "Object",
                        "objectsName": "Objects",
                        "noteName": "Note",
                        "notesName": "Notes",
                        "photo": None,
                        "categories": [],
                        "objects": [],
                        "tags": [],
                        "rankTypes": []
                    }
                ],
                "Tag": [],
                "RankType": []
            },
            "merge": True,
            "validate_only": False
        }
        
        response = self.client.post(
            '/api/integration/sync/import/',
            json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertTrue(result['success'])
        
        # Проверка создания объекта
        self.assertEqual(
            ClassOfGrading.objects.filter(workspace=self.workspace).count(),
            1
        )
    
    def test_import_with_objects(self):
        """Тест импорта с объектами"""
        data = {
            "data": {
                "ClassOfGrading": [
                    {
                        "_id": "507f1f77bcf86cd799439011",
                        "name": "Test Class",
                        "priority": 1,
                        "objectName": "Object",
                        "objectsName": "Objects",
                        "noteName": "Note",
                        "notesName": "Notes",
                        "photo": None,
                        "categories": [],
                        "objects": [
                            {
                                "_id": "507f1f77bcf86cd799439012",
                                "name": "Test Object",
                                "photo": None,
                                "object_name": "",
                                "description": "",
                                "overall_rank": None,
                                "tags": [],
                                "media": [],
                                "notes": [],
                                "categories_of_object": []
                            }
                        ],
                        "tags": [],
                        "rankTypes": []
                    }
                ],
                "Tag": [],
                "RankType": []
            },
            "merge": True,
            "validate_only": False
        }
        
        response = self.client.post(
            '/api/integration/sync/import/',
            json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertTrue(result['success'])
        
        # Проверка создания объектов
        self.assertEqual(
            GradeObject.objects.filter(
                class_of_grading__workspace=self.workspace
            ).count(),
            1
        )


class FullSyncFlowTestCase(TestCase):
    """Тесты полного процесса синхронизации"""
    
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.workspace = UserWorkspace.objects.create(user=self.user)
        self.client.force_login(self.user)
    
    def test_full_sync_flow(self):
        """Тест полного процесса: метаданные -> файлы"""
        
        # Шаг 1: Импорт метаданных
        metadata = {
            "data": {
                "ClassOfGrading": [
                    {
                        "_id": "507f1f77bcf86cd799439011",
                        "name": "Photos",
                        "priority": 1,
                        "objectName": "Photo",
                        "objectsName": "Photos",
                        "noteName": "Note",
                        "notesName": "Notes",
                        "photo": None,  # Будет загружен позже
                        "categories": [],
                        "objects": [],
                        "tags": [],
                        "rankTypes": []
                    }
                ],
                "Tag": [],
                "RankType": []
            },
            "merge": True,
            "validate_only": False
        }
        
        response = self.client.post(
            '/api/integration/sync/import/',
            json.dumps(metadata),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['success'])
        
        # Получение созданного объекта
        class_obj = ClassOfGrading.objects.get(
            workspace=self.workspace,
            name='Photos'
        )
        
        # Шаг 2: Загрузка файла
        test_file = SimpleUploadedFile(
            "class_photo.jpg",
            b"fake image content",
            content_type="image/jpeg"
        )
        
        response = self.client.post(
            '/api/integration/sync/upload-file/',
            {
                'file': test_file,
                'object_id': str(class_obj.id),
                'model_name': 'ClassOfGrading',
                'field_name': 'photo',
            }
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['success'])
        
        # Проверка результата
        class_obj.refresh_from_db()
        self.assertIsNotNone(class_obj.photo)
        self.assertTrue(class_obj.photo.name.endswith('.jpg'))
