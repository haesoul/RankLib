"""
URL конфигурация для integration app
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SyncViewSet, FileUploadView

from .views_delete_workspace import DeleteAllUserDataView


router = DefaultRouter()
router.register(r'sync', SyncViewSet, basename='sync')

app_name = 'integration'

urlpatterns = [
    path('', include(router.urls)),
    
    path('sync/upload-file/', FileUploadView.as_view(), name='upload-file'),
    path('sync/delete-all/', DeleteAllUserDataView.as_view(), name='delete-all'),
]
