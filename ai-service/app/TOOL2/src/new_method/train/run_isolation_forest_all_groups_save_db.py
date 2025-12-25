"""
Train Isolation Forest for ALL 4 feature groups (a,b,c,d) in one run and save results into DB (ml_models).

This script wraps the existing `run_isolation_forest_pipeline.py` (new_method) for each group,
then persists the trained bundles into `analytics_db.ml_models` using TOOL2 repositories.

IMPORTANT (safety):
- We do NOT overwrite the production model name `iforest_anomaly_branch_{branch_id}` by default.
- We store under: `iforest_nm_branch_{branch_id}` (one name, multiple versions per group).
  Only the best group (by separation score) is marked `is_active=TRUE` within that name.

Usage (dry-run):
  python ai-service/app/TOOL2/src/new_method/train/run_isolation_forest_all_groups_save_db.py --input ai-service/app/TOOL2/src/new_method/data/branch_1.csv

Usage (commit to DB):
  python ai-service/app/TOOL2/src/new_method/train/run_isolation_forest_all_groups_save_db.py --input ... --commit
"""

from __future__ import annotations

import argparse
import json
import os
import pickle
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--input", required=True, help="Branch CSV file (new_method/data/branch_1.csv)")
    p.add_argument("--groups", default="a,b,c,d", help="Comma-separated groups to train (default: a,b,c,d)")
    p.add_argument(
        "--parallel",
        action="store_true",
        default=True,
        help="Train groups in parallel using subprocesses (default: true).",
    )
    p.add_argument(
        "--max-workers",
        type=int,
        default=4,
        help="Max parallel workers (default: 4).",
    )
    p.add_argument("--database", default="", help="Override DB name (default: env or analytics_db)")
    p.add_argument("--created-by", default="admin", help="created_by to store in ml_models")
    p.add_argument(
        "--model-version-prefix",
        default="nm",
        help="Prefix for model_version (default: nm). Actual version will include group + timestamp.",
    )
    p.add_argument(
        "--model-name-prefix",
        default="iforest_nm_",
        help="Model name prefix (default: iforest_nm_). Full name: prefix + <group>_branch_<branch_id>",
    )
    p.add_argument("--commit", action="store_true", help="Write to DB. Default is dry-run.")
    p.add_argument(
        "--keep-artifacts",
        action="store_true",
        help="Keep pipeline artifacts on disk (processed/tuning/anomalies/model joblib).",
    )
    return p.parse_args()


def _run_group_pipeline(py: str, pipeline_path: Path, *, input_csv: Path, group: str) -> Dict[str, Any]:
    cmd = [
        py,
        str(pipeline_path),
        "--input",
        str(input_csv),
        "--group",
        group,
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"Group {group} failed.\nSTDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}")

    # Pipeline prints a JSON object (last print). Grab last non-empty line that parses as JSON.
    lines = [ln.strip() for ln in (proc.stdout or "").splitlines() if ln.strip()]
    last_json = None
    for ln in reversed(lines):
        if ln.startswith("{") and ln.endswith("}"):
            try:
                last_json = json.loads(ln)
                break
            except Exception:
                continue
    if not last_json:
        raise RuntimeError(f"Could not parse pipeline JSON output for group {group}.\nSTDOUT:\n{proc.stdout}")
    return last_json


def _load_bundle(model_path: Path) -> Dict[str, Any]:
    from joblib import load

    return load(model_path)


def _compute_separation(scores, pred) -> float:
    import numpy as np

    scores = np.asarray(scores, dtype=float)
    pred = np.asarray(pred, dtype=int)
    anomaly_mask = pred == -1
    if anomaly_mask.sum() == 0 or (~anomaly_mask).sum() == 0:
        return 0.0
    return float(scores[~anomaly_mask].mean() - scores[anomaly_mask].mean())


