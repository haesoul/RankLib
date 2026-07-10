"""
Сервис синхронизации данных между Django и React Native Realm
Главный модуль, объединяющий все компоненты

НОВАЯ АРХИТЕКТУРА:
- file_handlers.py - работа с файлами
- import_service.py - импорт из Django в Realm
- export_service.py - экспорт из Realm в Django
- validators.py - валидация данных
- utils.py - утилиты (flatten_realm_data)
"""

from typing import Dict, List, Any
import logging

# Импорт компонентов
from .file_handlers import FileUploadManager, ChunkedFileUploader
from .import_service import ImportService
from .export_service import ExportService
from .validators import RealmDataValidator

# Экспорт для обратной совместимости
__all__ = [
    'FileUploadManager',
    'ChunkedFileUploader',
    'ImportService',
    'ExportService',
    'RealmDataValidator',
    'SyncException',
]

logger = logging.getLogger(__name__)


class SyncException(Exception):
    """Исключение для ошибок синхронизации"""
    pass
