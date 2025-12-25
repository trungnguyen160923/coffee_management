"""
Admin API for training/retraining and testing ML models per branch.

This router is intentionally "not linked" from any UI menu; it is meant for admin-only operations.
"""

from __future__ import annotations

import json
import logging
import pickle
import subprocess
import sys
import tempfile
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, Optional, List, Tuple

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.schemas.admin_models import (
    ModelInfo,
    ModelByIdResponse,
    ModelHistoryResponse,
    ModelStatusResponse,
    RetrainModelsRequest,
    TestForecastRequest,
    TestIForestRequest,
)
from app.services.model_training_service import ModelTrainingService

from app.TOOL2.src.infrastructure.database.connection import DatabaseConnection  # type: ignore
from app.TOOL2.src.infrastructure.repositories.metrics_repository_impl import MetricsRepositoryImpl  # type: ignore
from app.TOOL2.src.infrastructure.repositories.model_repository_impl import ModelRepositoryImpl  # type: ignore
from app.TOOL2.src.infrastructure.ml.ml_predictor import MLPredictor  # type: ignore
from app.TOOL2.src.infrastructure.ml.ml_trainer import MLTrainer  # type: ignore
from app.TOOL2.src.infrastructure.ml.forecast_trainer import ForecastTrainer  # type: ignore
from app.TOOL2.src.infrastructure.ml.forecast_predictor import ForecastPredictor  # type: ignore
from app.TOOL2.src.domain.entities.metrics import DailyBranchMetrics  # type: ignore

