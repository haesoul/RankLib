"""
Валидаторы данных Realm
"""

from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class RealmDataValidator:
    """Валидация данных из Realm"""
    
    @staticmethod
    def validate_class_of_grading(data: Dict[str, Any]) -> bool:
        """Валидация класса"""
        required_fields = ['_id', 'name', 'priority']
        return all(field in data for field in required_fields)
    
    @staticmethod
    def validate_category(data: Dict[str, Any]) -> bool:
        """Валидация категории"""
        required_fields = ['_id', 'name', 'priority']
        return all(field in data for field in required_fields)
    
    @staticmethod
    def validate_grade_object(data: Dict[str, Any]) -> bool:
        """Валидация объекта"""
        required_fields = ['_id', 'name']
        return all(field in data for field in required_fields)
    
    @staticmethod
    def validate_tag(data: Dict[str, Any]) -> bool:
        """Валидация тега"""
        required_fields = ['_id', 'name']
        return all(field in data for field in required_fields)
    
    @staticmethod
    def validate_rank_type(data: Dict[str, Any]) -> bool:
        """Валидация типа ранга"""
        required_fields = ['_id', 'name', 'fromRank']
        return all(field in data for field in required_fields)
