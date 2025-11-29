"""
Model Repository Interface
"""
from abc import ABC, abstractmethod
from typing import Optional

from ..entities.ml_model import MLModel


class IModelRepository(ABC):
    """Interface cho repository quản lý ML models"""
    
    @abstractmethod
    def save(self, model: MLModel) -> int:
        """Lưu model, trả về ID"""
        pass
    
    @abstractmethod
    def find_by_id(self, model_id: int) -> Optional[MLModel]:
        """Tìm model theo ID"""
        pass
    
    @abstractmethod
    def find_active_by_branch(self, branch_id: int) -> Optional[MLModel]:
        """Tìm model đang active cho branch"""
        pass
    
    @abstractmethod
    def deactivate_by_name(self, model_name: str) -> None:
        """Deactivate model theo tên"""
        pass
    
    @abstractmethod
    def find_last_train_date(self, model_name: str) -> Optional[str]:
        """Lấy ngày train cuối cùng của model"""
        pass

