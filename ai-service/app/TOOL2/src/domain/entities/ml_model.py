"""
ML Model Entity - Domain model for machine learning models
"""
from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional


@dataclass
class MLModel:
    """Entity đại diện cho ML model đã được train"""
    
    id: Optional[int] = None
    model_name: str = ""
    model_version: str = ""
    model_type: str = "ISOLATION_FOREST"
    
    # Model binary data (serialized)
    model_data: Optional[bytes] = None
    
    # Metadata
    hyperparameters: Optional[str] = None  # JSON string
    feature_list: Optional[str] = None  # JSON string
    training_data_start_date: Optional[date] = None
    training_data_end_date: Optional[date] = None
    training_samples_count: Optional[int] = None
    
    # Performance metrics
    accuracy_score: Optional[float] = None
    precision_score: Optional[float] = None
    recall_score: Optional[float] = None
    f1_score: Optional[float] = None
    
    # Training data statistics (JSON string)
    training_data_stats: Optional[str] = None
    
    # Lifecycle
    trained_at: Optional[datetime] = None
    is_active: bool = True
    is_production: bool = False
    created_by: Optional[str] = None
    
    def to_dict(self) -> dict:
        """Convert entity to dictionary"""
        return {
            'id': self.id,
            'model_name': self.model_name,
            'model_version': self.model_version,
            'model_type': self.model_type,
            'model_data': self.model_data,
            'hyperparameters': self.hyperparameters,
            'feature_list': self.feature_list,
            'training_data_start_date': self.training_data_start_date,
            'training_data_end_date': self.training_data_end_date,
            'training_samples_count': self.training_samples_count,
            'accuracy_score': self.accuracy_score,
            'precision_score': self.precision_score,
            'recall_score': self.recall_score,
            'f1_score': self.f1_score,
            'training_data_stats': self.training_data_stats,
            'trained_at': self.trained_at,
            'is_active': self.is_active,
            'is_production': self.is_production,
            'created_by': self.created_by
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'MLModel':
        """Create entity from dictionary"""
        return cls(**data)

