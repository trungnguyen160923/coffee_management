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

    def retrain_branch(
        self,
        branch_id: int,
        train_iforest: bool = True,
        train_forecast: bool = True,
        target_metric: Optional[str] = None,
        algorithm: Optional[str] = None,
        iforest_params: Optional[Dict[str, object]] = None,
        forecast_params: Optional[Dict[str, object]] = None,
    ) -> Dict[str, object]:
        """
        Retrain models for a single branch (selectively).
        This is used by the admin UI to retrain only Isolation Forest or only Forecast.
        """
        if not train_iforest and not train_forecast:
            raise ValueError("At least one of train_iforest/train_forecast must be True")

        database_name = settings.DB_NAME or "analytics_db"
        db = DatabaseConnection(database_name=database_name)
        db.connect()
        try:
            metrics_repo = MetricsRepositoryImpl(db)
            model_repo = ModelRepositoryImpl(db)

            branch_result: Dict[str, object] = {"branch_id": branch_id}

            if train_iforest:
                try:
                    branch_result["iforest"] = self._train_isolation_forest(
                        metrics_repo, model_repo, branch_id, params=iforest_params
                    )
                except Exception as exc:  # pragma: no cover - defensive
                    logger.error(
                        "Isolation Forest training failed for branch %s: %s",
                        branch_id,
                        exc,
                        exc_info=True,
                    )
                    branch_result["iforest_error"] = str(exc)

            if train_forecast:
                try:
                    branch_result["forecast"] = self._train_prophet_forecast(
                        metrics_repo,
                        model_repo,
                        branch_id,
                        target_metric=target_metric or settings.FORECAST_TARGET_METRIC,
                        algorithm=algorithm or settings.FORECAST_ALGORITHM,
                        params=forecast_params,
                    )
                except Exception as exc:  # pragma: no cover - defensive
                    logger.error(
                        "Forecast training failed for branch %s: %s",
                        branch_id,
                        exc,
                        exc_info=True,
                    )
                    branch_result["forecast_error"] = str(exc)

            branch_result["success"] = any(
                k in branch_result for k in ("iforest", "forecast")
            )
            return branch_result
        finally:
            db.disconnect()

    def _train_isolation_forest(
        self,
        metrics_repo: MetricsRepositoryImpl,
        model_repo: ModelRepositoryImpl,
        branch_id: int,
        params: Optional[Dict[str, object]] = None,
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

        params = params or {}
        enable_tuning = params.get("enable_tuning")
        if enable_tuning is None:
            enable_tuning = self.tuner is not None

        manual_n_estimators = params.get("n_estimators")
        manual_contamination = params.get("contamination")

        # Tune hyperparameters nếu enabled
        if enable_tuning and self.tuner and len(metrics_list) >= 60:  # Cần đủ data để split train/val
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
                best_params = {}
        else:
            best_params = {}
            if enable_tuning and self.tuner:
                logger.info(
                    "Skipping tuning for branch %s (insufficient data: %d samples)",
                    branch_id, len(metrics_list)
                )

        # Resolve final hyperparameters (manual overrides > tuned > defaults)
        best_params["n_estimators"] = (
            int(manual_n_estimators)
            if manual_n_estimators is not None
            else int(best_params.get("n_estimators") or settings.IFOREST_N_ESTIMATORS)
        )
        best_params["contamination"] = (
            float(manual_contamination)
            if manual_contamination is not None
            else float(best_params.get("contamination") or settings.IFOREST_CONTAMINATION)
        )

        # Train model mới với best hyperparameters
        model, scaler, metadata = self.iforest_trainer.train(
            metrics_list,
            n_estimators=best_params['n_estimators'],
            contamination=best_params['contamination'],
        )

        # Evaluate model mới
        # - separation_on_all: computed on full training data (can be optimistic)
        # - separation_on_val: computed on validation slice (20% tail) to reflect real-world generalization
        new_separation_on_all = self._calculate_iforest_separation_score(model, metrics_list)
        try:
            new_separation_on_val = self._evaluate_new_iforest_model(model, metrics_list)
        except Exception as e:
            logger.warning("Failed to compute validation separation for new model (branch %s): %s", branch_id, e)
            new_separation_on_val = None

        # So sánh với model cũ
        should_save = True
        comparison_info = {
            "has_old_model": old_separation_score is not None,
            "old_separation_score": old_separation_score,
            "new_separation_score": new_separation_on_val if new_separation_on_val is not None else new_separation_on_all,
            "new_separation_score_train": new_separation_on_all,
            "new_separation_score_val": new_separation_on_val,
            "improvement_percent": None,
            "decision_reason": None
        }

        # Quality gate: require minimum validation separation to consider model "production-ready"
        if new_separation_on_val is not None and new_separation_on_val < settings.IFOREST_MIN_VALIDATION_SEPARATION:
            should_save = False
            comparison_info["decision_reason"] = (
                f"Fails quality gate: validation_separation={new_separation_on_val:.4f} "
                f"< min_required={settings.IFOREST_MIN_VALIDATION_SEPARATION:.4f}. Keeping old model."
            )

        # Persist "quality log" into metadata so it is stored in DB (ml_models.training_data_stats)
        try:
            metadata["quality_log"] = {
                "model_type": "ISOLATION_FOREST",
                "quality_metric": "validation_separation",
                "quality_value": float(new_separation_on_val) if new_separation_on_val is not None else None,
                "train_separation": float(new_separation_on_all),
                "thresholds": {
                    "min_validation_separation": float(settings.IFOREST_MIN_VALIDATION_SEPARATION),
                },
                "gate_pass": bool(
                    (new_separation_on_val is None) or (float(new_separation_on_val) >= float(settings.IFOREST_MIN_VALIDATION_SEPARATION))
                ),
                "anomaly_rate_train": float(metadata.get("anomaly_rate")) if metadata.get("anomaly_rate") is not None else None,
                "threshold_score": float(metadata.get("threshold_score")) if metadata.get("threshold_score") is not None else None,
                "notes": "validation_separation uses last 20% slice to reduce leakage",
            }
        except Exception:
            # Do not block training on logging issues
            pass

        # Always print an explicit quality summary for auditability (server logs / terminal)
        try:
            q = metadata.get("quality_log") or {}
            logger.info(
                "\n=== IFOREST QUALITY SUMMARY ===\n"
                "branch_id=%s\n"
                "samples=%s\n"
                "date_range=%s→%s\n"
                "old_separation=%s\n"
                "new_separation_train=%s\n"
                "new_separation_val=%s\n"
                "quality_metric=%s quality_value=%s\n"
                "thresholds=%s\n"
                "gate_pass=%s\n"
                "anomaly_rate_train=%s threshold_score=%s\n"
                "decision=%s\n"
                "reason=%s\n"
                "hyperparameters=%s\n"
                "==============================",
                branch_id,
                metadata.get("training_samples"),
                metadata.get("training_date_start"),
                metadata.get("training_date_end"),
                old_separation_score,
                comparison_info.get("new_separation_score_train"),
                comparison_info.get("new_separation_score_val"),
                q.get("quality_metric"),
                q.get("quality_value"),
                q.get("thresholds"),
                q.get("gate_pass"),
                q.get("anomaly_rate_train"),
                q.get("threshold_score"),
                "SAVE" if should_save else "SKIP (keep old)",
                comparison_info.get("decision_reason"),
                best_params,
            )
        except Exception:
            # Do not block training on logging issues
            pass
        
        if old_separation_score is not None:
            improvement_threshold = settings.MODEL_COMPARISON_THRESHOLD
            # Compare using validation separation if we have it; otherwise fall back to train separation
            candidate_sep = comparison_info["new_separation_score"]
            try:
                improvement = (float(candidate_sep) - old_separation_score) / old_separation_score * 100
                comparison_info["improvement_percent"] = improvement
            except Exception:
                improvement = None
            
            if (improvement is not None) and (improvement < improvement_threshold):
                should_save = False
                comparison_info["decision_reason"] = (
                    f"New model worse than old (improvement={improvement:.2f}% < threshold={improvement_threshold}%). "
                    f"Keeping old model (old_score={old_separation_score:.4f} > new_score={float(candidate_sep):.4f})."
                )
                logger.info(
                    "New Isolation Forest model for branch %s is worse (old=%.4f, new=%.4f, improvement=%.2f%%). "
                    "Skipping save, keeping old model.",
                    branch_id, old_separation_score, float(candidate_sep), improvement
                )
            else:
                # Only overwrite decision if we haven't already failed a quality gate
                if should_save and (improvement is not None):
                    comparison_info["decision_reason"] = (
                        f"New model better than old (improvement={improvement:.2f}% >= threshold={improvement_threshold}%). "
                        f"Replacing old model (old_score={old_separation_score:.4f} < new_score={float(candidate_sep):.4f})."
                    )
                    logger.info(
                        "New Isolation Forest model for branch %s is better (old=%.4f, new=%.4f, improvement=%.2f%%). "
                        "Saving new model.",
                        branch_id, old_separation_score, float(candidate_sep), improvement
                    )
        else:
            if should_save:
                comparison_info["decision_reason"] = "No old model found. Saving new model as first model."
                logger.info(
                    "No old Isolation Forest model found for branch %s. Saving new model.",
                    branch_id
                )

        if not should_save:
            return {
                "action": "skipped",
                "reason": "fails_quality_gate_or_worse_than_old",
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
            float(comparison_info["new_separation_score"] or 0.0)
        )
        return {
            "action": "saved",
            "model_id": model_id,
            "samples": metadata.get("training_samples"),
            "date_range": f"{metadata.get('training_date_start')}→{metadata.get('training_date_end')}",
            "separation_score": comparison_info["new_separation_score"],
            "hyperparameters": best_params,
            "comparison": comparison_info,
        }

    def _evaluate_new_iforest_model(self, model, metrics_list) -> float:
        """
        Evaluate a freshly trained Isolation Forest model on a validation slice (20% tail) and return separation score.
        """
        split_idx = int(len(metrics_list) * 0.8)
        val_metrics = metrics_list[split_idx:]
        if len(val_metrics) < 5:
            raise ValueError("Không đủ dữ liệu validation để evaluate")
        X_val, _ = self.iforest_trainer.prepare_training_data(val_metrics)
        predictions = model.predict(X_val)
        scores = model.score_samples(X_val)
        anomaly_mask = (predictions == -1)
        if np.sum(anomaly_mask) == 0 or np.sum(~anomaly_mask) == 0:
            return 0.0
        anomaly_scores = scores[anomaly_mask]
        normal_scores = scores[~anomaly_mask]
        separation = float(np.mean(normal_scores) - np.mean(anomaly_scores))
        return separation

    def _train_prophet_forecast(
        self,
        metrics_repo: MetricsRepositoryImpl,
        model_repo: ModelRepositoryImpl,
        branch_id: int,
        target_metric: str,
        algorithm: str,
        params: Optional[Dict[str, object]] = None,
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

        params = params or {}
        enable_tuning = params.get("enable_tuning")
        if enable_tuning is None:
            enable_tuning = self.tuner is not None

        # Manual overrides (used when tuning is disabled or to override defaults)
        manual_seasonality_mode = params.get("seasonality_mode")
        manual_yearly = params.get("yearly_seasonality")
        manual_weekly = params.get("weekly_seasonality")
        manual_daily = params.get("daily_seasonality")
        manual_use_regs = params.get("use_external_regressors")

        # Tune hyperparameters nếu enabled và là Prophet
        if enable_tuning and self.tuner and algorithm.upper() == 'PROPHET' and len(metrics_list) >= 60:
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
                best_params = {}
        else:
            best_params = {}
            if enable_tuning and self.tuner and algorithm.upper() != 'PROPHET':
                logger.info("Tuning only supported for Prophet, using defaults for %s", algorithm)
            elif enable_tuning and self.tuner:
                logger.info(
                    "Skipping tuning for branch %s (insufficient data: %d samples)",
                    branch_id, len(metrics_list)
                )

        # Resolve final hyperparameters (manual overrides > tuned > defaults)
        best_params['seasonality_mode'] = (
            str(manual_seasonality_mode)
            if manual_seasonality_mode is not None
            else str(best_params.get('seasonality_mode') or settings.FORECAST_SEASONALITY_MODE)
        )
        best_params['yearly_seasonality'] = (
            bool(manual_yearly)
            if manual_yearly is not None
            else bool(best_params.get('yearly_seasonality') if best_params.get('yearly_seasonality') is not None else settings.FORECAST_YEARLY_SEASONALITY)
        )
        best_params['weekly_seasonality'] = (
            bool(manual_weekly)
            if manual_weekly is not None
            else bool(best_params.get('weekly_seasonality') if best_params.get('weekly_seasonality') is not None else settings.FORECAST_WEEKLY_SEASONALITY)
        )
        best_params['daily_seasonality'] = (
            bool(manual_daily)
            if manual_daily is not None
            else bool(best_params.get('daily_seasonality') if best_params.get('daily_seasonality') is not None else False)
        )
        best_params['use_external_regressors'] = (
            bool(manual_use_regs)
            if manual_use_regs is not None
            else bool(best_params.get('use_external_regressors') if best_params.get('use_external_regressors') is not None else settings.FORECAST_USE_REGRESSORS)
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
            daily_seasonality=best_params.get('daily_seasonality', False),
            use_external_regressors=best_params.get('use_external_regressors', settings.FORECAST_USE_REGRESSORS),
        )

        # Lấy evaluation metrics từ result (đã được tính trong TrainForecastModelUseCase)
        evaluation_metrics = result.get('evaluation_metrics', {})
        new_mae = evaluation_metrics.get('mae')
        new_mape = evaluation_metrics.get('mape')
        test_samples = evaluation_metrics.get('test_samples')

        # So sánh với model cũ
        should_save = True
        comparison_info = {
            "has_old_model": old_mae is not None,
            "old_mae": old_mae,
            "new_mae": new_mae,
            "old_mape": None,
            "new_mape": new_mape,
            "test_samples": test_samples,
            "improvement_percent": None,
            "decision_reason": None
        }

        # Quality gate for forecast: must have enough test samples and meet MAPE/MAE thresholds.
        gate_fail_reasons = []
        try:
            if test_samples is None or int(test_samples) < settings.FORECAST_MIN_TEST_SAMPLES:
                gate_fail_reasons.append(
                    f"test_samples={test_samples} < min_required={settings.FORECAST_MIN_TEST_SAMPLES}"
                )
        except Exception:
            gate_fail_reasons.append(
                f"invalid test_samples={test_samples} (min_required={settings.FORECAST_MIN_TEST_SAMPLES})"
            )

        try:
            if new_mape is None:
                gate_fail_reasons.append("mape is missing")
            elif float(new_mape) > settings.FORECAST_MAX_MAPE_PERCENT:
                gate_fail_reasons.append(
                    f"mape={float(new_mape):.2f}% > max_allowed={settings.FORECAST_MAX_MAPE_PERCENT:.2f}%"
                )
        except Exception:
            gate_fail_reasons.append("invalid mape value")

        # Optional MAE cap (0 disables)
        try:
            if settings.FORECAST_MAX_MAE and settings.FORECAST_MAX_MAE > 0:
                if new_mae is None:
                    gate_fail_reasons.append("mae is missing")
                elif float(new_mae) > settings.FORECAST_MAX_MAE:
                    gate_fail_reasons.append(
                        f"mae={float(new_mae):.4f} > max_allowed={settings.FORECAST_MAX_MAE:.4f}"
                    )
        except Exception:
            gate_fail_reasons.append("invalid mae value")

        if gate_fail_reasons:
            should_save = False
            comparison_info["decision_reason"] = (
                "Fails quality gate: " + "; ".join(gate_fail_reasons) + ". Keeping old model."
            )

        # Store "quality log" back into the just-saved model row (TrainForecastModelUseCase already saved it).
        # This ensures ml_models.hyperparameters contains PASS/FAIL and metrics for auditability.
        if result.get("model_id"):
            try:
                model_id = int(result["model_id"])
                hp_rows = model_repo.db.execute_query(
                    "SELECT hyperparameters FROM ml_models WHERE id = %s",
                    (model_id,),
                )
                hp = {}
                if hp_rows and hp_rows[0].get("hyperparameters"):
                    try:
                        hp = json.loads(hp_rows[0]["hyperparameters"])
                    except Exception:
                        hp = {}
                hp["quality_log"] = {
                    "model_type": "PROPHET",
                    "quality_metric": "mape",
                    "quality_value": float(new_mape) if new_mape is not None else None,
                    "secondary_metric": "mae",
                    "secondary_value": float(new_mae) if new_mae is not None else None,
                    "test_samples": int(test_samples) if test_samples is not None else None,
                    "thresholds": {
                        "min_test_samples": int(settings.FORECAST_MIN_TEST_SAMPLES),
                        "max_mape_percent": float(settings.FORECAST_MAX_MAPE_PERCENT),
                        "max_mae": float(settings.FORECAST_MAX_MAE),
                    },
                    "gate_pass": bool(len(gate_fail_reasons) == 0),
                    "gate_fail_reasons": gate_fail_reasons,
                }
                # For consistency with predictor: day_of_week is 1-7 in ForecastTrainer.prepare_time_series_data
                hp.setdefault("day_of_week_format", "1-7")
                model_repo.db.execute_query(
                    "UPDATE ml_models SET hyperparameters = %s, training_data_stats = %s WHERE id = %s",
                    (json.dumps(hp, ensure_ascii=False), json.dumps(hp, ensure_ascii=False), model_id),
                    fetch=False,
                )
            except Exception as e:
                logger.warning("Failed to persist forecast quality_log for model_id=%s: %s", result.get("model_id"), e)

        # Always print an explicit quality summary for auditability (server logs / terminal)
        try:
            logger.info(
                "\n=== FORECAST QUALITY SUMMARY ===\n"
                "branch_id=%s\n"
                "model_name=%s\n"
                "target_metric=%s algorithm=%s\n"
                "samples=%s\n"
                "date_range=%s→%s\n"
                "old_mae=%s old_mape=%s\n"
                "new_mae=%s new_mape=%s test_samples=%s\n"
                "thresholds={min_test_samples:%s, max_mape_percent:%s, max_mae:%s}\n"
                "gate_pass=%s\n"
                "decision=%s\n"
                "reason=%s\n"
                "hyperparameters=%s\n"
                "===============================",
                branch_id,
                model_name,
                target_metric,
                algorithm,
                result.get("training_samples") if isinstance(result, dict) else None,
                result.get("training_date_start") if isinstance(result, dict) else None,
                result.get("training_date_end") if isinstance(result, dict) else None,
                old_mae,
                None,
                new_mae,
                new_mape,
                test_samples,
                int(settings.FORECAST_MIN_TEST_SAMPLES),
                float(settings.FORECAST_MAX_MAPE_PERCENT),
                float(settings.FORECAST_MAX_MAE),
                bool(len(gate_fail_reasons) == 0),
                "SAVE" if should_save else "SKIP (keep old)",
                comparison_info.get("decision_reason"),
                best_params,
            )
        except Exception:
            pass
        
        if old_mae is not None and new_mae is not None:
            improvement_threshold = settings.MODEL_COMPARISON_THRESHOLD
            # MAE càng thấp càng tốt, nên improvement = (old - new) / old * 100
            improvement = (old_mae - new_mae) / old_mae * 100
            comparison_info["improvement_percent"] = improvement
            
            if improvement < improvement_threshold:
                should_save = False
                # Keep existing gate decision if already set
                if not comparison_info.get("decision_reason"):
                    comparison_info["decision_reason"] = (
                        f"New model worse than old (improvement={improvement:.2f}% < threshold={improvement_threshold}%). "
                        f"Keeping old model (old_mae={old_mae:.4f} < new_mae={new_mae:.4f})."
                    )
                logger.info(
                    "New forecast model for branch %s (%s) is worse (old_mae=%.4f, new_mae=%.4f, improvement=%.2f%%). "
                    "Skipping save, keeping old model.",
                    branch_id, algorithm, old_mae, new_mae, improvement
                )
                # IMPORTANT:
                # ForecastTrainer.save_model_to_repository() deactivates old model *before* saving the new model.
                # If we decide to skip (new worse), we must reactivate the old model, otherwise there will be no active model.
                if result.get('model_id'):
                    try:
                        delete_query = "DELETE FROM ml_models WHERE id = %s"
                        model_repo.db.execute_query(delete_query, (result['model_id'],), fetch=False)
                    except Exception as e:
                        logger.warning("Failed to delete new model: %s", e)
                # Reactivate old model (if existed)
                if old_model_entity and getattr(old_model_entity, "id", None):
                    try:
                        # Ensure old model is active again
                        reactivate_query = "UPDATE ml_models SET is_active = TRUE WHERE id = %s"
                        model_repo.db.execute_query(reactivate_query, (old_model_entity.id,), fetch=False)
                        # Keep single active per model_name (defensive)
                        deactivate_others_query = """
                            UPDATE ml_models
                            SET is_active = FALSE
                            WHERE model_name = %s AND id <> %s
                        """
                        model_repo.db.execute_query(
                            deactivate_others_query, (model_name, old_model_entity.id), fetch=False
                        )
                    except Exception as e:
                        logger.warning("Failed to reactivate old forecast model: %s", e)
            else:
                # Only accept replacement if we didn't fail quality gate
                if should_save:
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
                    # Failed quality gate; delete new model + reactivate old one
                    if result.get('model_id'):
                        try:
                            delete_query = "DELETE FROM ml_models WHERE id = %s"
                            model_repo.db.execute_query(delete_query, (result['model_id'],), fetch=False)
                        except Exception as e:
                            logger.warning("Failed to delete new model after gate fail: %s", e)
                    if old_model_entity and getattr(old_model_entity, "id", None):
                        try:
                            reactivate_query = "UPDATE ml_models SET is_active = TRUE WHERE id = %s"
                            model_repo.db.execute_query(reactivate_query, (old_model_entity.id,), fetch=False)
                            deactivate_others_query = """
                                UPDATE ml_models
                                SET is_active = FALSE
                                WHERE model_name = %s AND id <> %s
                            """
                            model_repo.db.execute_query(
                                deactivate_others_query, (model_name, old_model_entity.id), fetch=False
                            )
                        except Exception as e:
                            logger.warning("Failed to reactivate old forecast model after gate fail: %s", e)
        else:
            if old_mae is None:
                if should_save:
                    comparison_info["decision_reason"] = "No old model found. Saving new model as first model."
                    logger.info(
                        "No old forecast model found for branch %s (%s). Saving new model.",
                        branch_id, algorithm
                    )
            elif new_mae is None:
                if should_save and not comparison_info.get("decision_reason"):
                    comparison_info["decision_reason"] = "New model evaluation failed. Saving anyway (no comparison possible)."
                    logger.warning(
                        "New forecast model evaluation failed for branch %s (%s). Saving anyway.",
                        branch_id, algorithm
                    )

        if not should_save:
            return {
                "action": "skipped",
                "reason": "fails_quality_gate_or_worse_than_old",
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


