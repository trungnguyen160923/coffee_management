"""
Forecast Entity - Domain model for demand forecasts
"""
from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional, Dict, Any


@dataclass
class ForecastResult:
    """Entity đại diện cho kết quả dự báo nhu cầu"""
    
    id: Optional[int] = None
    branch_id: int = 0
    forecast_date: date = None  # Ngày được dự báo
    forecast_start_date: date = None  # Ngày bắt đầu dự báo
    forecast_end_date: date = None  # Ngày kết thúc dự báo
    model_id: Optional[int] = None  # FK đến ml_models
    
    # Target metric được dự báo
    target_metric: str = "order_count"  # order_count, total_revenue, customer_count, etc.
    algorithm: str = "PROPHET"  # PROPHET, LIGHTGBM, XGBOOST
    
    # Kết quả dự báo (JSON): {date: value, ...}
    forecast_values: Optional[str] = None  # JSON string: {"2025-11-09": 150, "2025-11-10": 165, ...}
    
    # Confidence intervals (JSON): {date: {"lower": x, "upper": y}, ...}
    confidence_intervals: Optional[str] = None  # JSON string
    
    # Performance metrics (nếu có validation)
    mae: Optional[float] = None  # Mean Absolute Error
    mse: Optional[float] = None  # Mean Squared Error
    rmse: Optional[float] = None  # Root Mean Squared Error
    mape: Optional[float] = None  # Mean Absolute Percentage Error
    
    # Metadata
    training_samples_count: Optional[int] = None
    training_date_start: Optional[date] = None
    training_date_end: Optional[date] = None
    forecast_horizon_days: int = 7  # Số ngày dự báo
    
    # Timestamps
    created_at: Optional[datetime] = None
    
    def to_dict(self) -> dict:
        """Convert entity to dictionary"""
        return {
            'id': self.id,
            'branch_id': self.branch_id,
            'forecast_date': self.forecast_date,
            'forecast_start_date': self.forecast_start_date,
            'forecast_end_date': self.forecast_end_date,
            'model_id': self.model_id,
            'target_metric': self.target_metric,
            'algorithm': self.algorithm,
            'forecast_values': self.forecast_values,
            'confidence_intervals': self.confidence_intervals,
            'mae': self.mae,
            'mse': self.mse,
            'rmse': self.rmse,
            'mape': self.mape,
            'training_samples_count': self.training_samples_count,
            'training_date_start': self.training_date_start,
            'training_date_end': self.training_date_end,
            'forecast_horizon_days': self.forecast_horizon_days,
            'created_at': self.created_at
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'ForecastResult':
        """Create entity from dictionary"""
        valid_fields = {
            'id', 'branch_id', 'forecast_date', 'forecast_start_date', 'forecast_end_date',
            'model_id', 'target_metric', 'algorithm', 'forecast_values', 'confidence_intervals',
            'mae', 'mse', 'rmse', 'mape', 'training_samples_count',
            'training_date_start', 'training_date_end', 'forecast_horizon_days', 'created_at'
        }
        filtered_data = {k: v for k, v in data.items() if k in valid_fields}
        return cls(**filtered_data)
    
    def get_forecast_dict(self) -> Dict[str, float]:
        """Parse forecast_values JSON thành dict"""
        import json
        if self.forecast_values:
            return json.loads(self.forecast_values)
        return {}
    
    def get_confidence_dict(self) -> Dict[str, Dict[str, float]]:
        """Parse confidence_intervals JSON thành dict"""
        import json
        if self.confidence_intervals:
            return json.loads(self.confidence_intervals)
        return {}

