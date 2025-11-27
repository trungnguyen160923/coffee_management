"""
Service responsible for retraining ML models (Isolation Forest & Prophet)
using TOOL2 infrastructure modules.
"""
import logging
import sys
from pathlib import Path
from typing import Dict, List, Optional

from app.config import settings

# Ensure TOOL2 modules are importable
TOOL2_PATH = Path(__file__).parent.parent / "TOOL2"
if str(TOOL2_PATH) not in sys.path:
    sys.path.insert(0, str(TOOL2_PATH))

from src.infrastructure.database.connection import DatabaseConnection  # type: ignore
from src.infrastructure.repositories.metrics_repository_impl import MetricsRepositoryImpl  # type: ignore
from src.infrastructure.repositories.model_repository_impl import ModelRepositoryImpl  # type: ignore
from src.infrastructure.ml.ml_trainer import MLTrainer  # type: ignore
from src.application.use_cases.train_forecast_model_use_case import TrainForecastModelUseCase  # type: ignore

logger = logging.getLogger(__name__)


class ModelTrainingService:
    """Coordinate model retraining for all branches."""

    def __init__(self):
        self.iforest_trainer = MLTrainer()

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
        """Train and persist Isolation Forest model for a branch."""
        metrics_list = metrics_repo.find_for_training(
            branch_id, days=settings.IFOREST_TRAINING_DAYS
        )
        if len(metrics_list) < settings.MIN_TRAINING_SAMPLES:
            raise ValueError(
                f"branch_id={branch_id} only has {len(metrics_list)} samples "
                f"(requires >= {settings.MIN_TRAINING_SAMPLES})"
            )

        model, scaler, metadata = self.iforest_trainer.train(
            metrics_list,
            n_estimators=settings.IFOREST_N_ESTIMATORS,
            contamination=settings.IFOREST_CONTAMINATION,
        )
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
            "Isolation Forest retrained for branch %s (model_id=%s, samples=%s)",
            branch_id,
            model_id,
            metadata.get("training_samples"),
        )
        return {
            "model_id": model_id,
            "samples": metadata.get("training_samples"),
            "date_range": f"{metadata.get('training_date_start')}→{metadata.get('training_date_end')}",
        }

    def _train_prophet_forecast(
        self,
        metrics_repo: MetricsRepositoryImpl,
        model_repo: ModelRepositoryImpl,
        branch_id: int,
        target_metric: str,
        algorithm: str,
    ) -> Dict[str, object]:
        """Train and persist Prophet (or configured) forecast model."""
        train_use_case = TrainForecastModelUseCase(metrics_repo, model_repo)
        result = train_use_case.execute(
            branch_id=branch_id,
            algorithm=algorithm.upper(),
            target_metric=target_metric,
            training_days=settings.FORECAST_TRAINING_DAYS,
            rolling_window=None,
            model_version=settings.FORECAST_MODEL_VERSION,
            created_by=settings.FORECAST_CREATED_BY,
            prophet_seasonality_mode=settings.FORECAST_SEASONALITY_MODE,
            prophet_yearly_seasonality=settings.FORECAST_YEARLY_SEASONALITY,
            prophet_weekly_seasonality=settings.FORECAST_WEEKLY_SEASONALITY,
            prophet_use_regressors=settings.FORECAST_USE_REGRESSORS,
        )

        logger.info(
            "Forecast retrained for branch %s (model_id=%s, algorithm=%s, samples=%s)",
            branch_id,
            result.get("model_id"),
            algorithm,
            result.get("training_samples"),
        )
        return {
            "model_id": result.get("model_id"),
            "algorithm": result.get("algorithm"),
            "target_metric": result.get("target_metric"),
            "samples": result.get("training_samples"),
        }


