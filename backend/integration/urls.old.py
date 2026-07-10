"""
URL конфигурация для API синхронизации данных между Django и Realm
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from integration.views import SyncViewSet

# Создаем router для ViewSet
router = DefaultRouter()
router.register(r'sync', SyncViewSet, basename='sync')

app_name = 'integration'

urlpatterns = [
    # ViewSet endpoints автоматически создаются router'ом:
    # POST /api/sync/export/ - Экспорт данных из Django
    # POST /api/sync/import/ - Импорт данных из Realm
    # GET /api/sync/status/ - Статус синхронизации
    # POST /api/sync/validate/ - Валидация данных
    # POST /api/sync/bulk-export/ - Массовый экспорт
    # GET|POST /api/sync/checkpoint/ - Контрольные точки
    path('', include(router.urls)),
]

"""
Примеры использования API:

1. ЭКСПОРТ ДАННЫХ (из Django в Realm):
   POST /api/sync/export/
   Query Parameters:
   - include_media=true
   - include_notes=true
   - include_proofs=true
   
   Response:
   {
       "success": true,
       "data": { все данные в формате Realm },
       "timestamp": "2024-02-06T10:30:00Z",
       "size_bytes": 102400
   }

2. ИМПОРТ ДАННЫХ (из Realm в Django):
   POST /api/sync/import/
   Body:
   {
       "data": { данные из Realm },
       "merge": true,
       "validate_only": false
   }
   
   Response:
   {
       "success": true,
       "message": "Импорт завершен успешно",
       "stats": {
           "total_items": 150,
           "created_items": 45,
           "updated_items": 105,
           "errors": []
       }
   }

3. СТАТУС СИНХРОНИЗАЦИИ:
   GET /api/sync/status/
   
   Response:
   {
       "success": true,
       "status": {
           "last_sync_at": "2024-02-06T10:30:00Z",
           "sync_enabled": true,
           "pending_changes": 5
       },
       "statistics": {
           "total_classes": 10,
           "total_objects": 250,
           "total_categories": 45,
           "total_ratings": 1200
       }
   }

4. ВАЛИДАЦИЯ ДАННЫХ:
   POST /api/sync/validate/
   Body:
   {
       "data": { данные для проверки }
   }
   
   Response:
   {
       "is_valid": true,
       "total_records": 150,
       "valid_records": 150,
       "errors": [],
       "warnings": []
   }

5. МАССОВЫЙ ЭКСПОРТ:
   POST /api/sync/bulk-export/
   Body:
   {
       "object_ids": ["uuid1", "uuid2"],
       "category_ids": ["uuid3"],
       "class_ids": [],
       "with_relationships": true
   }
   
   Response:
   {
       "success": true,
       "data": { выбранные данные },
       "size_bytes": 51200
   }

6. КОНТРОЛЬНЫЕ ТОЧКИ:
   GET /api/sync/checkpoint/  - Получить последнюю
   POST /api/sync/checkpoint/ - Создать новую
   
   Response:
   {
       "workspace_id": "uuid",
       "total_classes": 10,
       "total_objects": 250,
       "total_categories": 45,
       "total_ratings": 1200,
       "data_size_bytes": 102400,
       "created_at": "2024-02-06T10:30:00Z"
   }
"""
