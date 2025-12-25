"""
Export predictions to a JSON file for BOTH algorithms:
- Isolation Forest (anomaly detection) on recent historical days
- Prophet (forecast) for future horizon days

Data source: analytics_db tables:
- daily_branch_metrics
- ml_models

This script is "headless": it does not draw plots; it writes one JSON file.

Usage (PowerShell):
  python -m app.TOOL2.src.presentation.export_predictions_json ^
    --branch-id 1 ^
    --iforest-days 30 ^
    --forecast-days 14 ^
    --target-metric order_count ^
    --out ./output/predictions_branch_1.json

Notes:
- Uses ACTIVE models by default.
- You can override model IDs.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, Optional

from ..infrastructure.database.connection import DatabaseConnection
from ..infrastructure.repositories.metrics_repository_impl import MetricsRepositoryImpl
from ..infrastructure.repositories.model_repository_impl import ModelRepositoryImpl
from ..infrastructure.repositories.forecast_repository_impl import ForecastRepositoryImpl
from ..infrastructure.ml.ml_predictor import MLPredictor
from ..infrastructure.ml.forecast_trainer import ForecastTrainer
from ..application.use_cases.predict_forecast_use_case import PredictForecastUseCase


def _make_json_safe(x: Any):
    try:
        import numpy as np

        if isinstance(x, (np.integer,)):
            return int(x)
        if isinstance(x, (np.floating,)):
            return float(x)
        if isinstance(x, (np.bool_,)):
            return bool(x)
        if isinstance(x, (np.ndarray,)):
            return x.tolist()
    except Exception:
        pass

    if isinstance(x, (datetime, date)):
        return x.isoformat()
    if isinstance(x, dict):
        return {k: _make_json_safe(v) for k, v in x.items()}
    if isinstance(x, (list, tuple)):
        return [_make_json_safe(v) for v in x]
    return x


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Export IForest + Prophet predictions to JSON file")
    p.add_argument("--branch-id", dest="branch_id", type=int, required=True)
    p.add_argument("--iforest-days", dest="iforest_days", type=int, default=30, help="How many recent days to score")
    p.add_argument("--forecast-days", dest="forecast_days", type=int, default=14, help="Forecast horizon days")
    p.add_argument(
        "--target-metric",
        dest="target_metric",
        default="order_count",
        choices=["order_count", "total_revenue", "customer_count", "avg_order_value"],
    )
    p.add_argument("--iforest-model-id", dest="iforest_model_id", type=int, default=None)
    p.add_argument("--forecast-model-id", dest="forecast_model_id", type=int, default=None)
    p.add_argument("--algorithm", dest="algorithm", default="PROPHET", choices=["PROPHET"])
    p.add_argument("--out", dest="out", required=True, help="Output JSON path")
    p.add_argument("--no-save-forecast", dest="no_save_forecast", action="store_true", help="Do not save forecast_results")
    return p.parse_args()


def export_predictions_json(
    *,
    branch_id: int,
    iforest_days: int,
    forecast_days: int,
    target_metric: str,
    algorithm: str = "PROPHET",
    out_path: str,
    iforest_model_id: Optional[int] = None,
    forecast_model_id: Optional[int] = None,
    save_forecast_result: bool = True,
) -> Dict[str, Any]:
    db = DatabaseConnection()
    db.connect()
    try:
        metrics_repo = MetricsRepositoryImpl(db)
        model_repo = ModelRepositoryImpl(db)
        forecast_repo = ForecastRepositoryImpl(db)

        # -----------------------
        # 1) Isolation Forest
        # -----------------------
        if iforest_model_id:
            iforest_model_entity = model_repo.find_by_id(iforest_model_id)
        else:
            iforest_model_entity = model_repo.find_active_by_branch(branch_id)
        if not iforest_model_entity:
            iforest_block = {"success": False, "error": "No active iforest model found"}
        else:
            predictor = MLPredictor()
            model, scaler, score_stats = predictor.load_model(iforest_model_entity)

            metrics_list = metrics_repo.find_for_training(branch_id, days=iforest_days)
            scored = []
            for m in metrics_list:
                is_anom, anom_score, conf = predictor.predict(model, scaler, m, score_stats)
                scored.append(
                    {
                        "date": m.report_date.isoformat(),
                        "is_anomaly": bool(is_anom),
                        "anomaly_score": float(anom_score),
                        "confidence": float(conf),
                    }
                )
            iforest_block = {
                "success": True,
                "model": {
                    "id": iforest_model_entity.id,
                    "name": iforest_model_entity.model_name,
                    "version": iforest_model_entity.model_version,
                },
                "days": int(iforest_days),
                "items": scored,
            }

        # -----------------------
        # 2) Prophet Forecast
        # -----------------------
        use_case = PredictForecastUseCase(metrics_repo, model_repo, forecast_repo)
        try:
            forecast_block = use_case.execute(
                branch_id=branch_id,
                algorithm=str(algorithm).upper(),
                target_metric=str(target_metric),
                forecast_horizon_days=int(forecast_days),
                model_id=forecast_model_id,
                save_result=bool(save_forecast_result),
            )
            forecast_block = {"success": True, **forecast_block}
        except Exception as e:
            forecast_block = {"success": False, "error": str(e)}

        payload = {
            "success": True,
            "branch_id": int(branch_id),
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "iforest": iforest_block,
            "forecast": forecast_block,
        }

        outp = Path(out_path).resolve()
        outp.parent.mkdir(parents=True, exist_ok=True)
        with open(outp, "w", encoding="utf-8") as f:
            json.dump(_make_json_safe(payload), f, ensure_ascii=False, indent=2)
        return payload
    finally:
        db.disconnect()


def main() -> None:
    args = _parse_args()
    export_predictions_json(
        branch_id=args.branch_id,
        iforest_days=args.iforest_days,
        forecast_days=args.forecast_days,
        target_metric=args.target_metric,
        algorithm=args.algorithm,
        out_path=args.out,
        iforest_model_id=args.iforest_model_id,
        forecast_model_id=args.forecast_model_id,
        save_forecast_result=not bool(args.no_save_forecast),
    )
    print(json.dumps({"success": True, "out": str(Path(args.out).resolve())}, ensure_ascii=False))


if __name__ == "__main__":
    main()


