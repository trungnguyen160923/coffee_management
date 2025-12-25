"""
FINAL - Apply a saved Prophet model to a branch CSV and export forecast.

This works with models produced by:
- final/train/run_prophet_pipeline.py (saved under final/train/models/prophet/<name>.joblib)

Usage (from project root):
  python .\\final\\train\\apply_prophet.py ^
    --model .\\final\\train\\models\\prophet\\branch_1.joblib ^
    --input .\\final\\data\\branch_1.csv ^
    --target total_revenue ^
    --future-periods 30

Output:
  final/train/prophet/apply/<name>_forecast.csv
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import List


def _import_final_preprocess():
    final_dir = Path(__file__).resolve().parent.parent
    preprocess_dir = final_dir / "Preprocess"
    sys.path.insert(0, str(preprocess_dir))
    import preprocess_for_training as pft  # type: ignore

    return pft


def _build_prophet_frame(df, *, target: str, include_month: bool, use_operational_regressors: bool):
    import pandas as pd

    out = pd.DataFrame(
        {
            "ds": pd.to_datetime(df["transaction_date"], errors="coerce"),
            "y": pd.to_numeric(df[target], errors="coerce"),
        }
    )
    out = out.dropna(subset=["ds", "y"]).sort_values("ds").reset_index(drop=True)

    out["is_weekend"] = out["ds"].dt.dayofweek.isin([5, 6]).astype(int)
    out["day_of_week"] = out["ds"].dt.dayofweek.astype(int)
    if include_month:
        out["month"] = out["ds"].dt.month.astype(int)

    if use_operational_regressors:
        cand = [
            "staff_count",
            "avg_prep_time",
            "new_ratio",
            "waste_ratio",
            "product_diversity_score",
            "peak_hour",
            "order_count",
            "avg_review_score",
        ]
        for c in cand:
            if c in df.columns:
                out[c] = pd.to_numeric(df.loc[out.index, c], errors="coerce").fillna(0.0)

    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True, help="Path to saved Prophet joblib model")
    parser.add_argument("--input", required=True, help="Branch CSV file (final/data/branch_1.csv)")
    parser.add_argument("--target", default="total_revenue")
    parser.add_argument("--future-periods", type=int, default=30)
    parser.add_argument("--drop-month", action="store_true")
    parser.add_argument("--use-operational-regressors", action="store_true")
    parser.add_argument("--out", default="", help="Output forecast CSV path (optional)")
    args = parser.parse_args()

    try:
        import pandas as pd
        from joblib import load
    except Exception as e:  # pragma: no cover
        raise SystemExit("Missing deps. Install: `pip install pandas joblib prophet`") from e

    model_path = Path(args.model).resolve()
    in_path = Path(args.input).resolve()
    if not model_path.exists():
        raise SystemExit(f"Model not found: {model_path}")
    if not in_path.exists():
        raise SystemExit(f"Input not found: {in_path}")

    bundle = load(model_path)
    model = bundle["model"]
    regressors: List[str] = list(bundle.get("regressors", []))

    pft = _import_final_preprocess()
    raw = pft.preprocess_branch_csv(str(in_path))

    hist = _build_prophet_frame(
        raw,
        target=args.target,
        include_month=not bool(args.drop_month),
        use_operational_regressors=bool(args.use_operational_regressors),
    )

    # Ensure we use the same regressors the model was trained with (if any)
    regs = [c for c in regressors if c in hist.columns]

    last_date = hist["ds"].max()
    future_dates = pd.date_range(last_date, periods=int(args.future_periods) + 1, freq="D")[1:]
    future = pd.DataFrame({"ds": pd.concat([hist["ds"], pd.Series(future_dates)], ignore_index=True)})

    hist_regs = hist[["ds"] + regs].copy() if regs else hist[["ds"]].copy()
    future = future.merge(hist_regs, on="ds", how="left")

    # Fill calendar regressors if used
    if "is_weekend" in regs:
        future["is_weekend"] = future["ds"].dt.dayofweek.isin([5, 6]).astype(int)
    if "day_of_week" in regs:
        future["day_of_week"] = future["ds"].dt.dayofweek.astype(int)
    if "month" in regs:
        future["month"] = future["ds"].dt.month.astype(int)

    # Forward fill operational regressors
    for r in regs:
        if r in ("is_weekend", "day_of_week", "month"):
            continue
        future[r] = pd.to_numeric(future[r], errors="coerce").ffill().fillna(0.0)

    fc = model.predict(future[["ds"] + regs])
    out_fc = fc[["ds", "yhat", "yhat_lower", "yhat_upper"]].copy()

    out_dir = (Path(__file__).resolve().parent / "prophet" / "apply").resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = Path(args.out).resolve() if args.out else (out_dir / f"{model_path.stem}_forecast.csv")
    out_fc.to_csv(out_path, index=False)

    print(json.dumps({"model": str(model_path), "input": str(in_path), "forecast": str(out_path), "rows": int(len(out_fc))}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


