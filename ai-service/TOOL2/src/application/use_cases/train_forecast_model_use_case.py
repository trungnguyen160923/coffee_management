"""
Train Forecast Model Use Case
"""
from typing import Dict, Any
from datetime import date

from ...domain.entities.metrics import DailyBranchMetrics
from ...domain.repositories.metrics_repository import IMetricsRepository
from ...domain.repositories.model_repository import IModelRepository
from ...infrastructure.ml.forecast_trainer import ForecastTrainer


class TrainForecastModelUseCase:
    """Use case để train forecasting model"""
    
    def __init__(self, metrics_repository: IMetricsRepository,
                 model_repository: IModelRepository):
        self.metrics_repository = metrics_repository
        self.model_repository = model_repository
        self.trainer = ForecastTrainer()
    
    def execute(self, branch_id: int,
                algorithm: str,
                target_metric: str,
                training_days: int = 90,
                rolling_window: int = None,
                model_version: str = "v1.0",
                created_by: str = "system",
                save_to_db: bool = True,
                **hyperparameters) -> Dict[str, Any]:
        """
        Train forecasting model
        
        Args:
            branch_id: ID chi nhánh
            algorithm: 'PROPHET', 'LIGHTGBM', hoặc 'XGBOOST'
            target_metric: Metric cần dự báo
            training_days: Số ngày dữ liệu training
            rolling_window: Số ngày rolling window (chỉ train trên N ngày cuối, None = dùng toàn bộ)
            model_version: Phiên bản model
            created_by: Người tạo model
            **hyperparameters: Hyperparameters cho từng algorithm
        
        Returns:
            Dict chứa model_id và metadata
        """
        # Lấy dữ liệu training
        metrics_list = self.metrics_repository.find_for_training(branch_id, days=training_days)
        
        if len(metrics_list) < 30:
            raise ValueError(f"Cần ít nhất 30 ngày dữ liệu. Hiện có: {len(metrics_list)} ngày")
        
        # Áp dụng rolling window nếu được chỉ định
        if rolling_window and rolling_window > 0:
            if rolling_window >= len(metrics_list):
                print(f"⚠️  Rolling window ({rolling_window}) >= tổng số samples ({len(metrics_list)}), dùng toàn bộ")
            else:
                # Chỉ lấy N ngày cuối
                metrics_list = metrics_list[-rolling_window:]
                print(f"📊 Áp dụng rolling window: chỉ train trên {len(metrics_list)} ngày cuối")
        
        # Chuẩn bị dữ liệu (cần cho đánh giá)
        df = self.trainer.prepare_time_series_data(metrics_list, target_metric)
        
        # Train model
        model, metadata = self.trainer.train(
            metrics_list,
            algorithm=algorithm,
            target_metric=target_metric,
            **hyperparameters
        )
        
        # Lưu metadata target_metric và rolling_window vào metadata
        metadata['target_metric'] = target_metric
        if rolling_window:
            metadata['rolling_window'] = rolling_window
            metadata['rolling_window_applied'] = True
        
        # Đánh giá model (train/test split)
        evaluation_metrics = None
        try:
            evaluation_metrics = self.trainer.evaluate_model(
                model=model,
                metadata=metadata,
                training_df=df,
                algorithm=algorithm,
                target_metric=target_metric,
                test_ratio=0.2  # 20% dữ liệu test
            )
            # Lưu evaluation metrics vào metadata
            metadata['evaluation_metrics'] = evaluation_metrics
        except Exception as e:
            # Nếu đánh giá thất bại, vẫn tiếp tục lưu model
            metadata['evaluation_error'] = str(e)
        
        # Lưu model vào repository (nếu save_to_db = True)
        model_id = None
        if save_to_db:
            model_id = self.trainer.save_model_to_repository(
                self.model_repository,
                branch_id,
                model,
                metadata,
                target_metric,
                algorithm,
                model_version,
                created_by
            )
        
        return {
            'model_id': model_id,
            'algorithm': algorithm,
            'target_metric': target_metric,
            'training_samples': len(metrics_list),
            'metadata': metadata,
            'evaluation_metrics': evaluation_metrics
        }

