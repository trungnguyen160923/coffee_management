"""
Predict Forecast Use Case
"""
import json
from typing import Dict, Any, Optional
from datetime import date, datetime, timedelta

from ...domain.entities.forecast import ForecastResult
from ...domain.repositories.metrics_repository import IMetricsRepository
from ...domain.repositories.model_repository import IModelRepository
from ...domain.repositories.forecast_repository import IForecastRepository
from ...infrastructure.ml.forecast_predictor import ForecastPredictor


class PredictForecastUseCase:
    """Use case để predict demand forecast"""
    
    def __init__(self, metrics_repository: IMetricsRepository,
                 model_repository: IModelRepository,
                 forecast_repository: IForecastRepository):
        self.metrics_repository = metrics_repository
        self.model_repository = model_repository
        self.forecast_repository = forecast_repository
        self.predictor = ForecastPredictor()
    
    def execute(self, branch_id: int,
                algorithm: str,
                target_metric: str,
                forecast_horizon_days: int = 7,
                start_date: Optional[date] = None,
                model_id: Optional[int] = None,
                save_result: bool = True) -> Dict[str, Any]:
        """
        Predict demand forecast
        
        Args:
            branch_id: ID chi nhánh
            algorithm: 'PROPHET', 'LIGHTGBM', hoặc 'XGBOOST'
            target_metric: Metric cần dự báo
            forecast_horizon_days: Số ngày cần dự báo
            start_date: Ngày bắt đầu dự báo (nếu None thì dùng ngày mai)
            model_id: ID model cụ thể (nếu None thì dùng active model)
            save_result: Có lưu kết quả vào database không
        
        Returns:
            Dict chứa forecast result
        """
        # Load model
        if model_id:
            model_entity = self.model_repository.find_by_id(model_id)
            if not model_entity:
                raise ValueError(f"Không tìm thấy model với ID {model_id}")
        else:
            # Tìm active model cho branch và algorithm
            model_name = f"forecast_{algorithm.lower()}_{target_metric}_branch_{branch_id}"
            # Query trực tiếp vì không có method find_by_name trong repository
            # Lấy connection từ repository (cả hai đều dùng cùng db instance)
            db = self.metrics_repository.db if hasattr(self.metrics_repository, 'db') else None
            if not db:
                # Fallback: tạo connection mới
                from ...infrastructure.database.connection import DatabaseConnection
                db = DatabaseConnection()
                if not hasattr(db, 'is_connected') or not db.is_connected():
                    db.connect()
            
            query = """
            SELECT * FROM ml_models
            WHERE model_name = %s AND is_active = TRUE
            ORDER BY trained_at DESC LIMIT 1
            """
            result = db.execute_query(query, (model_name,))
            if not result:
                raise ValueError(f"Không tìm thấy active model cho {model_name}. "
                               f"Hãy train model trước bằng train_forecast_model_db.py")
            model_entity = self.model_repository.find_by_id(result[0]['id'])
        
        # Kiểm tra model type
        if model_entity.model_type != algorithm:
            raise ValueError(f"Model type không khớp: expected {algorithm}, got {model_entity.model_type}")
        
        # Lấy training data để tính lag features (cho tree-based models)
        training_metrics = self.metrics_repository.find_for_training(branch_id, days=90)
        
        # Xác định start_date
        if start_date is None:
            # Lấy ngày cuối cùng có dữ liệu
            if training_metrics:
                last_date = max(m.report_date for m in training_metrics)
                start_date = last_date + timedelta(days=1)
            else:
                start_date = date.today() + timedelta(days=1)
        
        # Predict
        forecast_values, confidence_intervals = self.predictor.predict(
            model_entity,
            training_metrics,
            periods=forecast_horizon_days,
            start_date=start_date
        )
        
        # Tính end_date
        end_date = start_date + timedelta(days=forecast_horizon_days - 1)
        
        # Tạo forecast result entity
        forecast_result = ForecastResult(
            branch_id=branch_id,
            forecast_date=date.today(),
            forecast_start_date=start_date,
            forecast_end_date=end_date,
            model_id=model_entity.id,
            target_metric=target_metric,
            algorithm=algorithm,
            forecast_values=json.dumps(forecast_values),
            confidence_intervals=json.dumps(confidence_intervals),
            training_samples_count=len(training_metrics),
            training_date_start=training_metrics[0].report_date if training_metrics else None,
            training_date_end=training_metrics[-1].report_date if training_metrics else None,
            forecast_horizon_days=forecast_horizon_days,
            created_at=datetime.now()
        )
        
        # Lưu vào database nếu cần
        if save_result:
            forecast_id = self.forecast_repository.save(forecast_result)
            forecast_result.id = forecast_id
        
        return {
            'forecast_id': forecast_result.id,
            'branch_id': branch_id,
            'algorithm': algorithm,
            'target_metric': target_metric,
            'forecast_start_date': str(start_date),
            'forecast_end_date': str(end_date),
            'forecast_values': forecast_values,
            'confidence_intervals': confidence_intervals,
            'forecast_horizon_days': forecast_horizon_days
        }