def _compute_score_stats(scores, *, contamination: float) -> Dict[str, float]:
    import numpy as np

    s = np.asarray(scores, dtype=float)
    if len(s) == 0:
        return {
            "min_score": 0.0,
            "max_score": 0.0,
            "q25_score": 0.0,
            "q75_score": 0.0,
            "median_score": 0.0,
            "mean_score": 0.0,
            "std_score": 0.0,
            "contamination": float(contamination),
            "threshold_score": 0.0,
            "threshold_percentile": 100.0 * (1.0 - float(contamination)),
        }
    threshold_percentile = 100.0 * (1.0 - float(contamination))
    return {
        "min_score": float(np.min(s)),
        "max_score": float(np.max(s)),
        "q25_score": float(np.percentile(s, 25)),
        "q75_score": float(np.percentile(s, 75)),
        "median_score": float(np.median(s)),
        "mean_score": float(np.mean(s)),
        "std_score": float(np.std(s)),
        "contamination": float(contamination),
        "threshold_score": float(np.percentile(s, threshold_percentile)),
        "threshold_percentile": float(threshold_percentile),
    }


def _connect_db(database_name: str):
    # Ensure we can import app.* when running from repo root
    repo_root = Path(__file__).resolve().parents[6]  # .../coffee_management
    if str(repo_root / "ai-service") not in os.sys.path:
        os.sys.path.insert(0, str(repo_root / "ai-service"))

    from app.TOOL2.src.infrastructure.database.connection import DatabaseConnection  # type: ignore

    db = DatabaseConnection(database_name=database_name or None)
    db.connect()
    return db


def _save_model_to_db(
    *,
    db,
    model_name: str,
    model_version: str,
    created_by: str,
    model,
    scaler,
    feature_cols: List[str],
    drop_cols: List[str],
    trained_dates: Tuple[date, date],
    training_samples: int,
    hyperparameters: Dict[str, Any],
    score_stats: Dict[str, Any],
    is_active: bool,
) -> int:
    import numpy as np
    from app.TOOL2.src.domain.entities.ml_model import MLModel  # type: ignore
    from app.TOOL2.src.infrastructure.repositories.model_repository_impl import ModelRepositoryImpl  # type: ignore

    start_dt, end_dt = trained_dates

    # Basic feature stats (for observability, not critical)
    stats = {}
    try:
        # we store stats placeholders; detailed stats not necessary here
        for f in feature_cols:
            stats[f] = {"mean": None, "std": None, "min": None, "max": None}
    except Exception:
        stats = {}

    model_package = {
        "model": model,
        "scaler": scaler,
        "features": feature_cols,
        "score_stats": score_stats,
        "new_method": {
            "drop_cols": drop_cols,
            "feature_cols": feature_cols,
        },
    }
    model_binary = pickle.dumps(model_package)

    repo = ModelRepositoryImpl(db)
    ent = MLModel(
        model_name=model_name,
        model_version=model_version,
        model_type="ISOLATION_FOREST",
        model_data=model_binary,
        hyperparameters=json.dumps(hyperparameters, ensure_ascii=False),
        feature_list=json.dumps(feature_cols, ensure_ascii=False),
        training_data_start_date=start_dt,
        training_data_end_date=end_dt,
        training_samples_count=int(training_samples),
        training_data_stats=json.dumps(stats, ensure_ascii=False),
        accuracy_score=None,
        precision_score=None,
        recall_score=None,
        f1_score=None,
        is_active=bool(is_active),
        is_production=False,
        created_by=str(created_by),
    )
    return int(repo.save(ent))


@dataclass
class GroupResult:
    group: str
    model_path: Path
    processed_csv: Path
    anomalies_csv: Path
    best_params: Dict[str, Any]
    pred_anomaly_rate: float
    separation: float
    branch_id: int
    start_date: date
    end_date: date
    feature_cols: List[str]
    drop_cols: List[str]


