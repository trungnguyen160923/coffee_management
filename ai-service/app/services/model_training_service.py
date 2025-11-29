"""
Service responsible for retraining ML models (Isolation Forest & Prophet)
using TOOL2 infrastructure modules.
"""
import logging
import json
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple

from app.config import settings

from app.TOOL2.src.infrastructure.database.connection import DatabaseConnection  # type: ignore
from app.TOOL2.src.infrastructure.repositories.metrics_repository_impl import MetricsRepositoryImpl  # type: ignore
from app.TOOL2.src.infrastructure.repositories.model_repository_impl import ModelRepositoryImpl  # type: ignore
from app.TOOL2.src.infrastructure.ml.ml_trainer import MLTrainer  # type: ignore
from app.TOOL2.src.infrastructure.ml.ml_predictor import MLPredictor  # type: ignore
from app.TOOL2.src.infrastructure.ml.forecast_trainer import ForecastTrainer  # type: ignore
from app.TOOL2.src.infrastructure.ml.forecast_predictor import ForecastPredictor  # type: ignore
from app.TOOL2.src.infrastructure.ml.hyperparameter_tuner import HyperparameterTuner  # type: ignore
from app.TOOL2.src.application.use_cases.train_forecast_model_use_case import TrainForecastModelUseCase  # type: ignore

logger = logging.getLogger(__name__)


