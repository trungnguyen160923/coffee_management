"""
Hyperparameter Tuning Service using Optuna for Bayesian Optimization
"""
import logging
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import pandas as pd
import optuna
from optuna.samplers import TPESampler
from optuna.pruners import MedianPruner

from ...domain.entities.metrics import DailyBranchMetrics

logger = logging.getLogger(__name__)


class HyperparameterTuner:
    """Service để tìm hyperparameter tối ưu cho ML models"""
    
    def __init__(self, n_trials: int = 20, timeout: Optional[int] = None):
        """
        Args:
            n_trials: Số lần thử nghiệm (trials) cho Optuna
            timeout: Timeout cho optimization (seconds), None = không giới hạn
        """
        self.n_trials = n_trials
        self.timeout = timeout
    
    def tune_prophet(
        self,
        metrics_list: List[DailyBranchMetrics],
        target_metric: str,
        forecast_trainer,
        validation_ratio: float = 0.2,
        min_training_samples: int = 30
    ) -> Dict[str, Any]:
        """
        Tune hyperparameters cho Prophet model
        
        Args:
            metrics_list: List of DailyBranchMetrics entities
            target_metric: Target metric to forecast
            forecast_trainer: ForecastTrainer instance
            validation_ratio: Tỷ lệ dữ liệu validation (0.2 = 20%)
            min_training_samples: Số samples tối thiểu sau khi split
            
        Returns:
            Dict chứa best_params và best_score
        """
        if len(metrics_list) < min_training_samples:
            raise ValueError(
                f"Cần ít nhất {min_training_samples} samples để tuning. "
                f"Hiện có: {len(metrics_list)}"
            )
        
        # Chuẩn bị dữ liệu
        df = forecast_trainer.prepare_time_series_data(metrics_list, target_metric)
        
        # Split train/validation
        split_idx = int(len(df) * (1 - validation_ratio))
        train_df = df.iloc[:split_idx].copy()
        val_df = df.iloc[split_idx:].copy()
        
        if len(train_df) < min_training_samples or len(val_df) < 5:
            raise ValueError(
                f"Sau khi split, train={len(train_df)}, val={len(val_df)}. "
                f"Cần ít nhất train>={min_training_samples}, val>=5"
            )
        
        def objective(trial: optuna.Trial) -> float:
            """Objective function cho Optuna"""
            try:
                # Suggest hyperparameters
                seasonality_mode = trial.suggest_categorical(
                    'seasonality_mode', ['additive', 'multiplicative']
                )
                yearly_seasonality = trial.suggest_categorical(
                    'yearly_seasonality', [True, False]
                )
                weekly_seasonality = trial.suggest_categorical(
                    'weekly_seasonality', [True, False]
                )
                use_external_regressors = trial.suggest_categorical(
                    'use_external_regressors', [True, False]
                )
                
                # Train model với hyperparameters này
                model, _ = forecast_trainer.train_prophet(
                    train_df,
                    seasonality_mode=seasonality_mode,
                    yearly_seasonality=yearly_seasonality,
                    weekly_seasonality=weekly_seasonality,
                    daily_seasonality=False,
                    use_external_regressors=use_external_regressors
                )
                
                # Evaluate trên validation set
                # Predict cho validation dates
                future_df = pd.DataFrame({
                    'ds': val_df['ds'].values
                })
                
                # Thêm external regressors nếu model đã train với chúng
                if use_external_regressors:
                    external_regressors = []
                    potential_regressors = [
                        'day_of_week', 'is_weekend', 'peak_hour',
                        'total_revenue', 'customer_count', 'order_count'
                    ]
                    for regressor in potential_regressors:
                        if regressor in train_df.columns and regressor != 'y':
                            non_null_count = train_df[regressor].notna().sum()
                            if non_null_count > len(train_df) * 0.5:
                                external_regressors.append(regressor)
                    
                    for regressor in external_regressors:
                        if regressor in val_df.columns:
                            future_df[regressor] = val_df[regressor].values
                        elif regressor == 'day_of_week':
                            future_df[regressor] = val_df['ds'].dt.dayofweek + 1
                        elif regressor == 'is_weekend':
                            future_df[regressor] = (val_df['ds'].dt.dayofweek >= 5).astype(int)
                        else:
                            # Dùng giá trị trung bình từ train
                            avg_value = train_df[regressor].mean()
                            future_df[regressor] = float(avg_value) if not pd.isna(avg_value) else 0.0
                
                # Predict
                forecast = model.predict(future_df)
                predictions = forecast['yhat'].values
                actuals = val_df['y'].values
                
                # Tính MAE (Mean Absolute Error) - metric chính
                mae = np.mean(np.abs(predictions - actuals))
                
                # Optuna minimize, nên return MAE
                return float(mae)
                
            except Exception as e:
                logger.warning(f"Trial failed: {e}")
                # Return một giá trị rất lớn để Optuna biết trial này failed
                return float('inf')
        
        # Tạo study và optimize
        study = optuna.create_study(
            direction='minimize',  # Minimize MAE
            sampler=TPESampler(seed=42),  # Tree-structured Parzen Estimator
            pruner=MedianPruner(n_startup_trials=5, n_warmup_steps=10)
        )
        
        logger.info(
            f"Bắt đầu tuning Prophet với {self.n_trials} trials "
            f"(train={len(train_df)}, val={len(val_df)})"
        )
        
        study.optimize(
            objective,
            n_trials=self.n_trials,
            timeout=self.timeout,
            show_progress_bar=False
        )
        
        if study.best_trial.value == float('inf'):
            raise RuntimeError("Tất cả trials đều failed. Không tìm được hyperparameter tốt.")
        
        best_params = study.best_params
        best_score = study.best_value
        
        logger.info(
            f"Tuning Prophet hoàn thành: best_mae={best_score:.4f}, "
            f"params={best_params}"
        )
        
        return {
            'best_params': best_params,
            'best_score': best_score,
            'n_trials': len(study.trials),
            'best_trial_number': study.best_trial.number
        }
    
    def tune_isolation_forest(
        self,
        metrics_list: List[DailyBranchMetrics],
        ml_trainer,
        validation_ratio: float = 0.2,
        min_training_samples: int = 30
    ) -> Dict[str, Any]:
        """
        Tune hyperparameters cho Isolation Forest model
        
        Args:
            metrics_list: List of DailyBranchMetrics entities
            ml_trainer: MLTrainer instance
            validation_ratio: Tỷ lệ dữ liệu validation
            min_training_samples: Số samples tối thiểu sau khi split
            
        Returns:
            Dict chứa best_params và best_score
        """
        if len(metrics_list) < min_training_samples:
            raise ValueError(
                f"Cần ít nhất {min_training_samples} samples để tuning. "
                f"Hiện có: {len(metrics_list)}"
            )
        
        # Split train/validation
        split_idx = int(len(metrics_list) * (1 - validation_ratio))
        train_metrics = metrics_list[:split_idx]
        val_metrics = metrics_list[split_idx:]
        
        if len(train_metrics) < min_training_samples or len(val_metrics) < 5:
            raise ValueError(
                f"Sau khi split, train={len(train_metrics)}, val={len(val_metrics)}. "
                f"Cần ít nhất train>={min_training_samples}, val>=5"
            )
        
        # Chuẩn bị validation data
        X_val, _ = ml_trainer.prepare_training_data(val_metrics)
        
        def objective(trial: optuna.Trial) -> float:
            """Objective function cho Optuna"""
            try:
                # Suggest hyperparameters
                n_estimators = trial.suggest_int('n_estimators', 50, 500, step=50)
                contamination = trial.suggest_float('contamination', 0.05, 0.2, step=0.05)
                
                # Train model với hyperparameters này
                model, scaler, _ = ml_trainer.train(
                    train_metrics,
                    n_estimators=n_estimators,
                    contamination=contamination
                )
                
                # Evaluate trên validation set
                # Predict
                predictions = model.predict(X_val)
                scores = model.score_samples(X_val)
                
                # Tính metric: separation score (khoảng cách giữa normal và anomaly scores)
                # Càng lớn càng tốt (anomalies và normal tách biệt rõ ràng)
                anomaly_mask = (predictions == -1)
                if np.sum(anomaly_mask) == 0 or np.sum(~anomaly_mask) == 0:
                    # Nếu không có anomaly hoặc không có normal, return score thấp
                    return 0.0
                
                anomaly_scores = scores[anomaly_mask]
                normal_scores = scores[~anomaly_mask]
                
                # Separation = difference between mean normal score and mean anomaly score
                # Càng lớn càng tốt (normal có score cao hơn anomaly)
                separation = float(np.mean(normal_scores) - np.mean(anomaly_scores))
                
                # Optuna maximize separation, nhưng ta dùng minimize nên return negative
                return -separation
                
            except Exception as e:
                logger.warning(f"Trial failed: {e}")
                return float('inf')
        
        # Tạo study và optimize
        study = optuna.create_study(
            direction='minimize',  # Minimize negative separation = maximize separation
            sampler=TPESampler(seed=42),
            pruner=MedianPruner(n_startup_trials=5, n_warmup_steps=10)
        )
        
        logger.info(
            f"Bắt đầu tuning Isolation Forest với {self.n_trials} trials "
            f"(train={len(train_metrics)}, val={len(val_metrics)})"
        )
        
        study.optimize(
            objective,
            n_trials=self.n_trials,
            timeout=self.timeout,
            show_progress_bar=False
        )
        
        if study.best_trial.value == float('inf'):
            raise RuntimeError("Tất cả trials đều failed. Không tìm được hyperparameter tốt.")
        
        best_params = study.best_params
        best_score = -study.best_value  # Convert back to positive separation
        
        logger.info(
            f"Tuning Isolation Forest hoàn thành: best_separation={best_score:.4f}, "
            f"params={best_params}"
        )
        
        return {
            'best_params': best_params,
            'best_score': best_score,
            'n_trials': len(study.trials),
            'best_trial_number': study.best_trial.number
        }

