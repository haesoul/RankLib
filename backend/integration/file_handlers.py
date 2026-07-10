"""
Модуль для обработки файлов при синхронизации
Поддержка больших файлов и потоковой загрузки
"""

from typing import Optional, Dict, List
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
import base64
import mimetypes
import logging
import hashlib
from pathlib import Path

logger = logging.getLogger(__name__)

# Максимальный размер одного файла (в байтах) - 500MB
MAX_FILE_SIZE = 500 * 1024 * 1024

# Максимальный размер всех файлов за один запрос - 20GB
MAX_TOTAL_SIZE = 20 * 1024 * 1024 * 1024


class FileUploadManager:
    """
    Менеджер загрузки файлов из React Native FileSystem на сервер
    Поддерживает большие файлы и потоковую загрузку
    """
    
    def __init__(self, user_id: int):
        self.user_id = user_id
        self.uploaded_files = {}  # Кэш: {file_hash: server_url}
        self.total_uploaded_size = 0
        self.files_uploaded_count = 0
    
    def upload_file_from_base64(
        self,
        file_base64: str,
        object_id: str,
        file_type: str = 'photo',
        original_filename: Optional[str] = None
    ) -> Optional[str]:
        """
        Загрузка файла из base64 на сервер
        
        Args:
            file_base64: Base64 строка файла
            object_id: UUID объекта
            file_type: Тип файла (photo, media, proof, note_photo, class_photo)
            original_filename: Оригинальное имя файла
            
        Returns:
            URL загруженного файла или None при ошибке
        """
        try:
            # Декодирование base64
            if ',' in file_base64:
                header, file_data = file_base64.split(',', 1)
                if 'data:' in header:
                    mime_type = header.split(':')[1].split(';')[0]
                else:
                    mime_type = 'application/octet-stream'
            else:
                file_data = file_base64
                mime_type = 'application/octet-stream'
            
            # Проверка размера перед декодированием
            estimated_size = len(file_data) * 3 // 4  # base64 ~= 4/3 от оригинала
            if estimated_size > MAX_FILE_SIZE:
                logger.error(
                    f"File too large: {estimated_size} bytes "
                    f"(max {MAX_FILE_SIZE} bytes)"
                )
                return None
            
            # Проверка общего размера
            if self.total_uploaded_size + estimated_size > MAX_TOTAL_SIZE:
                logger.error(
                    f"Total upload size exceeded: "
                    f"{self.total_uploaded_size + estimated_size} bytes "
                    f"(max {MAX_TOTAL_SIZE} bytes)"
                )
                return None
            
            # Декодирование
            decoded_file = base64.b64decode(file_data)
            actual_size = len(decoded_file)
            
            # Вычисление хеша для дедупликации
            file_hash = hashlib.sha256(decoded_file).hexdigest()[:16]
            
            # Проверка кэша (дедупликация)
            if file_hash in self.uploaded_files:
                logger.info(f"File already uploaded (hash: {file_hash}), reusing URL")
                return self.uploaded_files[file_hash]
            
            # Определение расширения
            extension = mimetypes.guess_extension(mime_type) or '.jpg'
            
            # Имя файла: users/{user_id}/{file_type}/{hash}_{object_id}{extension}
            file_name = (
                f"users/{self.user_id}/{file_type}/"
                f"{file_hash}_{object_id}{extension}"
            )
            
            # Сохранение файла
            file_path = default_storage.save(
                file_name,
                ContentFile(decoded_file)
            )
            
            # Получение URL
            file_url = default_storage.url(file_path)
            
            # Обновление статистики
            self.uploaded_files[file_hash] = file_url
            self.total_uploaded_size += actual_size
            self.files_uploaded_count += 1
            
            logger.info(
                f"File uploaded: {file_name} ({actual_size} bytes) -> {file_url}"
            )
            
            return file_url
            
        except Exception as e:
            logger.error(f"Error uploading file for {object_id}: {e}", exc_info=True)
            return None
    
    def download_file_to_base64(self, file_url: str) -> Optional[str]:
        """
        Скачивание файла с сервера в base64
        
        Args:
            file_url: URL файла на сервере
            
        Returns:
            Base64 строка с заголовком
        """
        try:
            # Извлечение пути из URL
            if default_storage.base_url in file_url:
                file_path = file_url.replace(default_storage.base_url, '')
            else:
                file_path = file_url
            
            # Проверка существования
            if not default_storage.exists(file_path):
                logger.warning(f"File not found: {file_path}")
                return None
            
            # Проверка размера
            try:
                file_size = default_storage.size(file_path)
                if file_size > MAX_FILE_SIZE:
                    logger.error(f"File too large to download: {file_size} bytes")
                    return None
            except Exception:
                pass  # Некоторые storage не поддерживают size()
            
            # Чтение файла
            with default_storage.open(file_path, 'rb') as f:
                file_content = f.read()
            
            # Определение mime type
            mime_type, _ = mimetypes.guess_type(file_path)
            mime_type = mime_type or 'application/octet-stream'
            
            # Кодирование в base64
            encoded = base64.b64encode(file_content).decode('utf-8')
            
            return f"data:{mime_type};base64,{encoded}"
            
        except Exception as e:
            logger.error(f"Error downloading file {file_url}: {e}", exc_info=True)
            return None
    
    def get_stats(self) -> Dict:
        """Получить статистику загрузки"""
        return {
            'files_uploaded': self.files_uploaded_count,
            'total_size_bytes': self.total_uploaded_size,
            'total_size_mb': round(self.total_uploaded_size / (1024 * 1024), 2),
            'unique_files': len(self.uploaded_files),
        }


class ChunkedFileUploader:
    """
    Загрузчик для очень больших файлов по частям
    Для будущего расширения API
    """
    
    CHUNK_SIZE = 5 * 1024 * 1024  # 5MB на чанк
    
    def __init__(self, user_id: int):
        self.user_id = user_id
        self.chunks_cache = {}  # {upload_id: {chunk_num: data}}
    
    def start_upload(self, total_size: int, mime_type: str) -> str:
        """Начать загрузку файла по частям"""
        upload_id = hashlib.sha256(
            f"{self.user_id}_{total_size}_{mime_type}".encode()
        ).hexdigest()[:32]
        
        self.chunks_cache[upload_id] = {
            'total_size': total_size,
            'mime_type': mime_type,
            'chunks': {},
            'completed': False,
        }
        
        return upload_id
    
    def upload_chunk(
        self,
        upload_id: str,
        chunk_num: int,
        chunk_data: bytes
    ) -> bool:
        """Загрузить чанк"""
        if upload_id not in self.chunks_cache:
            return False
        
        self.chunks_cache[upload_id]['chunks'][chunk_num] = chunk_data
        return True
    
    def complete_upload(
        self,
        upload_id: str,
        object_id: str,
        file_type: str
    ) -> Optional[str]:
        """Завершить загрузку и собрать файл"""
        if upload_id not in self.chunks_cache:
            return None
        
        upload_info = self.chunks_cache[upload_id]
        
        # Собрать все чанки
        chunks = upload_info['chunks']
        sorted_chunks = [chunks[i] for i in sorted(chunks.keys())]
        complete_file = b''.join(sorted_chunks)
        
        # Сохранить файл
        mime_type = upload_info['mime_type']
        extension = mimetypes.guess_extension(mime_type) or '.bin'
        
        file_name = f"users/{self.user_id}/{file_type}/{object_id}{extension}"
        file_path = default_storage.save(file_name, ContentFile(complete_file))
        file_url = default_storage.url(file_path)
        
        # Очистить кэш
        del self.chunks_cache[upload_id]
        
        return file_url