class ModelTrainingService:
    """Coordinate model retraining for all branches."""

    def __init__(self):
        self.iforest_trainer = MLTrainer()
        self.forecast_trainer = ForecastTrainer()
        self.iforest_predictor = MLPredictor()
        self.forecast_predictor = ForecastPredictor()
        self.tuner = HyperparameterTuner(
            n_trials=settings.TUNING_N_TRIALS,
            timeout=settings.TUNING_TIMEOUT_SECONDS
        ) if settings.ENABLE_HYPERPARAMETER_TUNING else None

    def retrain_all_branches(
        self,
        branch_ids: Optional[List[int]] = None,
        target_metric: Optional[str] = None,
        algorithm: Optional[str] = None,
    ) -> Dict[str, object]:
        """
        Retrain Isolation Forest and Prophet models for every branch.
        """
        database_name = settings.DB_NAME or "analytics_db"
        db = DatabaseConnection(database_name=database_name)
        db.connect()
        try:
            metrics_repo = MetricsRepositoryImpl(db)
            model_repo = ModelRepositoryImpl(db)
            branch_list = branch_ids or metrics_repo.find_all_branches()

            logger.info(
                "Starting model retraining for %s branches (Isolation Forest + Prophet)",
                len(branch_list),
            )

            results: List[Dict[str, object]] = []
            for branch_id in branch_list:
                branch_result: Dict[str, object] = {"branch_id": branch_id}
                try:
                    branch_result["iforest"] = self._train_isolation_forest(
                        metrics_repo, model_repo, branch_id
                    )
                except Exception as exc:  # pragma: no cover - defensive
                    logger.error(
                        "Isolation Forest training failed for branch %s: %s",
                        branch_id,
                        exc,
                        exc_info=True,
                    )
                    branch_result["iforest_error"] = str(exc)

                try:
                    branch_result["forecast"] = self._train_prophet_forecast(
                        metrics_repo,
                        model_repo,
                        branch_id,
                        target_metric=target_metric or settings.FORECAST_TARGET_METRIC,
                        algorithm=algorithm or settings.FORECAST_ALGORITHM,
                    )
                except Exception as exc:  # pragma: no cover - defensive
                    logger.error(
                        "Forecast training failed for branch %s: %s",
                        branch_id,
                        exc,
                        exc_info=True,
                    )
                    branch_result["forecast_error"] = str(exc)

                results.append(branch_result)

            success = any(
                "iforest" in item or "forecast" in item for item in results
            )
            return {
                "success": success,
                "branch_count": len(branch_list),
                "results": results,
            }
        finally:
            db.disconnect()

    def _train_isolation_forest(
        self,
        metrics_repo: MetricsRepositoryImpl,
        model_repo: ModelRepositoryImpl,
        branch_id: int,
    ) -> Dict[str, object]:
        """Train and persist Isolation Forest model for a branch with hyperparameter tuning."""
        metrics_list = metrics_repo.find_for_training(
            branch_id, days=settings.IFOREST_TRAINING_DAYS
        )
        if len(metrics_list) < settings.MIN_TRAINING_SAMPLES:
            raise ValueError(
                f"branch_id={branch_id} only has {len(metrics_list)} samples "
                f"(requires >= {settings.MIN_TRAINING_SAMPLES})"
            )

        # Load và evaluate model cũ (nếu có)
        old_model_entity = model_repo.find_active_by_branch(branch_id)
        old_separation_score = None
        if old_model_entity:
            try:
                old_separation_score = self._evaluate_old_iforest_model(
                    old_model_entity, metrics_list, metrics_repo
                )
                logger.info(
                    "Old Isolation Forest model found for branch %s, separation_score=%.4f",
                    branch_id, old_separation_score
                )
            except Exception as e:
                logger.warning(
                    "Failed to evaluate old Isolation Forest model for branch %s: %s",
                    branch_id, e
                )

        # Tune hyperparameters nếu enabled
        if self.tuner and len(metrics_list) >= 60:  # Cần đủ data để split train/val
            try:
                tuning_result = self.tuner.tune_isolation_forest(
                    metrics_list,
                    self.iforest_trainer,
                    validation_ratio=settings.TUNING_VALIDATION_RATIO,
                    min_training_samples=settings.MIN_TRAINING_SAMPLES
                )
                best_params = tuning_result['best_params']
                logger.info(
                    "Tuning completed for branch %s: best_separation=%.4f, params=%s",
                    branch_id, tuning_result['best_score'], best_params
                )
            except Exception as e:
                logger.warning(
                    "Hyperparameter tuning failed for branch %s, using defaults: %s",
                    branch_id, e
                )
                best_params = {
                    'n_estimators': settings.IFOREST_N_ESTIMATORS,
                    'contamination': settings.IFOREST_CONTAMINATION
                }
        else:
            best_params = {
                'n_estimators': settings.IFOREST_N_ESTIMATORS,
                'contamination': settings.IFOREST_CONTAMINATION
            }
            if self.tuner:
                logger.info(
                    "Skipping tuning for branch %s (insufficient data: %d samples)",
                    branch_id, len(metrics_list)
                )

        # Train model mới với best hyperparameters
        model, scaler, metadata = self.iforest_trainer.train(
            metrics_list,
            n_estimators=best_params['n_estimators'],
            contamination=best_params['contamination'],
        )

        # Evaluate model mới
        new_separation_score = self._calculate_iforest_separation_score(
            model, metrics_list
        )

        # So sánh với model cũ
        should_save = True
        comparison_info = {
            "has_old_model": old_separation_score is not None,
            "old_separation_score": old_separation_score,
            "new_separation_score": new_separation_score,
            "improvement_percent": None,
            "decision_reason": None
        }
        
        if old_separation_score is not None:
            improvement_threshold = settings.MODEL_COMPARISON_THRESHOLD
            improvement = (new_separation_score - old_separation_score) / old_separation_score * 100
            comparison_info["improvement_percent"] = improvement
            
            if improvement < improvement_threshold:
                should_save = False
                comparison_info["decision_reason"] = (
                    f"New model worse than old (improvement={improvement:.2f}% < threshold={improvement_threshold}%). "
                    f"Keeping old model (old_score={old_separation_score:.4f} > new_score={new_separation_score:.4f})."
                )
                logger.info(
                    "New Isolation Forest model for branch %s is worse (old=%.4f, new=%.4f, improvement=%.2f%%). "
                    "Skipping save, keeping old model.",
                    branch_id, old_separation_score, new_separation_score, improvement
                )
            else:
                comparison_info["decision_reason"] = (
                    f"New model better than old (improvement={improvement:.2f}% >= threshold={improvement_threshold}%). "
                    f"Replacing old model (old_score={old_separation_score:.4f} < new_score={new_separation_score:.4f})."
                )
                logger.info(
                    "New Isolation Forest model for branch %s is better (old=%.4f, new=%.4f, improvement=%.2f%%). "
                    "Saving new model.",
                    branch_id, old_separation_score, new_separation_score, improvement
                )
        else:
            comparison_info["decision_reason"] = "No old model found. Saving new model as first model."
            logger.info(
                "No old Isolation Forest model found for branch %s. Saving new model.",
                branch_id
            )

        if not should_save:
            return {
                "action": "skipped",
                "reason": "new_model_worse_than_old",
                "comparison": comparison_info,
                "samples": metadata.get("training_samples"),
                "date_range": f"{metadata.get('training_date_start')}→{metadata.get('training_date_end')}",
                "hyperparameters": best_params,
            }

        # Lưu model mới
        model_id = self.iforest_trainer.save_model_to_repository(
            model_repo,
            branch_id,
            model,
            scaler,
            metadata,
            model_version=settings.FORECAST_MODEL_VERSION,
            created_by=settings.FORECAST_CREATED_BY,
        )
        logger.info(
            "Isolation Forest retrained for branch %s (model_id=%s, samples=%s, separation=%.4f)",
            branch_id,
            model_id,
            metadata.get("training_samples"),
            new_separation_score
        )
        return {
            "action": "saved",
            "model_id": model_id,
            "samples": metadata.get("training_samples"),
            "date_range": f"{metadata.get('training_date_start')}→{metadata.get('training_date_end')}",
            "separation_score": new_separation_score,
            "hyperparameters": best_params,
            "comparison": comparison_info,
        }

    def _train_prophet_forecast(
        self,
        metrics_repo: MetricsRepositoryImpl,
        model_repo: ModelRepositoryImpl,
        branch_id: int,
        target_metric: str,
        algorithm: str,
    ) -> Dict[str, object]:
        """Train and persist Prophet (or configured) forecast model with hyperparameter tuning."""
        metrics_list = metrics_repo.find_for_training(
            branch_id, days=settings.FORECAST_TRAINING_DAYS
        )
        if len(metrics_list) < 30:
            raise ValueError(f"Cần ít nhất 30 ngày dữ liệu. Hiện có: {len(metrics_list)} ngày")

        # Load và evaluate model cũ (nếu có)
        model_name = f"forecast_{algorithm.lower()}_{target_metric}_branch_{branch_id}"
        old_model_entity = self._find_active_forecast_model(model_repo, model_name)
        old_mae = None
        if old_model_entity:
            try:
                old_mae = self._evaluate_old_forecast_model(
                    old_model_entity, metrics_list, target_metric, algorithm
                )
                logger.info(
                    "Old forecast model found for branch %s (%s), mae=%.4f",
                    branch_id, algorithm, old_mae
                )
            except Exception as e:
                logger.warning(
                    "Failed to evaluate old forecast model for branch %s: %s",
                    branch_id, e
                )

        # Tune hyperparameters nếu enabled và là Prophet
        if self.tuner and algorithm.upper() == 'PROPHET' and len(metrics_list) >= 60:
            try:
                tuning_result = self.tuner.tune_prophet(
                    metrics_list,
                    target_metric,
                    self.forecast_trainer,
                    validation_ratio=settings.TUNING_VALIDATION_RATIO,
                    min_training_samples=30
                )
                best_params = tuning_result['best_params']
                logger.info(
                    "Tuning completed for branch %s (%s): best_mae=%.4f, params=%s",
                    branch_id, algorithm, tuning_result['best_score'], best_params
                )
            except Exception as e:
                logger.warning(
                    "Hyperparameter tuning failed for branch %s, using defaults: %s",
                    branch_id, e
                )
                best_params = {
                    'seasonality_mode': settings.FORECAST_SEASONALITY_MODE,
                    'yearly_seasonality': settings.FORECAST_YEARLY_SEASONALITY,
                    'weekly_seasonality': settings.FORECAST_WEEKLY_SEASONALITY,
                    'use_external_regressors': settings.FORECAST_USE_REGRESSORS
                }
        else:
            best_params = {
                'seasonality_mode': settings.FORECAST_SEASONALITY_MODE,
                'yearly_seasonality': settings.FORECAST_YEARLY_SEASONALITY,
                'weekly_seasonality': settings.FORECAST_WEEKLY_SEASONALITY,
                'use_external_regressors': settings.FORECAST_USE_REGRESSORS
            }
            if self.tuner and algorithm.upper() != 'PROPHET':
                logger.info("Tuning only supported for Prophet, using defaults for %s", algorithm)
            elif self.tuner:
                logger.info(
                    "Skipping tuning for branch %s (insufficient data: %d samples)",
                    branch_id, len(metrics_list)
                )

        # Train model mới với best hyperparameters
        train_use_case = TrainForecastModelUseCase(metrics_repo, model_repo)
        result = train_use_case.execute(
            branch_id=branch_id,
            algorithm=algorithm.upper(),
            target_metric=target_metric,
            training_days=settings.FORECAST_TRAINING_DAYS,
            rolling_window=None,
            model_version=settings.FORECAST_MODEL_VERSION,
            created_by=settings.FORECAST_CREATED_BY,
            seasonality_mode=best_params.get('seasonality_mode', settings.FORECAST_SEASONALITY_MODE),
            yearly_seasonality=best_params.get('yearly_seasonality', settings.FORECAST_YEARLY_SEASONALITY),
            weekly_seasonality=best_params.get('weekly_seasonality', settings.FORECAST_WEEKLY_SEASONALITY),
            daily_seasonality=False,
            use_external_regressors=best_params.get('use_external_regressors', settings.FORECAST_USE_REGRESSORS),
        )

        # Lấy evaluation metrics từ result (đã được tính trong TrainForecastModelUseCase)
        evaluation_metrics = result.get('evaluation_metrics', {})
        new_mae = evaluation_metrics.get('mae')

        # So sánh với model cũ
        should_save = True
        comparison_info = {
            "has_old_model": old_mae is not None,
            "old_mae": old_mae,
            "new_mae": new_mae,
            "improvement_percent": None,
            "decision_reason": None
        }
        
        if old_mae is not None and new_mae is not None:
            improvement_threshold = settings.MODEL_COMPARISON_THRESHOLD
            # MAE càng thấp càng tốt, nên improvement = (old - new) / old * 100
            improvement = (old_mae - new_mae) / old_mae * 100
            comparison_info["improvement_percent"] = improvement
            
            if improvement < improvement_threshold:
                should_save = False
                comparison_info["decision_reason"] = (
                    f"New model worse than old (improvement={improvement:.2f}% < threshold={improvement_threshold}%). "
                    f"Keeping old model (old_mae={old_mae:.4f} < new_mae={new_mae:.4f})."
                )
                logger.info(
                    "New forecast model for branch %s (%s) is worse (old_mae=%.4f, new_mae=%.4f, improvement=%.2f%%). "
                    "Skipping save, keeping old model.",
                    branch_id, algorithm, old_mae, new_mae, improvement
                )
                # Xóa model mới đã được tạo (nếu có)
                if result.get('model_id'):
                    try:
                        delete_query = "DELETE FROM ml_models WHERE id = %s"
                        model_repo.db.execute_query(delete_query, (result['model_id'],), fetch=False)
                    except Exception as e:
                        logger.warning("Failed to delete new model: %s", e)
            else:
                comparison_info["decision_reason"] = (
                    f"New model better than old (improvement={improvement:.2f}% >= threshold={improvement_threshold}%). "
                    f"Replacing old model (old_mae={old_mae:.4f} > new_mae={new_mae:.4f})."
                )
                logger.info(
                    "New forecast model for branch %s (%s) is better (old_mae=%.4f, new_mae=%.4f, improvement=%.2f%%). "
                    "Saving new model.",
                    branch_id, algorithm, old_mae, new_mae, improvement
                )
        else:
            if old_mae is None:
                comparison_info["decision_reason"] = "No old model found. Saving new model as first model."
                logger.info(
                    "No old forecast model found for branch %s (%s). Saving new model.",
                    branch_id, algorithm
                )
            elif new_mae is None:
                comparison_info["decision_reason"] = "New model evaluation failed. Saving anyway (no comparison possible)."
                logger.warning(
                    "New forecast model evaluation failed for branch %s (%s). Saving anyway.",
                    branch_id, algorithm
                )

        if not should_save:
            return {
                "action": "skipped",
                "reason": "new_model_worse_than_old",
                "comparison": comparison_info,
                "algorithm": result.get("algorithm"),
                "target_metric": result.get("target_metric"),
                "samples": result.get("training_samples"),
                "hyperparameters": best_params,
            }

        logger.info(
            "Forecast retrained for branch %s (model_id=%s, algorithm=%s, samples=%s, mae=%.4f)",
            branch_id,
            result.get("model_id"),
            algorithm,
            result.get("training_samples"),
            new_mae or 0.0
        )
        return {
            "action": "saved",
            "model_id": result.get("model_id"),
            "algorithm": result.get("algorithm"),
            "target_metric": result.get("target_metric"),
            "samples": result.get("training_samples"),
            "mae": new_mae,
            "hyperparameters": best_params,
            "comparison": comparison_info,
        }
    
    def _find_active_forecast_model(self, model_repo: ModelRepositoryImpl, model_name: str):
        """Tìm active forecast model theo tên"""
        query = """
        SELECT * FROM ml_models
        WHERE model_name = %s AND is_active = TRUE
        ORDER BY trained_at DESC LIMIT 1
        """
        result = model_repo.db.execute_query(query, (model_name,))
        if result:
            from app.TOOL2.src.domain.entities.ml_model import MLModel  # type: ignore
            return MLModel.from_dict(result[0])
        return None
    
    def _evaluate_old_forecast_model(
        self, old_model_entity, metrics_list, target_metric: str, algorithm: str
    ) -> float:
        """Evaluate old forecast model và trả về MAE"""
        model, metadata = self.forecast_predictor.load_model(old_model_entity)
        
        # Chuẩn bị dữ liệu để evaluate
        df = self.forecast_trainer.prepare_time_series_data(metrics_list, target_metric)
        
        # Dùng 20% cuối để evaluate
        split_idx = int(len(df) * 0.8)
        test_df = df.iloc[split_idx:].copy()
        
        if len(test_df) < 5:
            raise ValueError("Không đủ dữ liệu test để evaluate")
        
        # Predict
        if algorithm.upper() == 'PROPHET':
            future_df = pd.DataFrame({'ds': test_df['ds'].values})
            # Thêm external regressors nếu có
            if metadata.get('use_external_regressors', False):
                external_regressors = metadata.get('external_regressors', [])
                for regressor in external_regressors:
                    if regressor in test_df.columns:
                        future_df[regressor] = test_df[regressor].values
                    elif regressor == 'day_of_week':
                        future_df[regressor] = test_df['ds'].dt.dayofweek + 1
                    elif regressor == 'is_weekend':
                        future_df[regressor] = (test_df['ds'].dt.dayofweek >= 5).astype(int)
                    else:
                        # Dùng giá trị trung bình từ train
                        train_df = df.iloc[:split_idx]
                        avg_value = train_df[regressor].mean() if regressor in train_df.columns else 0.0
                        future_df[regressor] = float(avg_value) if not pd.isna(avg_value) else 0.0
            
            forecast = model.predict(future_df)
            predictions = forecast['yhat'].values
        else:
            # LightGBM/XGBoost: cần implement tương tự
            raise NotImplementedError(f"Evaluation for {algorithm} not yet implemented")
        
        actuals = test_df['y'].values
        mae = float(np.mean(np.abs(predictions - actuals)))
        return mae
    
    def _evaluate_old_iforest_model(
        self, old_model_entity, metrics_list, metrics_repo
    ) -> float:
        """Evaluate old Isolation Forest model và trả về separation score"""
        model, scaler, score_stats = self.iforest_predictor.load_model(old_model_entity)
        
        # Dùng 20% cuối để evaluate
        split_idx = int(len(metrics_list) * 0.8)
        val_metrics = metrics_list[split_idx:]
        
        if len(val_metrics) < 5:
            raise ValueError("Không đủ dữ liệu validation để evaluate")
        
        X_val, _ = self.iforest_trainer.prepare_training_data(val_metrics)
        predictions = model.predict(X_val)
        scores = model.score_samples(X_val)
        
        # Tính separation score
        anomaly_mask = (predictions == -1)
        if np.sum(anomaly_mask) == 0 or np.sum(~anomaly_mask) == 0:
            return 0.0
        
        anomaly_scores = scores[anomaly_mask]
        normal_scores = scores[~anomaly_mask]
        separation = float(np.mean(normal_scores) - np.mean(anomaly_scores))
        return separation
    
    def _calculate_iforest_separation_score(self, model, metrics_list) -> float:
        """Tính separation score cho Isolation Forest model"""
        X, _ = self.iforest_trainer.prepare_training_data(metrics_list)
        predictions = model.predict(X)
        scores = model.score_samples(X)
        
        anomaly_mask = (predictions == -1)
        if np.sum(anomaly_mask) == 0 or np.sum(~anomaly_mask) == 0:
            return 0.0
        
        anomaly_scores = scores[anomaly_mask]
        normal_scores = scores[~anomaly_mask]
        separation = float(np.mean(normal_scores) - np.mean(anomaly_scores))
        return separation