from app.TOOL2.src.presentation.evaluate_forecast_confidence import (  # type: ignore
    calculate_confidence_score,
)
from app.TOOL2.src.presentation.predict_forecast_db import (  # type: ignore
    calculate_confidence_percentage,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai/admin/models", tags=["Admin Models"])

training_service = ModelTrainingService()


def _new_method_data_dir() -> Path:
    # app/TOOL2/src/new_method/data
    return (Path(__file__).resolve().parent.parent / "TOOL2" / "src" / "new_method" / "data").resolve()


def _new_method_logs_dir() -> Path:
    # app/TOOL2/src/new_method/train/logs
    logs_dir = (Path(__file__).resolve().parent.parent / "TOOL2" / "src" / "new_method" / "train" / "logs").resolve()
    logs_dir.mkdir(parents=True, exist_ok=True)
    return logs_dir


def _run_new_method_script(script_path: Path, args: List[str], log_prefix: Optional[str] = None) -> Dict[str, Any]:
    """
    Run a new_method script as a subprocess and try to parse JSON from stdout.
    We use subprocess to keep behavior identical to the CLI scripts.
    Saves stdout/stderr to a log file.
    """
    cmd = [sys.executable, str(script_path)] + list(args)
    proc = subprocess.run(cmd, capture_output=True, text=True)
    
    # Save log file (always create if log_prefix is provided)
    log_file_path = None
    if log_prefix:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file_path = _new_method_logs_dir() / f"{log_prefix}_{timestamp}.log"
        try:
            with open(log_file_path, "w", encoding="utf-8") as f:
                f.write("=" * 80 + "\n")
                f.write(f"Training Log: {script_path.name}\n")
                f.write(f"Timestamp: {datetime.now().isoformat()}\n")
                f.write(f"Command: {' '.join(cmd)}\n")
                f.write("=" * 80 + "\n\n")
                f.write("STDOUT:\n")
                f.write("-" * 80 + "\n")
                f.write(proc.stdout or "(empty)\n")
                f.write("\n" + "=" * 80 + "\n\n")
                f.write("STDERR:\n")
                f.write("-" * 80 + "\n")
                f.write(proc.stderr or "(empty)\n")
                f.write("\n" + "=" * 80 + "\n")
                f.write(f"Return code: {proc.returncode}\n")
            # Always log the file path to console for visibility
            logger.info(f"Training log saved to: {log_file_path}")
        except Exception as e:
            logger.warning(f"Failed to write log file: {e}")
    
    if proc.returncode != 0:
        error_msg = f"Script failed: {script_path.name}\nSTDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}"
        if log_file_path:
            error_msg += f"\n\nLog file saved to: {log_file_path}"
        raise RuntimeError(error_msg)

    # Try parse last JSON line
    lines = [ln.strip() for ln in (proc.stdout or "").splitlines() if ln.strip()]
    result = None
    for ln in reversed(lines):
        if ln.startswith("{") and ln.endswith("}"):
            try:
                result = json.loads(ln)
                break
            except Exception:
                continue
    
    # If no JSON, return raw output
    if result is None:
        result = {"stdout": proc.stdout, "stderr": proc.stderr}
    
    # Always add log file path to result (even if script succeeded)
    if log_file_path:
        result["log_file"] = str(log_file_path)
        # Ensure log_file is always visible in response
        if isinstance(result, dict):
            result["log_file_path"] = str(log_file_path)
    
    return result


def _parse_date_any(date_str: str) -> date:
    """
    Accepts YYYY-MM-DD or DD/MM/YYYY.
    """
    s = (date_str or "").strip()
    if not s:
        raise ValueError("date is required")
    try:
        # YYYY-MM-DD
        return datetime.strptime(s[:10], "%Y-%m-%d").date()
    except Exception:
        pass
    try:
        # DD/MM/YYYY
        return datetime.strptime(s, "%d/%m/%Y").date()
    except Exception:
        raise ValueError("Invalid date format. Use YYYY-MM-DD or DD/MM/YYYY")


def _find_active_iforest_model_flexible(model_repo: ModelRepositoryImpl, branch_id: int):
    """
    Try to find an active IForest model using:
    1) production naming: iforest_anomaly_branch_{id}
    2) new_method naming: iforest_nm_branch_{id}
    """
    # 1) production
    m = model_repo.find_active_by_branch(branch_id)
    if m:
        return m, ["iforest_anomaly_branch_%s" % branch_id]

    # 2) new_method (legacy single-name)
    legacy_name = f"iforest_nm_branch_{branch_id}"
    rows = model_repo.db.execute_query(
        """
        SELECT id FROM ml_models
        WHERE model_name = %s AND is_active = TRUE
        ORDER BY trained_at DESC LIMIT 1
        """,
        (legacy_name,),
    )
    if rows:
        mid = int(rows[0]["id"])
        return model_repo.find_by_id(mid), ["iforest_anomaly_branch_%s" % branch_id, legacy_name]
    return None, ["iforest_anomaly_branch_%s" % branch_id, legacy_name]


def _find_active_iforest_group_models(model_repo: ModelRepositoryImpl, branch_id: int) -> Dict[str, object]:
    """
    Find active new_method IForest models saved per group:
      iforest_nm_<group>_branch_<id>, for group in a,b,c,d
    """
    rows = model_repo.db.execute_query(
        """
        SELECT id, model_name
        FROM ml_models
        WHERE is_active = TRUE
          AND model_name LIKE %s
          AND UPPER(model_type) = 'ISOLATION_FOREST'
        """,
        (f"iforest_nm_%_branch_{int(branch_id)}",),
    )
    out: Dict[str, object] = {}
    for r in rows or []:
        name = str(r.get("model_name") or "")
        parts = name.split("_")
        # iforest_nm_<group>_branch_<id>
        if len(parts) >= 5:
            group = parts[2]
            if group in ("a", "b", "c", "d") and group not in out:
                ent = model_repo.find_by_id(int(r["id"]))
                if ent:
                    out[group] = ent
    return out


def _safe_float(x: Any) -> Optional[float]:
    try:
        if x is None:
            return None
        return float(x)
    except Exception:
        return None


def _explain_iforest_anomaly(
    *,
    metrics_repo: "MetricsRepositoryImpl",
    branch_id: int,
    selected_date: date,
    metric_dict: Dict[str, Any],
    used_features: List[str],
    lookback_days: int = 180,
    min_same_weekday: int = 6,
    top_k: int = 5,
) -> Dict[str, Any]:
    """
    Explain anomaly by ranking features that deviate most from a baseline.
    Baseline prefers same weekday (day_of_week) if enough samples exist, otherwise uses all history.
    """
    history = metrics_repo.find_for_training(int(branch_id), days=int(lookback_days))
    rows: List[Dict[str, Any]] = []
    for m in history or []:
        if hasattr(m, "to_dict"):
            rows.append(m.to_dict())
        else:
            # Fallback: best-effort getattr
            d = {}
            for f in used_features:
                d[f] = getattr(m, f, None)
            d["day_of_week"] = getattr(m, "day_of_week", None)
            rows.append(d)

    if not rows:
        return {
            "baseline": {"type": "none", "reason": "no historical rows"},
            "top_features": [],
            "missing_features": used_features,
        }

    hist_df = pd.DataFrame(rows)

    # Decide baseline slice
    baseline_type = "overall"
    baseline_df = hist_df
    try:
        dow = int(metric_dict.get("day_of_week")) if metric_dict.get("day_of_week") is not None else None
    except Exception:
        dow = None

    if dow is not None and "day_of_week" in hist_df.columns:
        same = hist_df[hist_df["day_of_week"] == dow]
        if len(same) >= int(min_same_weekday):
            baseline_type = "same_weekday"
            baseline_df = same

    missing: List[str] = []
    scored: List[Dict[str, Any]] = []
    for f in used_features:
        v = _safe_float(metric_dict.get(f))
        if v is None:
            missing.append(f)
            continue

        if f not in baseline_df.columns:
            missing.append(f)
            continue

        s = pd.to_numeric(baseline_df[f], errors="coerce").dropna()
        if s.empty:
            missing.append(f)
            continue

        mean = float(s.mean())
        std = float(s.std(ddof=0)) if len(s) > 1 else 0.0
        if std < 1e-9:
            # If there's no variance, deviation isn't meaningful.
            z = 0.0
        else:
            z = (v - mean) / std

        scored.append(
            {
                "feature": f,
                "value": v,
                "baseline_mean": mean,
                "baseline_std": std,
                "z_score": float(z),
                "abs_z": float(abs(z)),
                "direction": "high" if z > 0 else ("low" if z < 0 else "flat"),
                "baseline_count": int(len(s)),
            }
        )

    scored.sort(key=lambda x: x["abs_z"], reverse=True)
    top = scored[: int(top_k)]
    for t in top:
        t.pop("abs_z", None)

    return {
        "baseline": {
            "type": baseline_type,
            "lookback_days": int(lookback_days),
            "min_same_weekday": int(min_same_weekday),
            "selected_day_of_week": dow,
            "rows_used": int(len(baseline_df)),
        },
        "top_features": top,
        "missing_features": missing,
    }


def _predict_iforest_safe(
    *,
    predictor: MLPredictor,
    model_entity,
    metric_obj,
) -> Tuple[bool, float, float, List[str]]:
    """
    Predict IForest anomaly in a way that supports both:
    - "old" production models (MLTrainer.FEATURES)
    - "new_method" models (feature list saved per model; scaler may expect different n_features)

    Returns: (is_anomaly, anomaly_score, confidence, used_features)
    """
    model_package = pickle.loads(model_entity.model_data)
    model = model_package["model"]
    scaler = model_package["scaler"]
    score_stats = model_package.get("score_stats", {}) or {}

    # Prefer per-model feature list if available; fallback to predictor's default features
    used_features: List[str] = []
    try:
        if getattr(model_entity, "feature_list", None):
            used_features = json.loads(model_entity.feature_list) or []
    except Exception:
        used_features = []
    if not used_features:
        used_features = list(model_package.get("features") or [])  # may exist in both old & new_method
    if not used_features:
        used_features = list(getattr(predictor.trainer, "FEATURES", []))

    metric_dict = metric_obj.to_dict() if hasattr(metric_obj, "to_dict") else {}
    X_dict = {feat: [metric_dict.get(feat, 0)] for feat in used_features}
    X_df = pd.DataFrame(X_dict).fillna(0)
    if "is_weekend" in X_df.columns:
        X_df["is_weekend"] = X_df["is_weekend"].astype(int)

    # Transform with scaler (may be StandardScaler/RobustScaler)
    X_scaled = scaler.transform(X_df)

    prediction = model.predict(X_scaled)[0]  # -1 anomaly, 1 normal
    score = model.score_samples(X_scaled)[0]

    # Normalize anomaly score (adaptive if stats exist)
    if score_stats:
        anomaly_score = predictor.detector.normalize_anomaly_score_adaptive(score, score_stats)
    else:
        anomaly_score = predictor.detector.normalize_anomaly_score(score)

    is_anomaly = (prediction == -1)

    # Confidence: reuse same logic as MLPredictor.predict (simplified but consistent)
    confidence_level = 0.5
    if score_stats:
        if "threshold_score" in score_stats:
            threshold_estimate = score_stats["threshold_score"]
        elif "contamination" in score_stats:
            contamination = score_stats.get("contamination", 0.1)
            threshold_percentile = 100.0 * (1.0 - contamination)
            # interpolate using percentiles if present
            if threshold_percentile <= 25 and "q25_score" in score_stats:
                ratio = threshold_percentile / 25.0
                threshold_estimate = score_stats.get("min_score", score) + ratio * (
                    score_stats["q25_score"] - score_stats.get("min_score", score)
                )
            elif (
                threshold_percentile <= 75
                and "q25_score" in score_stats
                and "q75_score" in score_stats
            ):
                ratio = (threshold_percentile - 25) / 50.0
                threshold_estimate = score_stats["q25_score"] + ratio * (
                    score_stats["q75_score"] - score_stats["q25_score"]
                )
            elif "q75_score" in score_stats:
                ratio = (threshold_percentile - 75) / 25.0
                threshold_estimate = score_stats["q75_score"] + ratio * (
                    score_stats.get("max_score", score) - score_stats["q75_score"]
                )
            else:
                threshold_estimate = score_stats.get("median_score", score)
        elif "q75_score" in score_stats and "q25_score" in score_stats:
            iqr = score_stats["q75_score"] - score_stats["q25_score"]
            threshold_estimate = score_stats["q25_score"] - 1.5 * iqr
        else:
            threshold_estimate = score_stats.get("min_score", score)

        distance_to_threshold = abs(score - threshold_estimate)
        min_score = score_stats.get("min_score", score)
        max_score = score_stats.get("max_score", score)
        max_distance = max(abs(min_score - threshold_estimate), abs(max_score - threshold_estimate))
        if max_distance > 0:
            base_confidence = min(0.95, distance_to_threshold / max_distance)
            std_score = score_stats.get("std_score", 0.1)
            if std_score and std_score > 0:
                normalized_std = min(1.0, std_score / 0.15)
                base_confidence = base_confidence * (1.0 - normalized_std * 0.2)
            confidence_level = max(0.3, base_confidence)
        else:
            confidence_level = 0.5
    else:
        confidence_level = max(anomaly_score, 1.0 - anomaly_score) * 2.0 - 1.0
        confidence_level = max(0.0, min(1.0, confidence_level))

    return bool(is_anomaly), float(anomaly_score), float(confidence_level), used_features


@router.post("/predict/by-date")
async def predict_bundle_by_date(
    branch_id: int = Query(..., ge=1),
    date_str: str = Query(..., alias="date"),
    forecast_days: int = Query(7, ge=1, le=60),
    target_metric: str = Query("order_count"),
    algorithm: str = Query("PROPHET"),
    iforest_model_id: Optional[int] = Query(None),
    forecast_model_id: Optional[int] = Query(None),
    iforest_mode: str = Query("all", description="all|active (all=run 4 groups if available)"),
):
    """
    Bundle prediction:
    - IForest anomaly check for the selected date (must exist in daily_branch_metrics)
    - Prophet forecast for next N days starting from (date + 1)
    """
    target_metric = (target_metric or "order_count").strip()
    algorithm = (algorithm or "PROPHET").upper()
    if algorithm != "PROPHET":
        raise HTTPException(status_code=501, detail="Only PROPHET is supported for forecast here")

    try:
        selected_date = _parse_date_any(date_str)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    db = DatabaseConnection(database_name=_db_name())
    db.connect()
    try:
        metrics_repo = MetricsRepositoryImpl(db)
        model_repo = ModelRepositoryImpl(db)

        # -------- IForest anomaly on selected date --------
        metric = metrics_repo.find_by_branch_and_date(int(branch_id), selected_date)
        if not metric:
            raise HTTPException(
                status_code=404,
                detail=f"No daily_branch_metrics for branch_id={branch_id} on report_date={selected_date.isoformat()}",
            )

        predictor = MLPredictor()
        mode = (iforest_mode or "all").strip().lower()

        # If user forced a specific model_id, run single-model mode.
        if iforest_model_id:
            ent = model_repo.find_by_id(int(iforest_model_id))
            if not ent:
                iforest_block = {"success": False, "error": f"IForest model_id={iforest_model_id} not found"}
            else:
                is_anom, anom_score, conf, used_feats = _predict_iforest_safe(
                    predictor=predictor,
                    model_entity=ent,
                    metric_obj=metric,
                )
                explanation = _explain_iforest_anomaly(
                    metrics_repo=metrics_repo,
                    branch_id=int(branch_id),
                    selected_date=selected_date,
                    metric_dict=(metric.to_dict() if hasattr(metric, "to_dict") else {}),
                    used_features=list(used_feats or []),
                )
                iforest_block = {
                    "success": True,
                    "mode": "single",
                    "model": {"id": ent.id, "name": ent.model_name, "version": ent.model_version},
                    "input_date": selected_date.isoformat(),
                    "result": {"is_anomaly": bool(is_anom), "anomaly_score": float(anom_score), "confidence": float(conf)},
                    "used_features": used_feats,
                    "explanation": explanation,
                    "metric": metric.to_dict() if hasattr(metric, "to_dict") else None,
                }
        elif mode == "all":
            group_models = _find_active_iforest_group_models(model_repo, int(branch_id))
            if group_models:
                per_group: Dict[str, Any] = {}
                any_anom = False
                max_score = -1.0
                max_group = None
                for g, ent in group_models.items():
                    is_anom, anom_score, conf, used_feats = _predict_iforest_safe(
                        predictor=predictor,
                        model_entity=ent,
                        metric_obj=metric,
                    )
                    explanation = _explain_iforest_anomaly(
                        metrics_repo=metrics_repo,
                        branch_id=int(branch_id),
                        selected_date=selected_date,
                        metric_dict=(metric.to_dict() if hasattr(metric, "to_dict") else {}),
                        used_features=list(used_feats or []),
                    )
                    per_group[g] = {
                        "model": {"id": ent.id, "name": ent.model_name, "version": ent.model_version},
                        "result": {"is_anomaly": bool(is_anom), "anomaly_score": float(anom_score), "confidence": float(conf)},
                        "used_features": used_feats,
                        "explanation": explanation,
                    }
                    if bool(is_anom):
                        any_anom = True
                    if float(anom_score) > max_score:
                        max_score = float(anom_score)
                        max_group = g

                final_explanation = None
                try:
                    if max_group and max_group in per_group:
                        final_explanation = per_group[max_group].get("explanation")
                except Exception:
                    final_explanation = None

                iforest_block = {
                    "success": True,
                    "mode": "all_groups",
                    "input_date": selected_date.isoformat(),
                    "final": {
                        "is_anomaly": bool(any_anom),
                        "max_anomaly_score": float(max_score),
                        "max_group": max_group,
                        "aggregation": "any_group_anomaly",
                    },
                    "final_explanation": final_explanation,
                    "per_group": per_group,
                    "metric": metric.to_dict() if hasattr(metric, "to_dict") else None,
                }
            else:
                # Fallback to active production/legacy
                ent, tried = _find_active_iforest_model_flexible(model_repo, int(branch_id))
                if not ent:
                    iforest_block = {"success": False, "error": "No active IForest model found", "tried_model_names": tried}
                else:
                    is_anom, anom_score, conf, used_feats = _predict_iforest_safe(
                        predictor=predictor,
                        model_entity=ent,
                        metric_obj=metric,
                    )
                    explanation = _explain_iforest_anomaly(
                        metrics_repo=metrics_repo,
                        branch_id=int(branch_id),
                        selected_date=selected_date,
                        metric_dict=(metric.to_dict() if hasattr(metric, "to_dict") else {}),
                        used_features=list(used_feats or []),
                    )
                    iforest_block = {
                        "success": True,
                        "mode": "active_fallback",
                        "model": {"id": ent.id, "name": ent.model_name, "version": ent.model_version},
                        "input_date": selected_date.isoformat(),
                        "result": {"is_anomaly": bool(is_anom), "anomaly_score": float(anom_score), "confidence": float(conf)},
                        "used_features": used_feats,
                        "explanation": explanation,
                        "metric": metric.to_dict() if hasattr(metric, "to_dict") else None,
                    }
        else:
            # active-only mode
            ent, tried = _find_active_iforest_model_flexible(model_repo, int(branch_id))
            if not ent:
                iforest_block = {"success": False, "error": "No active IForest model found", "tried_model_names": tried}
            else:
                is_anom, anom_score, conf, used_feats = _predict_iforest_safe(
                    predictor=predictor,
                    model_entity=ent,
                    metric_obj=metric,
                )
                explanation = _explain_iforest_anomaly(
                    metrics_repo=metrics_repo,
                    branch_id=int(branch_id),
                    selected_date=selected_date,
                    metric_dict=(metric.to_dict() if hasattr(metric, "to_dict") else {}),
                    used_features=list(used_feats or []),
                )
                iforest_block = {
                    "success": True,
                    "mode": "active",
                    "model": {"id": ent.id, "name": ent.model_name, "version": ent.model_version},
                    "input_date": selected_date.isoformat(),
                    "result": {"is_anomaly": bool(is_anom), "anomaly_score": float(anom_score), "confidence": float(conf)},
                    "used_features": used_feats,
                    "explanation": explanation,
                    "metric": metric.to_dict() if hasattr(metric, "to_dict") else None,
                }

        # -------- Forecast next N days starting date+1 --------
        # Find active forecast model (flexible) unless explicit model_id
        if forecast_model_id:
            forecast_model_entity = model_repo.find_by_id(int(forecast_model_id))
            tried_names: List[str] = []
        else:
            forecast_model_entity, tried_names = _find_active_forecast_model_flexible(
                model_repo, int(branch_id), algorithm, target_metric
            )

        start_date = selected_date + timedelta(days=1)
        warning = None
        if not forecast_model_entity:
            warning = f"No active forecast model found. Tried: {tried_names}."
            forecast_block = {"success": False, "error": warning}
        else:
            fp = ForecastPredictor()
            model_obj, meta = fp.load_model(forecast_model_entity)

            # Load training data (for regressors/averages)
            training_metrics = metrics_repo.find_for_training(int(branch_id), days=settings.FORECAST_TRAINING_DAYS)
            trainer = ForecastTrainer()
            training_df = trainer.prepare_time_series_data(training_metrics, target_metric) if training_metrics else None

            # If model was trained by new_method with additional regressors, we must build those regressors from DB,
            # otherwise ForecastPredictor will fill them with 0.0 -> bad predictions (often negative).
            if isinstance(meta, dict) and meta.get("source") == "new_method" and meta.get("external_regressors"):
                regs = list(meta.get("external_regressors") or [])

                # Build a historical frame with columns used by new_method prophet_preprocess
                rows = db.execute_query(
                    """
                    SELECT
                      report_date,
                      branch_id,
                      total_revenue,
                      order_count,
                      customer_count,
                      new_customers,
                      repeat_customers,
                      unique_products_sold,
                      product_diversity_score,
                      peak_hour,
                      day_of_week,
                      is_weekend,
                      avg_preparation_time_seconds,
                      staff_efficiency_score,
                      avg_review_score,
                      material_cost,
                      waste_percentage,
                      avg_order_value
                    FROM daily_branch_metrics
                    WHERE branch_id = %s
                    ORDER BY report_date ASC
                    """,
                    (int(branch_id),),
                )
                h = pd.DataFrame(rows or [])
                if h.empty:
                    raise HTTPException(status_code=404, detail="No historical metrics for forecast regressors.")
                h["ds"] = pd.to_datetime(h["report_date"], errors="coerce")
                h = h.dropna(subset=["ds"]).sort_values("ds").reset_index(drop=True)

                # Calendar regressors
                if "day_of_week" in regs:
                    if str(meta.get("day_of_week_format") or "").strip() == "0-6":
                        h["day_of_week"] = h["ds"].dt.dayofweek.astype(int)
                    else:
                        h["day_of_week"] = (h["ds"].dt.dayofweek + 1).astype(int)
                if "is_weekend" in regs:
                    h["is_weekend"] = (h["ds"].dt.dayofweek >= 5).astype(int)
                if "month" in regs:
                    h["month"] = h["ds"].dt.month.astype(int)

                # Operational regressors
                if "avg_prep_time" in regs:
                    h["avg_prep_time"] = pd.to_numeric(h["avg_preparation_time_seconds"], errors="coerce").fillna(0.0) / 60.0
                if "staff_count" in regs:
                    oc = pd.to_numeric(h["order_count"], errors="coerce").fillna(0.0)
                    eff = pd.to_numeric(h["staff_efficiency_score"], errors="coerce").fillna(0.0)
                    staff_count = np.where(eff > 0, np.round(oc / (eff * 35.0)), 0)
                    staff_count = np.where(staff_count < 1, 1, staff_count)
                    h["staff_count"] = staff_count.astype(int)
                if "new_ratio" in regs:
                    cc = pd.to_numeric(h["customer_count"], errors="coerce").fillna(0.0)
                    nc = pd.to_numeric(h["new_customers"], errors="coerce").fillna(0.0)
                    denom = np.where(cc == 0, 1.0, cc)
                    h["new_ratio"] = (nc / denom).astype(float)
                if "waste_ratio" in regs:
                    h["waste_ratio"] = pd.to_numeric(h["waste_percentage"], errors="coerce").fillna(0.0).clip(0.0, 1.0)

                # Pass-through metrics if used as regressors (peak_hour, avg_review_score, product_diversity_score, ...)
                for c in regs:
                    if c in h.columns:
                        h[c] = pd.to_numeric(h[c], errors="coerce").fillna(0.0)

                # Build future_df with same regressors
                future_dates = pd.date_range(start=start_date, periods=int(forecast_days), freq="D")
                future_df = pd.DataFrame({"ds": future_dates})
                for rname in regs:
                    if rname == "day_of_week":
                        if str(meta.get("day_of_week_format") or "").strip() == "0-6":
                            future_df[rname] = future_df["ds"].dt.dayofweek.astype(int)
                        else:
                            future_df[rname] = (future_df["ds"].dt.dayofweek + 1).astype(int)
                    elif rname == "is_weekend":
                        future_df[rname] = (future_df["ds"].dt.dayofweek >= 5).astype(int)
                    elif rname == "month":
                        future_df[rname] = future_df["ds"].dt.month.astype(int)
                    else:
                        # Use last-30-day mean as a stable proxy
                        tail = h.tail(30)
                        v = float(tail[rname].mean()) if rname in tail.columns else 0.0
                        if np.isnan(v):
                            v = 0.0
                        future_df[rname] = v

                fc = model_obj.predict(future_df[["ds"] + regs])
                forecast_values: Dict[str, float] = {}
                confidence_intervals: Dict[str, Dict[str, float]] = {}
                for _, row in fc.iterrows():
                    ds = row["ds"]
                    date_key = pd.to_datetime(ds).strftime("%Y-%m-%d")
                    yhat = float(row["yhat"])
                    forecast_values[date_key] = yhat
                    confidence_intervals[date_key] = {
                        "lower": float(row.get("yhat_lower", yhat * 0.9)),
                        "upper": float(row.get("yhat_upper", yhat * 1.1)),
                    }
            else:
                # Default predictor path (TOOL2 ForecastTrainer format)
                forecast_values, confidence_intervals = fp.predict(
                    forecast_model_entity,
                    training_metrics,
                    periods=int(forecast_days),
                    start_date=start_date,
                )

            confidence_metrics = calculate_confidence_score(forecast_values, confidence_intervals) or None
            confidence_percent = calculate_confidence_percentage(confidence_metrics) if confidence_metrics else None
            forecast_block = {
                "success": True,
                "model": {
                    "id": getattr(forecast_model_entity, "id", None),
                    "name": getattr(forecast_model_entity, "model_name", None),
                    "version": getattr(forecast_model_entity, "model_version", None),
                },
                "target_metric": target_metric,
                "algorithm": algorithm,
                "start_date": start_date.isoformat(),
                "days": int(forecast_days),
                "forecast_values": forecast_values,
                "confidence_intervals": confidence_intervals,
                "confidence_metrics": confidence_metrics,
                "confidence_percent": confidence_percent,
                "warning": warning,
            }

        return {
            "success": True,
            "branch_id": int(branch_id),
            "input_date": selected_date.isoformat(),
            "iforest": iforest_block,
            "forecast": forecast_block,
        }
    finally:
        db.disconnect()


def _export_new_method_csv_from_db(branch_id: int, *, days: Optional[int] = None) -> Path:
    """
    Export data from daily_branch_metrics into a CSV schema that matches DB column names.
    Returns a temp CSV file path; caller must delete it.

    CSV columns (DB-native):
      report_date,branch_id,total_revenue,order_count,avg_order_value,customer_count,new_customers,repeat_customers,
      unique_products_sold,product_diversity_score,peak_hour,day_of_week,is_weekend,avg_preparation_time_seconds,
      staff_efficiency_score,avg_review_score,material_cost,waste_percentage,low_stock_products,out_of_stock_products
    """
    db = DatabaseConnection(database_name=_db_name())
    db.connect()
    try:
        params: List[Any] = [int(branch_id)]
        where_days = ""
        if days is not None and int(days) > 0:
            where_days = " AND report_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY) "
            params.append(int(days))

        rows = db.execute_query(
            f"""
            SELECT
              report_date,
              branch_id,
              total_revenue,
              order_count,
              customer_count,
              new_customers,
              repeat_customers,
              unique_products_sold,
              product_diversity_score,
              peak_hour,
              day_of_week,
              is_weekend,
              avg_preparation_time_seconds,
              staff_efficiency_score,
              avg_review_score,
              material_cost,
              waste_percentage,
              avg_order_value
            FROM daily_branch_metrics
            WHERE branch_id = %s
            {where_days}
            ORDER BY report_date ASC
            """,
            tuple(params),
        )
        if not rows:
            raise HTTPException(status_code=404, detail=f"No daily_branch_metrics found for branch_id={branch_id}")

        df = pd.DataFrame(rows)
        # Normalize types
        df["report_date"] = pd.to_datetime(df["report_date"], errors="coerce").dt.strftime("%Y-%m-%d")

        # is_weekend: boolean -> 0/1
        df["is_weekend"] = df["is_weekend"].apply(lambda x: 1 if bool(x) else 0)

        # avg_order_value fallback if missing
        if "avg_order_value" in df.columns:
            aov = pd.to_numeric(df["avg_order_value"], errors="coerce")
        else:
            aov = pd.Series([np.nan] * len(df), index=df.index)
        rev = pd.to_numeric(df["total_revenue"], errors="coerce").fillna(0.0)
        oc = pd.to_numeric(df["order_count"], errors="coerce").fillna(0.0)
        fallback_aov = pd.Series(np.where(oc > 0, rev / oc, 0.0), index=df.index)
        df["avg_order_value"] = aov.fillna(fallback_aov)

        # Ensure numeric
        df["avg_preparation_time_seconds"] = pd.to_numeric(df["avg_preparation_time_seconds"], errors="coerce").fillna(0).astype(int)
        df["staff_efficiency_score"] = pd.to_numeric(df["staff_efficiency_score"], errors="coerce").fillna(0.0).astype(float)
        df["material_cost"] = pd.to_numeric(df["material_cost"], errors="coerce").fillna(0.0).astype(float)
        df["waste_percentage"] = pd.to_numeric(df["waste_percentage"], errors="coerce").fillna(0.0).clip(0.0, 1.0).astype(float)
        # Optional stock columns (older data may miss)
        if "low_stock_products" not in df.columns:
            df["low_stock_products"] = 0
        if "out_of_stock_products" not in df.columns:
            df["out_of_stock_products"] = 0

        # Rename & select columns to exact schema
        out = pd.DataFrame(
            {
                "report_date": df["report_date"],
                "branch_id": df["branch_id"].astype(int),
                "total_revenue": pd.to_numeric(df["total_revenue"], errors="coerce").fillna(0.0),
                "order_count": pd.to_numeric(df["order_count"], errors="coerce").fillna(0).astype(int),
                "avg_order_value": pd.to_numeric(df["avg_order_value"], errors="coerce").fillna(0.0),
                "customer_count": pd.to_numeric(df["customer_count"], errors="coerce").fillna(0).astype(int),
                "new_customers": pd.to_numeric(df["new_customers"], errors="coerce").fillna(0).astype(int),
                "repeat_customers": pd.to_numeric(df["repeat_customers"], errors="coerce").fillna(0).astype(int),
                "peak_hour": pd.to_numeric(df["peak_hour"], errors="coerce").fillna(0).astype(int),
                "day_of_week": pd.to_numeric(df["day_of_week"], errors="coerce").fillna(0).astype(int),
                "is_weekend": df["is_weekend"].astype(int),
                "unique_products_sold": pd.to_numeric(df["unique_products_sold"], errors="coerce").fillna(0).astype(int),
                "product_diversity_score": pd.to_numeric(df["product_diversity_score"], errors="coerce").fillna(0.0),
                "avg_preparation_time_seconds": df["avg_preparation_time_seconds"].astype(int),
                "staff_efficiency_score": df["staff_efficiency_score"].astype(float),
                "avg_review_score": pd.to_numeric(df["avg_review_score"], errors="coerce").fillna(0.0),
                "material_cost": df["material_cost"].astype(float),
                "waste_percentage": df["waste_percentage"].astype(float),
                "low_stock_products": pd.to_numeric(df["low_stock_products"], errors="coerce").fillna(0).astype(int),
                "out_of_stock_products": pd.to_numeric(df["out_of_stock_products"], errors="coerce").fillna(0).astype(int),
            }
        )

        tmp = tempfile.NamedTemporaryFile(mode="w", suffix=f"_branch_{branch_id}.csv", delete=False, encoding="utf-8", newline="")
        tmp_path = Path(tmp.name).resolve()
        try:
            out.to_csv(tmp, index=False)
        finally:
            tmp.close()
        return tmp_path
    finally:
        db.disconnect()


@router.get("/new-method/available-branches")
async def new_method_available_branches():
    """
    List branches available in `daily_branch_metrics` for testing new_method pipelines (DB source).
    """
    db = DatabaseConnection(database_name=_db_name())
    db.connect()
    try:
        rows = db.execute_query(
            """
            SELECT branch_id, MIN(report_date) AS start_date, MAX(report_date) AS end_date, COUNT(*) AS rows_count
            FROM daily_branch_metrics
            GROUP BY branch_id
            ORDER BY branch_id ASC
            """
        )
        branches = []
        for r in rows or []:
            branches.append(
                {
                    "branch_id": int(r["branch_id"]),
                    "start_date": str(r.get("start_date")) if r.get("start_date") else None,
                    "end_date": str(r.get("end_date")) if r.get("end_date") else None,
                    "rows_count": int(r.get("rows_count") or 0),
                }
            )
        return {"success": True, "source": "daily_branch_metrics", "branches": branches}
    finally:
        db.disconnect()


@router.post("/new-method/iforest/train-all-groups")
async def new_method_iforest_train_all_groups(
    branch_id: int = Query(..., ge=1),
    groups: str = Query("a,b,c,d"),
    commit: bool = Query(False),
    created_by: str = Query("admin"),
    days: Optional[int] = Query(None, ge=30, le=3650),
):
    """
    Train Isolation Forest new_method for all groups and (optionally) save to DB.
    Source: daily_branch_metrics (DB). A temporary CSV is generated internally for the pipeline.
    Training log is saved to: ai-service/app/TOOL2/src/new_method/train/logs/
    """
    csv_path = _export_new_method_csv_from_db(int(branch_id), days=days)

    script = (Path(__file__).resolve().parent.parent / "TOOL2" / "src" / "new_method" / "train" / "run_isolation_forest_all_groups_save_db.py").resolve()
    if not script.exists():
        raise HTTPException(status_code=500, detail=f"Script missing: {script}")

    args = ["--input", str(csv_path), "--groups", str(groups), "--created-by", str(created_by)]
    if commit:
        args.append("--commit")
    
    log_prefix = f"iforest_branch_{branch_id}_groups_{groups.replace(',', '_')}"
    try:
        payload = _run_new_method_script(script, args, log_prefix=log_prefix)
        return {"success": True, "branch_id": branch_id, "commit": commit, "days": days, "result": payload}
    finally:
        try:
            csv_path.unlink(missing_ok=True)
        except Exception:
            pass


@router.post("/new-method/forecast/train-all-variants")
async def new_method_prophet_train_all_variants(
    branch_id: int = Query(..., ge=1),
    target: str = Query("order_count"),
    commit: bool = Query(False),
    created_by: str = Query("admin"),
    horizon: int = Query(30, ge=5, le=120),
    future_periods: int = Query(30, ge=5, le=365),
    interval_width: float = Query(0.8, gt=0.5, lt=0.99),
    interval_width_grid: str = Query(""),
    min_coverage: float = Query(0.0, ge=0.0, le=0.99),
    coverage_weight: float = Query(2.0, ge=0.1, le=100.0),
    days: Optional[int] = Query(None, ge=30, le=3650),
):
    """
    Train Prophet new_method for all variants and (optionally) save to DB.
    Source: daily_branch_metrics (DB). A temporary CSV is generated internally for the pipeline.
    Training log is saved to: ai-service/app/TOOL2/src/new_method/train/logs/
    """
    csv_path = _export_new_method_csv_from_db(int(branch_id), days=days)

    script = (Path(__file__).resolve().parent.parent / "TOOL2" / "src" / "new_method" / "train" / "run_prophet_all_variants_save_db.py").resolve()
    if not script.exists():
        raise HTTPException(status_code=500, detail=f"Script missing: {script}")

    args = [
        "--input",
        str(csv_path),
        "--target",
        str(target),
        "--horizon",
        str(int(horizon)),
        "--future-periods",
        str(int(future_periods)),
        "--interval-width",
        str(float(interval_width)),
        "--interval-width-grid",
        str(interval_width_grid),
        "--min-coverage",
        str(float(min_coverage)),
        "--coverage-weight",
        str(float(coverage_weight)),
        "--created-by",
        str(created_by),
    ]
    if commit:
        args.append("--commit")
    
    log_prefix = f"prophet_branch_{branch_id}_target_{target}"
    try:
        payload = _run_new_method_script(script, args, log_prefix=log_prefix)
        return {"success": True, "branch_id": branch_id, "commit": commit, "days": days, "target": target, "result": payload}
    finally:
        try:
            csv_path.unlink(missing_ok=True)
        except Exception:
            pass


@router.get("/defaults")
async def get_training_defaults():
    """
    Return default hyperparameters/settings so the FE can prefill optional inputs.
    """
    return {
        "success": True,
        "iforest": {
            "training_days": settings.IFOREST_TRAINING_DAYS,
            "min_training_samples": settings.MIN_TRAINING_SAMPLES,
            "n_estimators": settings.IFOREST_N_ESTIMATORS,
            "contamination": settings.IFOREST_CONTAMINATION,
            "enable_tuning": settings.ENABLE_HYPERPARAMETER_TUNING,
            "min_validation_separation": settings.IFOREST_MIN_VALIDATION_SEPARATION,
        },
        "forecast": {
            "training_days": settings.FORECAST_TRAINING_DAYS,
            "min_training_samples": 30,
            "algorithm": settings.FORECAST_ALGORITHM,
            "target_metric": settings.FORECAST_TARGET_METRIC,
            "seasonality_mode": settings.FORECAST_SEASONALITY_MODE,
            "yearly_seasonality": settings.FORECAST_YEARLY_SEASONALITY,
            "weekly_seasonality": settings.FORECAST_WEEKLY_SEASONALITY,
            "daily_seasonality": False,
            "use_external_regressors": settings.FORECAST_USE_REGRESSORS,
            "enable_tuning": settings.ENABLE_HYPERPARAMETER_TUNING,
            "quality_gate": {
                "min_test_samples": settings.FORECAST_MIN_TEST_SAMPLES,
                "max_mape_percent": settings.FORECAST_MAX_MAPE_PERCENT,
                "max_mae": settings.FORECAST_MAX_MAE,
            },
        },
    }


def _db_name() -> str:
    return settings.DB_NAME or "analytics_db"


def _serialize_model_info(model_entity) -> ModelInfo:
    # model_entity is TOOL2 MLModel dataclass
    hyperparameters: Optional[Dict[str, Any]] = None
    feature_list = None
    try:
        if getattr(model_entity, "hyperparameters", None):
            hyperparameters = json.loads(model_entity.hyperparameters)
    except Exception:
        hyperparameters = None
    try:
        if getattr(model_entity, "feature_list", None):
            feature_list = json.loads(model_entity.feature_list)
    except Exception:
        feature_list = None

    trained_at = getattr(model_entity, "trained_at", None)
    return ModelInfo(
        id=getattr(model_entity, "id", None),
        model_name=getattr(model_entity, "model_name", None),
        model_version=getattr(model_entity, "model_version", None),
        model_type=getattr(model_entity, "model_type", None),
        trained_at=trained_at.isoformat() if trained_at else None,
        training_data_start_date=str(getattr(model_entity, "training_data_start_date", None))
        if getattr(model_entity, "training_data_start_date", None)
        else None,
        training_data_end_date=str(getattr(model_entity, "training_data_end_date", None))
        if getattr(model_entity, "training_data_end_date", None)
        else None,
        training_samples_count=getattr(model_entity, "training_samples_count", None),
        hyperparameters=hyperparameters,
        feature_list=feature_list,
        is_active=getattr(model_entity, "is_active", None),
    )


def _compute_forecast_quality(model_info: ModelInfo) -> Tuple[Optional[float], Optional[str]]:
    """
    Forecast quality: use MAE from stored hyperparameters metadata if present.
    Lower MAE is better; we convert to quality_score where higher is better.
    Returns (quality_score, note).
    """
    try:
        hp = model_info.hyperparameters or {}
        # Prefer evaluation_metrics.mae, fallback to mae at root.
        mae = None
        if isinstance(hp.get("evaluation_metrics"), dict):
            mae = hp["evaluation_metrics"].get("mae")
        if mae is None:
            mae = hp.get("mae")
        if mae is None:
            return None, "No MAE found in model metadata"
        mae_f = float(mae)
        # Convert to score: higher is better. Use 1/(1+mae) to keep bounded (0,1].
        score = 1.0 / (1.0 + max(0.0, mae_f))
        model_info.quality_metric = "mae"
        model_info.quality_value = mae_f
        model_info.quality_score = score
        return score, None
    except Exception as e:
        return None, f"Failed to compute forecast quality: {e}"


def _compute_iforest_quality(
    predictor: MLPredictor,
    trainer: MLTrainer,
    metrics_repo: MetricsRepositoryImpl,
    branch_id: int,
    model_entity,
    model_info: ModelInfo,
) -> Tuple[Optional[float], Optional[str]]:
    """
    Isolation Forest quality: separation score computed on training range.
    Higher separation between normal vs anomaly scores is better.
    """
    try:
        # Load model package
        model, scaler, score_stats = predictor.load_model(model_entity)
        # Fetch metrics in the training date range (best-effort)
        start = model_info.training_data_start_date
        end = model_info.training_data_end_date
        if not start or not end:
            return None, "Missing training date range in model record"

        # Query using raw SQL because repository doesn't expose range query
        rows = metrics_repo.db.execute_query(
            """
            SELECT *
            FROM daily_branch_metrics
            WHERE branch_id = %s
              AND report_date >= %s
              AND report_date <= %s
            ORDER BY report_date ASC
            """,
            (int(branch_id), start, end),
        )
        if not rows:
            return None, "No metrics found for training date range"
        metrics = [DailyBranchMetrics.from_dict(r) for r in rows]

        X, _ = trainer.prepare_training_data(metrics)
        preds = model.predict(X)
        scores = model.score_samples(X)
        anomaly_mask = (preds == -1)
        if np.sum(anomaly_mask) == 0 or np.sum(~anomaly_mask) == 0:
            sep = 0.0
        else:
            sep = float(np.mean(scores[~anomaly_mask]) - np.mean(scores[anomaly_mask]))

        model_info.quality_metric = "separation"
        model_info.quality_value = sep
        model_info.quality_score = sep  # already "higher is better"
        return sep, None
    except Exception as e:
        return None, f"Failed to compute iforest quality: {e}"


def _find_active_forecast_model(model_repo: ModelRepositoryImpl, model_name: str):
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


def _find_active_forecast_model_flexible(
    model_repo: ModelRepositoryImpl,
    branch_id: int,
    algorithm: str,
    target_metric: str,
) -> Tuple[Optional[object], List[str]]:
    """
    Try multiple possible model_name conventions for forecast models.
    This helps when older data used a different casing convention in `ml_models.model_name`.
    Returns: (model_entity or None, tried_model_names)
    """
    alg = (algorithm or "PROPHET").strip()
    tm = (target_metric or "order_count").strip()

    # Primary convention (current code): forecast_{algorithm.lower()}_{target_metric}_branch_{id}
    candidates = [
        f"forecast_{alg.lower()}_{tm}_branch_{branch_id}",
        f"forecast_{alg.upper()}_{tm}_branch_{branch_id}",
        f"forecast_{alg}_{tm}_branch_{branch_id}",
    ]

    # 1) Exact match on model_name + active
    for name in candidates:
        m = _find_active_forecast_model(model_repo, name)
        if m:
            return m, candidates

    # 2) Fallback: pattern match any forecast model for this branch + target_metric + algorithm (by model_type)
    pattern = f"forecast_%_{tm}_branch_{branch_id}"
    query = """
        SELECT *
        FROM ml_models
        WHERE model_name LIKE %s
          AND is_active = TRUE
          AND UPPER(model_type) = UPPER(%s)
        ORDER BY trained_at DESC
        LIMIT 1
    """
    rows = model_repo.db.execute_query(query, (pattern, alg))
    if rows:
        from app.TOOL2.src.domain.entities.ml_model import MLModel  # type: ignore

        return MLModel.from_dict(rows[0]), candidates + [pattern]

    return None, candidates + [pattern]


@router.get("/status", response_model=ModelStatusResponse)
async def get_model_status(
    branch_id: int = Query(..., ge=1),
    algorithm: str = Query("PROPHET"),
    target_metric: str = Query("order_count"),
):
    """
    Get active Isolation Forest + Forecast model info for a branch.
    """
    db = DatabaseConnection(database_name=_db_name())
    db.connect()
    try:
        model_repo = ModelRepositoryImpl(db)

        iforest_model = model_repo.find_active_by_branch(branch_id)
        forecast_model_name = f"forecast_{algorithm.lower()}_{target_metric}_branch_{branch_id}"
        forecast_model = _find_active_forecast_model(model_repo, forecast_model_name)

        return ModelStatusResponse(
            success=True,
            branch_id=branch_id,
            iforest_model=_serialize_model_info(iforest_model) if iforest_model else None,
            forecast_model=_serialize_model_info(forecast_model) if forecast_model else None,
        )
    finally:
        db.disconnect()


@router.get("/by-id", response_model=ModelByIdResponse)
async def get_model_by_id(model_id: int = Query(..., ge=1)):
    """
    Get a specific model record by id from ml_models.
    Useful to fetch an older model (model cũ) explicitly.
    """
    db = DatabaseConnection(database_name=_db_name())
    db.connect()
    try:
        model_repo = ModelRepositoryImpl(db)
        model = model_repo.find_by_id(model_id)
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
        return ModelByIdResponse(success=True, model=_serialize_model_info(model))
    finally:
        db.disconnect()


@router.get("/history", response_model=ModelHistoryResponse)
async def get_model_history(
    branch_id: int = Query(..., ge=1),
    kind: str = Query(..., description="iforest | forecast"),
    algorithm: str = Query("PROPHET"),
    target_metric: str = Query("order_count"),
    include_inactive: bool = Query(True),
    limit: int = Query(10, ge=1, le=100),
    sort_by: str = Query("best", description="best | trained_at"),
):
    """
    Get model history for a branch from table `ml_models`.

    - kind=iforest: model_name = iforest_anomaly_branch_{branch_id}
    - kind=forecast: model_name = forecast_{algorithm}_{target_metric}_branch_{branch_id}
    """
    kind_norm = (kind or "").strip().lower()
    if kind_norm not in ("iforest", "forecast"):
        raise HTTPException(status_code=400, detail="kind must be 'iforest' or 'forecast'")

    if kind_norm == "iforest":
        model_name = f"iforest_anomaly_branch_{branch_id}"
    else:
        model_name = f"forecast_{algorithm.lower()}_{target_metric}_branch_{branch_id}"

    db = DatabaseConnection(database_name=_db_name())
    db.connect()
    try:
        metrics_repo = MetricsRepositoryImpl(db)
        where_active = "" if include_inactive else " AND is_active = TRUE "
        query = f"""
            SELECT *
            FROM ml_models
            WHERE model_name = %s
            {where_active}
            ORDER BY trained_at DESC
            LIMIT %s
        """
        rows = db.execute_query(query, (model_name, limit))
        from app.TOOL2.src.domain.entities.ml_model import MLModel  # type: ignore

        items = [_serialize_model_info(MLModel.from_dict(r)) for r in (rows or [])]

        # Compute quality + find best
        best_id: Optional[int] = None
        best_score: Optional[float] = None

        if kind_norm == "forecast":
            for mi in items:
                score, note = _compute_forecast_quality(mi)
                if note:
                    mi.quality_note = note
                if score is not None and (best_score is None or score > best_score):
                    best_score = score
                    best_id = mi.id
        else:
            predictor = MLPredictor()
            trainer = MLTrainer()
            # Need original entities to load model_data; re-create entities for these ids
            entities = [MLModel.from_dict(r) for r in (rows or [])]
            for ent, mi in zip(entities, items):
                score, note = _compute_iforest_quality(predictor, trainer, metrics_repo, branch_id, ent, mi)
                if note:
                    mi.quality_note = note
                if score is not None and (best_score is None or score > best_score):
                    best_score = score
                    best_id = mi.id

        # Sort
        sort_norm = (sort_by or "").strip().lower()
        if sort_norm == "best":
            # Higher quality_score is better; keep None at bottom
            items.sort(key=lambda m: (m.quality_score is None, -(m.quality_score or 0.0)))
        else:
            # Default: trained_at desc already, keep as-is
            pass

        return ModelHistoryResponse(
            success=True,
            branch_id=branch_id,
            model_name=model_name,
            total=len(items),
            items=items,
            best_model_id=best_id,
        )
    finally:
        db.disconnect()


@router.post("/retrain")
async def retrain_models(req: RetrainModelsRequest):
    """
    Train/retrain Isolation Forest and/or Prophet forecast for a specific branch.
    """
    try:
        branch_result = training_service.retrain_branch(
            branch_id=req.branch_id,
            train_iforest=req.train_iforest,
            train_forecast=req.train_forecast,
            target_metric=req.target_metric,
            algorithm=req.algorithm,
            iforest_params=(req.iforest_params.model_dump() if req.iforest_params else None),
            forecast_params=(req.forecast_params.model_dump() if req.forecast_params else None),
        )
        return {"success": True, "result": branch_result}
    except Exception as e:
        logger.error("Error retraining models: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/iforest/ablation")
async def iforest_feature_ablation(
    branch_id: int = Query(..., ge=1),
    days: int = Query(180, ge=30, le=365),
    n_estimators: int = Query(settings.IFOREST_N_ESTIMATORS, ge=10, le=2000),
    contamination: float = Query(settings.IFOREST_CONTAMINATION, gt=0.0, lt=0.5),
):
    """
    Run in-memory feature ablation experiments for Isolation Forest.
    This does NOT save any model; it only helps pick a feature set.
    """
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler

    db = DatabaseConnection(database_name=_db_name())
    db.connect()
    try:
        metrics_repo = MetricsRepositoryImpl(db)
        metrics_list = metrics_repo.find_for_training(branch_id, days=days)
        if len(metrics_list) < settings.MIN_TRAINING_SAMPLES:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient samples for ablation (have {len(metrics_list)}, need >= {settings.MIN_TRAINING_SAMPLES}).",
            )

        # Define candidate feature sets (keep it simple + practical)
        core = ["order_count", "total_revenue", "avg_order_value", "customer_count", "peak_hour", "day_of_week", "is_weekend"]
        ops = ["avg_preparation_time_seconds", "staff_efficiency_score", "waste_percentage"]
        stock = ["low_stock_products", "out_of_stock_products", "material_cost"]
        full = list(settings.FEATURE_LIST)

        candidates = [
            {"name": "core", "features": core},
            {"name": "core+ops", "features": core + ops},
            {"name": "core+stock", "features": core + stock},
            {"name": "full", "features": full},
        ]

        # Build a raw dataframe once (all columns that might be used)
        all_cols = sorted({c for cand in candidates for c in cand["features"]})
        rows = []
        for m in metrics_list:
            r = {}
            for c in all_cols:
                v = getattr(m, c, None)
                r[c] = 0.0 if v is None else float(v)
            rows.append(r)
        raw_df = pd.DataFrame(rows)

        split_idx = int(len(raw_df) * 0.8)
        if split_idx < 10 or (len(raw_df) - split_idx) < 5:
            raise HTTPException(status_code=400, detail="Not enough data to split train/val for ablation.")

        results = []
        for cand in candidates:
            feats = cand["features"]
            X = raw_df[feats].values
            scaler = StandardScaler()
            Xs = scaler.fit_transform(X)

            X_train = Xs[:split_idx]
            X_val = Xs[split_idx:]

            model = IsolationForest(
                n_estimators=n_estimators,
                contamination=contamination,
                random_state=42,
                n_jobs=-1,
            )
            model.fit(X_train)

            preds = model.predict(X_val)
            scores = model.score_samples(X_val)
            anomaly_mask = (preds == -1)

            if np.sum(anomaly_mask) == 0 or np.sum(~anomaly_mask) == 0:
                separation = 0.0
            else:
                separation = float(np.mean(scores[~anomaly_mask]) - np.mean(scores[anomaly_mask]))
            anomaly_rate = float(np.mean(anomaly_mask))

            results.append(
                {
                    "name": cand["name"],
                    "features": feats,
                    "val_samples": int(len(X_val)),
                    "val_anomaly_rate": anomaly_rate,
                    "val_separation": separation,
                }
            )

        results.sort(key=lambda r: (-(r["val_separation"] or 0.0), abs((r["val_anomaly_rate"] or 0.0) - contamination)))
        best = results[0] if results else None
        return {"success": True, "branch_id": branch_id, "days": days, "params": {"n_estimators": n_estimators, "contamination": contamination}, "best": best, "items": results}
    finally:
        db.disconnect()


