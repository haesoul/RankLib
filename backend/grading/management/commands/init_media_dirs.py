"""
Django management команда для инициализации media директории

Использование:
    python manage.py init_media_dirs

Создает:
    - media/
    - media/users/
"""

import os
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = 'Создает директории для хранения media файлов'

    def handle(self, *args, **options):
        # Получаем MEDIA_ROOT из settings
        media_root = getattr(settings, 'MEDIA_ROOT', None)
        
        if not media_root:
            self.stdout.write(
                self.style.ERROR('MEDIA_ROOT не настроен в settings.py')
            )
            return
        
        # Создаем основную директорию media
        if not os.path.exists(media_root):
            os.makedirs(media_root, exist_ok=True)
            self.stdout.write(
                self.style.SUCCESS(f'✓ Создана директория: {media_root}')
            )
        else:
            self.stdout.write(
                self.style.WARNING(f'✓ Директория уже существует: {media_root}')
            )
        
        # Создаем поддиректорию users
        users_dir = os.path.join(media_root, 'users')
        if not os.path.exists(users_dir):
            os.makedirs(users_dir, exist_ok=True)
            self.stdout.write(
                self.style.SUCCESS(f'✓ Создана директория: {users_dir}')
            )
        else:
            self.stdout.write(
                self.style.WARNING(f'✓ Директория уже существует: {users_dir}')
            )
        
        # Проверяем права на запись
        if os.access(media_root, os.W_OK):
            self.stdout.write(
                self.style.SUCCESS(f'✓ Есть права на запись в {media_root}')
            )
        else:
            self.stdout.write(
                self.style.ERROR(f'✗ НЕТ прав на запись в {media_root}')
            )
            self.stdout.write(
                self.style.WARNING('Выполните: chmod -R 755 media/')
            )
        
        # Выводим итоговую информацию
        self.stdout.write('\n' + '='*60)
        self.stdout.write('MEDIA директории настроены:')
        self.stdout.write(f'  MEDIA_ROOT: {media_root}')
        self.stdout.write(f'  MEDIA_URL: {getattr(settings, "MEDIA_URL", "/media/")}')
        self.stdout.write('='*60)
        
        self.stdout.write('\nТеперь можно загружать файлы через синхронизацию!')
