"""
Train Prophet (new_method) for multiple variants in one run and save to DB (ml_models).

Variants implemented (similar spirit to "all groups" for IForest):
- include_month: True/False  (controlled by --drop-month in preprocess)
- use_operational_regressors: True/False

For each variant we run:
1) prophet_preprocess.py  -> prophet-ready CSV (ds,y + regressors)
2) tune_prophet.py        -> tuning CSV (best row first)
3) train_and_save_prophet.py -> saved joblib + metrics JSON (and prints JSON)

We then pick BEST variant by:
- If min_coverage > 0: coverage must be >= min_coverage (otherwise penalized heavily)
- Primary: lower MAPE
- Secondary: lower MAE
- Tertiary: higher coverage

DB safety:
We do NOT overwrite production forecast model names by default.
We store under a separate name:
  forecast_nm_prophet_<target>_branch_<branch_id>
and mark only the best variant as is_active=TRUE within that name.

Usage (dry-run):
  python ai-service/app/TOOL2/src/new_method/train/run_prophet_all_variants_save_db.py --input ai-service/app/TOOL2/src/new_method/data/branch_1.csv --target order_count

Usage (commit to DB):
  python ai-service/app/TOOL2/src/new_method/train/run_prophet_all_variants_save_db.py --input ... --target order_count --commit
"""

from __future__ import annotations

import argparse
import json
import os
import pickle
import subprocess
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--input", required=True, help="Branch CSV file (new_method/data/branch_1.csv)")
    p.add_argument("--target", default="total_revenue", help="Target column for y (e.g. order_count, total_revenue)")
    p.add_argument("--horizon", type=int, default=30, help="Holdout horizon for tuning/eval (default: 30)")
    p.add_argument("--future-periods", type=int, default=30, help="Future periods saved in forecast CSV (default: 30)")
    p.add_argument("--interval-width", type=float, default=0.8, help="Base interval_width (default: 0.8)")
    p.add_argument(
        "--interval-width-grid",
        default="",
        help="Optional grid for interval_width (comma-separated, e.g. 0.8,0.9,0.95).",
    )
    p.add_argument("--min-coverage", type=float, default=0.0, help="Optional minimum coverage gate (default: 0.0)")
    p.add_argument("--coverage-weight", type=float, default=2.0, help="Penalty weight when coverage below gate")
    p.add_argument("--database", default="", help="Override DB name (default: env or analytics_db)")
    p.add_argument("--created-by", default="admin", help="created_by to store in ml_models")
    p.add_argument(
        "--model-version-prefix",
        default="nm",
        help="Prefix for model_version (default: nm). Actual version includes variant + timestamp.",
    )
    p.add_argument(
        "--model-name-prefix",
        default="forecast_nm_prophet_",
        help="Model name prefix (default: forecast_nm_prophet_). Full: prefix + <target>_branch_<id>",
    )
    p.add_argument("--commit", action="store_true", help="Write to DB. Default is dry-run.")
    p.add_argument(
        "--save-all",
        action="store_true",
        default=False,
        help="Save ALL variants to DB (default: false -> only save BEST).",
    )
    return p.parse_args()


def _run_script(py: str, script_path: Path, args: List[str]) -> str:
    cmd = [py, str(script_path)] + args
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"Failed: {script_path.name}\nCMD: {' '.join(cmd)}\nSTDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}")
    return proc.stdout or ""


def _parse_last_json(stdout: str) -> Dict[str, Any]:
    lines = [ln.strip() for ln in (stdout or "").splitlines() if ln.strip()]
    for ln in reversed(lines):
        if ln.startswith("{") and ln.endswith("}"):
            try:
                return json.loads(ln)
            except Exception:
                continue
    raise RuntimeError(f"Could not parse JSON from stdout:\n{stdout}")