@router.post("/test/forecast")
async def test_forecast(req: TestForecastRequest):
    """
    Backtest the active forecast model on the latest `test_days` points.

    Returns per-day actual vs forecast + CI, plus MAE/MAPE/RMSE and a confidence score.
    """
    algorithm = (req.algorithm or "PROPHET").upper()
    if algorithm != "PROPHET":
        raise HTTPException(status_code=501, detail="Only PROPHET test is supported currently")

    db = DatabaseConnection(database_name=_db_name())
    db.connect()
    try:
        metrics_repo = MetricsRepositoryImpl(db)
        model_repo = ModelRepositoryImpl(db)

        # Find active model (flexible name matching)
        model_entity, tried_names = _find_active_forecast_model_flexible(
            model_repo, req.branch_id, algorithm, req.target_metric
        )

        # Load data
        metrics_list = metrics_repo.find_for_training(req.branch_id, days=settings.FORECAST_TRAINING_DAYS)
        if len(metrics_list) < max(30, req.test_days + 10):
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient data for forecast test (have {len(metrics_list)} days, need more).",
            )

        trainer = ForecastTrainer()
        df = trainer.prepare_time_series_data(metrics_list, req.target_metric)
        if len(df) < max(30, req.test_days + 10):
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient usable rows after preprocessing (have {len(df)}).",
            )

        test_df = df.tail(req.test_days).copy()
        train_df = df.iloc[: len(df) - req.test_days].copy()

        predictor = ForecastPredictor()
        # IMPORTANT: avoid leakage. Retrain a temporary model on train_df, then predict on test_df.
        warning = None
        if model_entity:
            _, metadata = predictor.load_model(model_entity)
        else:
            # No active model found -> still allow backtest using default config
            metadata = {
                "seasonality_mode": settings.FORECAST_SEASONALITY_MODE,
                "yearly_seasonality": settings.FORECAST_YEARLY_SEASONALITY,
                "weekly_seasonality": settings.FORECAST_WEEKLY_SEASONALITY,
                "daily_seasonality": False,
                "use_external_regressors": settings.FORECAST_USE_REGRESSORS,
                "external_regressors": [],
            }
            warning = f"No active forecast model found. Tried: {tried_names}. Running temporary Prophet backtest (not saved)."

        model_eval, _ = trainer.train_prophet(
            train_df,
            seasonality_mode=metadata.get("seasonality_mode", "multiplicative"),
            yearly_seasonality=metadata.get("yearly_seasonality", True),
            weekly_seasonality=metadata.get("weekly_seasonality", True),
            daily_seasonality=metadata.get("daily_seasonality", False),
            use_external_regressors=metadata.get("use_external_regressors", True),
        )

        # Build future df for the test dates
        future_df = pd.DataFrame({"ds": test_df["ds"].values})

        # IMPORTANT:
        # Prophet requires that ALL regressors used during training exist in the predict dataframe.
        # Do NOT rely on saved metadata, because it may be missing/older/different.
        # Instead, read regressors directly from the trained model_eval.
        external_regressors = list(getattr(model_eval, "extra_regressors", {}).keys())

        for regressor in external_regressors:
            if regressor in test_df.columns:
                # Use actual regressor values for the test period when possible
                future_df[regressor] = test_df[regressor].values
            elif regressor == "day_of_week":
                future_df[regressor] = pd.to_datetime(future_df["ds"]).dt.dayofweek + 1
            elif regressor == "is_weekend":
                future_df[regressor] = (pd.to_datetime(future_df["ds"]).dt.dayofweek >= 5).astype(int)
            elif regressor == "peak_hour":
                avg_peak_hour = float(train_df["peak_hour"].mean()) if "peak_hour" in train_df.columns else 12.0
                future_df[regressor] = int(avg_peak_hour) if not np.isnan(avg_peak_hour) else 12
            else:
                avg_value = float(train_df[regressor].mean()) if regressor in train_df.columns else 0.0
                future_df[regressor] = 0.0 if np.isnan(avg_value) else avg_value

        forecast = model_eval.predict(future_df)
        forecast_values: Dict[str, float] = {}
        confidence_intervals: Dict[str, Dict[str, float]] = {}
        actual_values: Dict[str, float] = {}

        for _, row in forecast.iterrows():
            ds = row["ds"]
            date_str = pd.to_datetime(ds).strftime("%Y-%m-%d")
            yhat = float(row["yhat"])
            forecast_values[date_str] = yhat
            confidence_intervals[date_str] = {
                "lower": float(row.get("yhat_lower", yhat * 0.9)),
                "upper": float(row.get("yhat_upper", yhat * 1.1)),
            }

        for _, r in test_df.iterrows():
            date_str = pd.to_datetime(r["ds"]).strftime("%Y-%m-%d")
            actual_values[date_str] = float(r["y"])

        metrics = predictor.calculate_metrics(actual_values, forecast_values)
        confidence_metrics = calculate_confidence_score(forecast_values, confidence_intervals) or None
        confidence_percent = (
            float(calculate_confidence_percentage(confidence_metrics)) if confidence_metrics else 0.0
        )

        if confidence_percent >= 85:
            confidence_level = "VERY_HIGH"
        elif confidence_percent >= 70:
            confidence_level = "HIGH"
        elif confidence_percent >= 55:
            confidence_level = "MEDIUM"
        else:
            confidence_level = "LOW"

        rows = []
        for date_str in sorted(actual_values.keys()):
            ci = confidence_intervals.get(date_str, {})
            rows.append(
                {
                    "date": date_str,
                    "actual": actual_values.get(date_str),
                    "forecast": forecast_values.get(date_str),
                    "lower": ci.get("lower"),
                    "upper": ci.get("upper"),
                }
            )

        return {
            "success": True,
            "branch_id": req.branch_id,
            "algorithm": algorithm,
            "target_metric": req.target_metric,
            "test_days": req.test_days,
            "model": _serialize_model_info(model_entity).model_dump() if model_entity else None,
            "warning": warning,
            "tried_model_names": tried_names,
            "metrics": metrics,
            "confidence": {
                "percent": round(confidence_percent, 1),
                "level": confidence_level,
                "confidence_metrics": confidence_metrics,
            },
            "backtest": {
                "train_samples": int(len(train_df)),
                "test_samples": int(len(test_df)),
                "train_date_range": {
                    "start": str(pd.to_datetime(train_df["ds"].min()).date()),
                    "end": str(pd.to_datetime(train_df["ds"].max()).date()),
                },
                "test_date_range": {
                    "start": str(pd.to_datetime(test_df["ds"].min()).date()),
                    "end": str(pd.to_datetime(test_df["ds"].max()).date()),
                },
            },
            "rows": rows,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error testing forecast: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.disconnect()


@router.post("/test/iforest")
async def test_iforest(req: TestIForestRequest):
    """
    Run Isolation Forest anomaly prediction on latest `test_days` metrics and return per-day scores/confidence.
    """
    db = DatabaseConnection(database_name=_db_name())
    db.connect()
    try:
        metrics_repo = MetricsRepositoryImpl(db)
        model_repo = ModelRepositoryImpl(db)
        predictor = MLPredictor()

        model_entity = model_repo.find_active_by_branch(req.branch_id)
        if not model_entity:
            raise HTTPException(status_code=404, detail="No active Isolation Forest model found for branch")

        model, scaler, score_stats = predictor.load_model(model_entity)
        metrics_list = metrics_repo.find_for_training(req.branch_id, days=req.test_days)
        # Nếu thiếu dữ liệu, vẫn test với số ngày có sẵn thay vì 400
        used_days = min(len(metrics_list), req.test_days)
        warning = None
        if used_days < req.test_days:
            warning = f"Insufficient metrics for requested test_days={req.test_days}; using available_days={used_days}."

        rows = []
        anomaly_count = 0
        confidences = []
        for metric in metrics_list[-used_days:]:
            is_anomaly, anomaly_score, confidence = predictor.predict(model, scaler, metric, score_stats)
            if is_anomaly:
                anomaly_count += 1
            confidences.append(confidence)
            rows.append(
                {
                    "date": metric.report_date.isoformat(),
                    "is_anomaly": bool(is_anomaly),
                    "anomaly_score": float(anomaly_score),
                    "confidence": float(confidence),
                }
            )

        total = len(rows)
        avg_conf = float(np.mean(confidences)) if confidences else 0.0
        return {
            "success": True,
            "branch_id": req.branch_id,
            "requested_test_days": req.test_days,
            "used_test_days": used_days,
            "model": _serialize_model_info(model_entity).model_dump(),
            "summary": {
                "total_days": total,
                "anomaly_days": anomaly_count,
                "anomaly_rate": float(anomaly_count / total) if total else 0.0,
                "avg_confidence": avg_conf,
            },
            "rows": rows,
            "warning": warning,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error testing Isolation Forest: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.disconnect()