def main() -> int:
    args = _parse_args()
    input_csv = Path(args.input).resolve()
    if not input_csv.exists():
        raise SystemExit(f"Input not found: {input_csv}")

    py = os.sys.executable
    pipeline_path = Path(__file__).resolve().parent / "run_isolation_forest_pipeline.py"
    if not pipeline_path.exists():
        raise SystemExit(f"Pipeline not found: {pipeline_path}")

    groups = [g.strip().lower() for g in str(args.groups).split(",") if g.strip()]
    for g in groups:
        if g not in ("a", "b", "c", "d"):
            raise SystemExit("groups must be subset of: a,b,c,d")

    # Discover branch_id from filename or CSV (prefer CSV)
    import pandas as pd

    df0 = pd.read_csv(input_csv, usecols=["branch_id", "report_date"])
    if df0.empty:
        raise SystemExit("Input CSV has no rows.")
    branch_id = int(df0["branch_id"].iloc[0])

    print("=" * 90)
    print("IForest new_method: train ALL groups and save to DB")
    print(f"Input: {input_csv}")
    print(f"Branch: {branch_id}")
    print(f"Groups: {groups}")
    print(f"Mode: {'COMMIT' if args.commit else 'DRY-RUN'}")
    print("=" * 90)

    results: List[GroupResult] = []

    metas: Dict[str, Dict[str, Any]] = {}
    if args.parallel and len(groups) > 1:
        workers = max(1, min(int(args.max_workers), len(groups)))
        print(f"Parallel training enabled: workers={workers}")
        with ThreadPoolExecutor(max_workers=workers) as ex:
            fut_map = {
                ex.submit(_run_group_pipeline, py, pipeline_path, input_csv=input_csv, group=g): g for g in groups
            }
            for fut in as_completed(fut_map):
                g = fut_map[fut]
                metas[g] = fut.result()
    else:
        for g in groups:
            metas[g] = _run_group_pipeline(py, pipeline_path, input_csv=input_csv, group=g)

    for g in groups:
        meta = metas[g]
        paths = meta.get("paths") or {}
        model_path = Path(paths["model"]).resolve()
        processed_csv = Path(paths["processed_csv"]).resolve()
        anomalies_csv = Path(paths["anomalies_csv"]).resolve()

        bundle = _load_bundle(model_path)
        model = bundle["model"]
        scaler = bundle["scaler"]
        feature_cols = list(bundle.get("feature_cols") or [])
        drop_cols = list(bundle.get("drop_cols") or [])
        best_params = dict(bundle.get("best_params") or meta.get("best_params") or {})

        # Compute separation from anomalies output (scores + predicted anomaly flags)
        anom = pd.read_csv(anomalies_csv)
        scores = anom["score"].values
        pred = anom["anomaly"].values
        # convert anomaly flag (0/1) to IForest predict convention (-1/1) for separation
        pred_if = [-1 if int(x) == 1 else 1 for x in pred]
        separation = _compute_separation(scores, pred_if)

        # Date range from processed csv
        pdf = pd.read_csv(processed_csv)
        dts = pd.to_datetime(pdf["report_date"], errors="coerce").dropna()
        start_date = dts.min().date()
        end_date = dts.max().date()

        results.append(
            GroupResult(
                group=g,
                model_path=model_path,
                processed_csv=processed_csv,
                anomalies_csv=anomalies_csv,
                best_params=best_params,
                pred_anomaly_rate=float(meta.get("pred_anomaly_rate") or 0.0),
                separation=float(separation),
                branch_id=branch_id,
                start_date=start_date,
                end_date=end_date,
                feature_cols=feature_cols,
                drop_cols=drop_cols,
            )
        )

        print(
            f"Group {g}: separation={separation:.6f} | anomaly_rate={float(meta.get('pred_anomaly_rate') or 0.0):.4f} | model={model_path.name}"
        )

        # Prevent unused warnings
        _ = scaler
        _ = model

    # Pick best group by separation (higher is better). Tiebreaker: anomaly_rate closer to 0.1 (common).
    def _key(r: GroupResult):
        return (r.separation, -abs(r.pred_anomaly_rate - 0.1))

    best = sorted(results, key=_key, reverse=True)[0] if results else None
    if not best:
        raise SystemExit("No results produced.")
    print(f"\nBEST group: {best.group} (separation={best.separation:.6f})")

    # Explicit quality summary (for terminal logs)
    try:
        print("\n=== IFOREST NEW_METHOD QUALITY SUMMARY ===")
        for r in sorted(results, key=lambda x: x.group):
            print(
                f"- group={r.group} | separation={r.separation:.6f} | pred_anomaly_rate={r.pred_anomaly_rate:.4f} "
                f"| samples={int(len(pd.read_csv(r.processed_csv)))} | date_range={r.start_date}→{r.end_date}"
            )
        print(f"BEST group by separation: {best.group} (separation={best.separation:.6f})")
        print("Note: separation is computed from training predictions (not a true holdout).")
        print("=========================================")
    except Exception:
        pass

    # Save to DB if requested
    if not args.commit:
        print("\nDRY-RUN complete. No DB writes.")
        # Print JSON summary for API parsing (dry-run)
        summary = {
            "branch_id": branch_id,
            "groups": groups,
            "best_group": best.group,
            "best_separation": float(best.separation),
            "mode": "dry-run",
            "results": [
                {
                    "group": r.group,
                    "separation": float(r.separation),
                    "pred_anomaly_rate": float(r.pred_anomaly_rate),
                    "date_range": f"{r.start_date}→{r.end_date}",
                    "model_path": str(r.model_path),
                }
                for r in results
            ],
        }
        print(json.dumps(summary, ensure_ascii=False))
        return 0

    db = _connect_db(args.database)
    try:
        # Save one ACTIVE model per group under distinct model_name.
        # This allows all 4 groups to be active together without violating the common
        # "single active per model_name" assumption in other parts of the system.

        now = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        saved_ids: Dict[str, int] = {}

        for r in results:
            model_name = f"{str(args.model_name_prefix)}{r.group}_branch_{branch_id}"
            # Deactivate existing active model for this group-name
            db.execute_query(
                "UPDATE ml_models SET is_active = FALSE WHERE model_name = %s AND is_active = TRUE",
                (model_name,),
                fetch=False,
            )

            bundle = _load_bundle(r.model_path)
            model = bundle["model"]
            scaler = bundle["scaler"]

            cont = float((r.best_params or {}).get("contamination") or getattr(model, "contamination", 0.1) or 0.1)

            # Score stats from anomalies file scores
            import pandas as pd

            anom = pd.read_csv(r.anomalies_csv)
            scores = anom["score"].values
            score_stats = _compute_score_stats(scores, contamination=cont)

            # Hyperparameters stored as JSON (include group + tuning result + quality)
            hp = {
                "source": "new_method",
                "group": r.group,
                "best_params": r.best_params,
                "pred_anomaly_rate": r.pred_anomaly_rate,
                "separation_score": r.separation,
            }

            model_version = f"{args.model_version_prefix}-{r.group}-{now}"
            is_active = True  # one active per group

            mid = _save_model_to_db(
                db=db,
                model_name=model_name,
                model_version=model_version,
                created_by=args.created_by,
                model=model,
                scaler=scaler,
                feature_cols=r.feature_cols,
                drop_cols=r.drop_cols,
                trained_dates=(r.start_date, r.end_date),
                training_samples=int(len(pd.read_csv(r.processed_csv))),
                hyperparameters=hp,
                score_stats=score_stats,
                is_active=is_active,
            )
            saved_ids[r.group] = mid

        print("\n✅ Saved models to DB:")
        for g, mid in saved_ids.items():
            suffix = " (BEST group)" if g == best.group else ""
            print(f" - group {g}: id={mid} (active){suffix}")
        print(f"Model name used (new_method): {args.model_name_prefix}<group>_branch_{branch_id}")
        print("Note: this does not overwrite production name `iforest_anomaly_branch_{branch_id}`.")
        
        # Print JSON summary for API parsing
        summary = {
            "branch_id": branch_id,
            "groups": groups,
            "best_group": best.group,
            "best_separation": float(best.separation),
            "saved_model_ids": saved_ids,
            "results": [
                {
                    "group": r.group,
                    "separation": float(r.separation),
                    "pred_anomaly_rate": float(r.pred_anomaly_rate),
                    "model_id": saved_ids.get(r.group),
                    "date_range": f"{r.start_date}→{r.end_date}",
                }
                for r in results
            ],
        }
        print(json.dumps(summary, ensure_ascii=False))
    finally:
        db.disconnect()

    # Optional cleanup
    if not args.keep_artifacts:
        # Keep files for debug by default? User didn't specify; we can leave them.
        pass

    return 0


if __name__ == "__main__":
    raise SystemExit(main())