def _connect_db(database_name: str):
    repo_root = Path(__file__).resolve().parents[6]  # .../coffee_management
    if str(repo_root / "ai-service") not in os.sys.path:
        os.sys.path.insert(0, str(repo_root / "ai-service"))
    from app.TOOL2.src.infrastructure.database.connection import DatabaseConnection  # type: ignore

    db = DatabaseConnection(database_name=database_name or None)
    db.connect()
    return db


def _save_forecast_model_to_db(
    *,
    db,
    model_name: str,
    model_version: str,
    created_by: str,
    model_obj: Any,
    metadata: Dict[str, Any],
    is_active: bool,
) -> int:
    from app.TOOL2.src.domain.entities.ml_model import MLModel  # type: ignore
    from app.TOOL2.src.infrastructure.repositories.model_repository_impl import ModelRepositoryImpl  # type: ignore
    from datetime import date as _date

    # ForecastPredictor.load_model expects: pickle.loads(model_data) -> model, json.loads(hyperparameters) -> metadata
    model_binary = pickle.dumps(model_obj)

    date_range = metadata.get("date_range") or {}
    start = date_range.get("start")
    end = date_range.get("end")
    if not start or not end:
        raise ValueError("metadata.date_range.start/end is required")

    ent = MLModel(
        model_name=model_name,
        model_version=model_version,
        model_type="PROPHET",
        model_data=model_binary,
        hyperparameters=json.dumps(metadata, ensure_ascii=False),
        feature_list=json.dumps(metadata.get("external_regressors", []), ensure_ascii=False),
        training_data_start_date=_date.fromisoformat(str(start)),
        training_data_end_date=_date.fromisoformat(str(end)),
        training_samples_count=int(metadata.get("training_samples") or 0),
        training_data_stats=json.dumps(metadata, ensure_ascii=False),
        is_active=bool(is_active),
        is_production=False,
        created_by=str(created_by),
    )

    repo = ModelRepositoryImpl(db)
    return int(repo.save(ent))


@dataclass
class VariantResult:
    name: str
    include_month: bool
    use_operational_regressors: bool
    prophet_csv: Path
    tuning_csv: Path
    model_path: Path
    metrics: Dict[str, Any]
    regressors: List[str]

    @property
    def mae(self) -> float:
        v = self.metrics.get("mae")
        return float(v) if v is not None else float("inf")

    @property
    def mape(self) -> float:
        v = self.metrics.get("mape")
        return float(v) if v is not None else float("inf")

    @property
    def coverage(self) -> float:
        v = self.metrics.get("coverage")
        return float(v) if v is not None else 0.0


def _rank_key(v: VariantResult, *, min_coverage: float, coverage_weight: float) -> Tuple[float, float, float]:
    """
    Lower is better.
    Penalize if coverage below gate.
    """
    penalty = 0.0
    if min_coverage > 0 and v.coverage < min_coverage:
        penalty = (min_coverage - v.coverage) * float(coverage_weight) * 1000.0
    return (v.mape + penalty, v.mae + penalty, -v.coverage)


