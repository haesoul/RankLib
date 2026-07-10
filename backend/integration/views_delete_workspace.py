
import logging
from django.core.files.storage import default_storage
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from grading.models import (
    UserWorkspace, ClassOfGrading, GradeObject,
    MediaItem, Note, Proof, CategoryOfObject, SubCategoryOfObject,
)

logger = logging.getLogger(__name__)


def _collect_media_paths(workspace: UserWorkspace) -> list[str]:
    """
    Собирает пути всех медиафайлов пользователя из БД,
    чтобы удалить их с диска после удаления записей.
    """
    paths = []

    for cls in ClassOfGrading.objects.filter(workspace=workspace):
        if cls.photo:
            paths.append(cls.photo)

    for obj in GradeObject.objects.filter(class_of_grading__workspace=workspace):
        if obj.photo:
            paths.append(obj.photo)

    for media in MediaItem.objects.filter(grade_object__class_of_grading__workspace=workspace):
        if media.uri:
            paths.append(media.uri)
        if media.thumbnail_uri:
            paths.append(media.thumbnail_uri)

    for note in Note.objects.filter(grade_object__class_of_grading__workspace=workspace):
        if note.photo_uri:
            paths.append(note.photo_uri)

    # Proof.image — отдельная модель без прямой связи с workspace,
    # собираем через CategoryOfObject и SubCategoryOfObject
    cat_proof_ids = CategoryOfObject.objects.filter(
        grade_object__class_of_grading__workspace=workspace
    ).exclude(proof=None).values_list('proof_id', flat=True)

    sub_proof_ids = SubCategoryOfObject.objects.filter(
        category_of_object__grade_object__class_of_grading__workspace=workspace
    ).exclude(proof=None).values_list('proof_id', flat=True)

    proof_ids = set(cat_proof_ids) | set(sub_proof_ids)
    for proof in Proof.objects.filter(id__in=proof_ids):
        if proof.image:
            paths.append(proof.image)

    return paths


def _url_to_storage_path(url: str) -> str:
    """
    Преобразует URL файла в путь для default_storage.
    Работает как для /media/... так и для полных http(s):// URL.
    """
    base = getattr(default_storage, 'base_url', '/media/')
    if url.startswith(base):
        return url[len(base):]
    # Для полных URL берём только путь после /media/
    if '/media/' in url:
        return url.split('/media/', 1)[1]
    return url


def _delete_files_from_storage(paths: list[str]) -> dict:
    """Удаляет файлы из хранилища, возвращает статистику."""
    deleted = 0
    failed = 0
    missing = 0

    for url in paths:
        try:
            storage_path = _url_to_storage_path(url)
            if default_storage.exists(storage_path):
                default_storage.delete(storage_path)
                deleted += 1
            else:
                missing += 1
        except Exception as e:
            logger.error(f"Failed to delete file {url}: {e}")
            failed += 1

    return {'deleted': deleted, 'failed': failed, 'missing': missing}


class DeleteAllUserDataView(APIView):
    """
    DELETE /api/integration/sync/delete-all/

    Полностью удаляет UserWorkspace пользователя:
    - все классы, объекты, категории, оценки, теги, ранги
    - все медиафайлы с диска/хранилища

    Требует подтверждения: { "confirm": true }
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        # Требуем явное подтверждение чтобы не удалить случайно
        confirm = request.data.get('confirm', False)
        if not confirm:
            return Response(
                {'error': 'Укажи "confirm": true для подтверждения удаления'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            workspace = request.user.workspace
        except UserWorkspace.DoesNotExist:
            return Response(
                {'error': 'Workspace не найден'},
                status=status.HTTP_404_NOT_FOUND,
            )

        logger.info(f"Starting full data deletion for user {request.user.id} (workspace {workspace.id})")

        # 1. Собираем пути файлов ДО удаления записей из БД
        media_paths = _collect_media_paths(workspace)
        logger.info(f"Found {len(media_paths)} media files to delete")

        # 2. Удаляем workspace каскадно (все связанные данные удалятся через on_delete=CASCADE)
        workspace.delete()
        logger.info(f"Workspace {workspace.id} and all DB records deleted")

        # 3. Удаляем файлы с диска
        file_stats = _delete_files_from_storage(media_paths)
        logger.info(f"File deletion stats: {file_stats}")

        return Response(
            {
                'success': True,
                'message': 'Все данные пользователя удалены',
                'stats': {
                    'media_files_deleted': file_stats['deleted'],
                    'media_files_missing': file_stats['missing'],
                    'media_files_failed': file_stats['failed'],
                },
            },
            status=status.HTTP_200_OK,
        )
