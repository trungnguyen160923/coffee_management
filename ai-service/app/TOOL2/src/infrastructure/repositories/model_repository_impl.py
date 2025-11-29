"""
Model Repository Implementation
"""
import pickle
import json
from typing import Optional

from ...domain.entities.ml_model import MLModel
from ...domain.repositories.model_repository import IModelRepository
from ..database.connection import DatabaseConnection


class ModelRepositoryImpl(IModelRepository):
    """Implementation của model repository"""
    
    def __init__(self, db: DatabaseConnection):
        self.db = db
    
    def save(self, model: MLModel) -> int:
        """Lưu model, trả về ID"""
        query = """
        INSERT INTO ml_models (
            model_name, model_version, model_type,
            model_data,
            hyperparameters, feature_list,
            training_data_start_date, training_data_end_date, training_samples_count,
            training_data_stats,
            accuracy_score, precision_score, recall_score, f1_score,
            is_active, is_production,
            created_by
        ) VALUES (
            %s, %s, %s,
            %s,
            %s, %s,
            %s, %s, %s,
            %s,
            %s, %s, %s, %s,
            %s, %s,
            %s
        )
        """
        
        params = (
            model.model_name, model.model_version, model.model_type,
            model.model_data,
            model.hyperparameters, model.feature_list,
            model.training_data_start_date, model.training_data_end_date, model.training_samples_count,
            model.training_data_stats,
            model.accuracy_score, model.precision_score, model.recall_score, model.f1_score,
            model.is_active, model.is_production,
            model.created_by
        )
        
        result = self.db.execute_query(query, params, fetch=False)
        return result
    
    def find_by_id(self, model_id: int) -> Optional[MLModel]:
        """Tìm model theo ID"""
        query = "SELECT * FROM ml_models WHERE id = %s"
        result = self.db.execute_query(query, (model_id,))
        if result:
            return MLModel.from_dict(result[0])
        return None
    
    def find_active_by_branch(self, branch_id: int) -> Optional[MLModel]:
        """Tìm model đang active cho branch"""
        model_name = f"iforest_anomaly_branch_{branch_id}"
        query = """
        SELECT * FROM ml_models
        WHERE model_name = %s AND is_active = TRUE
        ORDER BY trained_at DESC LIMIT 1
        """
        result = self.db.execute_query(query, (model_name,))
        if result:
            return MLModel.from_dict(result[0])
        return None
    
    def find_by_branch_and_version(self, branch_id: int, model_version: str) -> Optional[MLModel]:
        """Tìm model theo branch và version"""
        model_name = f"iforest_anomaly_branch_{branch_id}"
        query = """
        SELECT * FROM ml_models
        WHERE model_name = %s AND model_version = %s
        ORDER BY trained_at DESC LIMIT 1
        """
        result = self.db.execute_query(query, (model_name, model_version))
        if result:
            return MLModel.from_dict(result[0])
        return None
    
    def deactivate_by_name(self, model_name: str) -> None:
        """Deactivate model theo tên"""
        query = """
        UPDATE ml_models
        SET is_active = FALSE
        WHERE model_name = %s AND is_active = TRUE
        """
        self.db.execute_query(query, (model_name,), fetch=False)
    
    def find_last_train_date(self, model_name: str) -> Optional[str]:
        """Lấy ngày train cuối cùng của model"""
        query = """
        SELECT MAX(trained_at) as last_train_date
        FROM ml_models
        WHERE model_name = %s AND is_active = TRUE
        """
        result = self.db.execute_query(query, (model_name,))
        if result and result[0]['last_train_date']:
            return str(result[0]['last_train_date'])
        return None