def main() -> int:
    args = _parse_args()
    py = os.sys.executable
    base = Path(__file__).resolve().parent
    preprocess_py = base / "prophet_preprocess.py"
    tune_py = base / "tune_prophet.py"
    train_py = base / "train_and_save_prophet.py"

    input_csv = Path(args.input).resolve()
    if not input_csv.exists():
        raise SystemExit(f"Input not found: {input_csv}")

    # Branch id from CSV
    import pandas as pd

    df0 = pd.read_csv(input_csv, usecols=["branch_id"])
    if df0.empty:
        raise SystemExit("Input CSV has no rows.")
    branch_id = int(df0["branch_id"].iloc[0])

    variants = [
        ("cal_only_month", True, False),
        ("cal_only_no_month", False, False),
        ("ops_month", True, True),
        ("ops_no_month", False, True),
    ]

    # Output dirs under new_method/train/prophet/*
    out_data_dir = base / "prophet" / "data"
    out_tune_dir = base / "prophet" / "tuning"
    out_data_dir.mkdir(parents=True, exist_ok=True)
    out_tune_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 90)
    print("Prophet new_method: train ALL variants and save to DB")
    print(f"Input: {input_csv}")
    print(f"Branch: {branch_id}")
    print(f"Target: {args.target}")
    print(f"Mode: {'COMMIT' if args.commit else 'DRY-RUN'}")
    print("=" * 90)

    results: List[VariantResult] = []
    for name, include_month, use_ops in variants:
        # 1) preprocess -> prophet_csv
        preprocess_args = [
            "--input",
            str(input_csv),
            "--target",
            str(args.target),
            "--outdir",
            str(out_data_dir),
        ]
        if use_ops:
            preprocess_args.append("--use-operational-regressors")
        if not include_month:
            preprocess_args.append("--drop-month")
        _run_script(py, preprocess_py, preprocess_args)
        prophet_csv = out_data_dir / f"{input_csv.stem}_prophet.csv"
        if not prophet_csv.exists():
            raise RuntimeError(f"Expected prophet csv not found: {prophet_csv}")

        # 2) tune -> tuning_csv
        tuning_csv = out_tune_dir / f"tuning_{input_csv.stem}_{name}.csv"
        tune_args = [
            "--input",
            str(prophet_csv),
            "--horizon",
            str(int(args.horizon)),
            "--interval-width",
            str(float(args.interval_width)),
            "--out",
            str(tuning_csv),
        ]
        if str(args.interval_width_grid).strip():
            tune_args.extend(["--interval-width-grid", str(args.interval_width_grid).strip()])
        if float(args.min_coverage) > 0:
            tune_args.extend(
                ["--min-coverage", str(float(args.min_coverage)), "--coverage-weight", str(float(args.coverage_weight))]
            )
        _run_script(py, tune_py, tune_args)

        # 3) train -> model + metrics JSON (prints JSON)
        outname = f"branch_{branch_id}_{args.target}_{name}"
        train_args = [
            "--input",
            str(prophet_csv),
            "--horizon",
            str(int(args.horizon)),
            "--future-periods",
            str(int(args.future_periods)),
            "--interval-width",
            str(float(args.interval_width)),
            "--from-tuning",
            str(tuning_csv),
            "--outname",
            outname,
        ]
        train_out = _run_script(py, train_py, train_args)
        payload = _parse_last_json(train_out)

        model_path = Path(payload["model"]).resolve()
        if not model_path.exists():
            raise RuntimeError(f"Model not found: {model_path}")

        # Metrics are printed inline; we also have report JSON path
        metrics = payload.get("metrics") or {}
        regressors = list((metrics.get("regressors") or []))

        results.append(
            VariantResult(
                name=name,
                include_month=include_month,
                use_operational_regressors=use_ops,
                prophet_csv=prophet_csv,
                tuning_csv=tuning_csv,
                model_path=model_path,
                metrics=metrics,
                regressors=regressors,
            )
        )

        print(
            f"{name}: mape={metrics.get('mape')} | mae={metrics.get('mae')} | coverage={metrics.get('coverage')} | regs={len(regressors)}"
        )

    best = sorted(results, key=lambda r: _rank_key(r, min_coverage=float(args.min_coverage), coverage_weight=float(args.coverage_weight)))[0]
    print(f"\nBEST variant: {best.name} (MAPE={best.metrics.get('mape')}, MAE={best.metrics.get('mae')}, coverage={best.metrics.get('coverage')})")

    # Explicit quality summary (for terminal logs)
    try:
        print("\n=== PROPHET NEW_METHOD QUALITY SUMMARY ===")
        for v in sorted(variants, key=lambda x: (x.metrics.get("mape") is None, x.metrics.get("mape") or 1e18)):
            m = v.metrics or {}
            print(
                f"- variant={v.name} | mape={m.get('mape')} | mae={m.get('mae')} | rmse={m.get('rmse')} "
                f"| coverage={m.get('coverage')} | test_samples={m.get('test_samples')}"
            )
        print(f"BEST by (lowest MAPE): {best.name}")
        print("=========================================")
    except Exception:
        pass

    if not args.commit:
        print("\nDRY-RUN complete. No DB writes.")
        return 0

    db = _connect_db(args.database)
    try:
        model_name = f"{args.model_name_prefix}{args.target}_branch_{branch_id}"
        # Deactivate all prior variants for this name
        db.execute_query("UPDATE ml_models SET is_active = FALSE WHERE model_name = %s", (model_name,), fetch=False)

        now = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        saved: Dict[str, int] = {}

        from joblib import load

        # Save only BEST by default (1 model per branch), unless --save-all is set
        to_save = results if bool(args.save_all) else [best]
        for r in to_save:
            bundle = load(r.model_path)
            model_obj = bundle["model"]
            cfg = bundle.get("config") or {}
            regressors = list(bundle.get("regressors") or r.regressors or [])

            # Compute date_range + samples from prophet_csv
            dfp = pd.read_csv(r.prophet_csv)
            dfp["ds"] = pd.to_datetime(dfp["ds"], errors="coerce")
            dfp = dfp.dropna(subset=["ds"]).sort_values("ds")
            dr = {"start": str(dfp["ds"].min().date()), "end": str(dfp["ds"].max().date())}

            metadata = {
                "source": "new_method",
                "algorithm": "PROPHET",
                "target_metric": str(args.target),
                "variant": {
                    "name": r.name,
                    "include_month": bool(r.include_month),
                    "use_operational_regressors": bool(r.use_operational_regressors),
                },
                # new_method uses 0-6 for day_of_week
                "day_of_week_format": "0-6",
                # Prophet config (new_method tuning)
                "seasonality_mode": cfg.get("seasonality_mode"),
                "changepoint_prior_scale": cfg.get("changepoint_prior_scale"),
                "seasonality_prior_scale": cfg.get("seasonality_prior_scale"),
                "changepoint_range": cfg.get("changepoint_range"),
                "interval_width": cfg.get("interval_width"),
                # Regressors used during training
                "use_external_regressors": True if len(regressors) > 0 else False,
                "external_regressors": regressors,
                "training_samples": int(len(dfp)),
                "date_range": dr,
                "evaluation_metrics": {
                    "mae": r.metrics.get("mae"),
                    "mape": r.metrics.get("mape"),
                    "rmse": r.metrics.get("rmse"),
                    "smape": r.metrics.get("smape"),
                    "coverage": r.metrics.get("coverage"),
                    "rows_train": r.metrics.get("rows_train"),
                    "rows_test": r.metrics.get("rows_test"),
                    "horizon": r.metrics.get("horizon"),
                },
            }

            version = f"{args.model_version_prefix}-{r.name}-{now}"
            is_active = True if not bool(args.save_all) else (r.name == best.name)
            mid = _save_forecast_model_to_db(
                db=db,
                model_name=model_name,
                model_version=version,
                created_by=args.created_by,
                model_obj=model_obj,
                metadata=metadata,
                is_active=is_active,
            )
            saved[r.name] = mid

        print("\n✅ Saved Prophet to DB:")
        for name, mid in saved.items():
            suffix = " (BEST/ACTIVE)" if (bool(args.save_all) and name == best.name) or (not bool(args.save_all)) else ""
            print(f" - {name}: id={mid}{suffix}")
        print(f"Model name used (new_method): {model_name}")
        if bool(args.save_all):
            print("Note: saved ALL variants (debug).")
        else:
            print("Note: saved ONLY the best variant (1 model per branch).")
        print("Note: this does not overwrite production forecast model_name.")
        return 0
    finally:
        db.disconnect()


if __name__ == "__main__":
    raise SystemExit(main())


