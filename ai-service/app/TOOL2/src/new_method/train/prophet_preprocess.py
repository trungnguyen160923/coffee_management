"""
FINAL - Prepare Prophet-ready data from a single branch CSV.

Input:  final/data/branch_1.csv (or any branch CSV with transaction_date + metrics)
Uses:   final/Preprocess/preprocess_for_training.py (reuse existing cleaning + feature engineering)

Output:
  final/train/prophet/data/<stem>_prophet.csv
  Columns: ds, y, plus regressors (calendar + optional operational)
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


def _import_final_preprocess():
    final_dir = Path(__file__).resolve().parent.parent
    preprocess_dir = final_dir / "Preprocess"
    sys.path.insert(0, str(preprocess_dir))
    import preprocess_for_training as pft  # type: ignore

    return pft


def _build_prophet_frame(df, *, target: str, use_operational_regressors: bool, include_month: bool):
    import pandas as pd

    out = pd.DataFrame(
        {
            "ds": pd.to_datetime(df["transaction_date"], errors="coerce"),
            "y": pd.to_numeric(df[target], errors="coerce"),
        }
    )
    out = out.dropna(subset=["ds", "y"]).sort_values("ds").reset_index(drop=True)

    # Calendar regressors (available for future)
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
            # IMPORTANT: do not include the target itself as a regressor (leakage)
            "order_count",
            "avg_review_score",
        ]
        # Align by index (preprocess returns sorted df)
        for c in cand:
            if c == target:
                continue
            if c in df.columns:
                out[c] = pd.to_numeric(df.loc[out.index, c], errors="coerce").fillna(0.0)

    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Branch CSV file, e.g. final/data/branch_1.csv")
    parser.add_argument("--target", default="total_revenue", help="Target y column, e.g. total_revenue or order_count")
    parser.add_argument("--use-operational-regressors", action="store_true")
    parser.add_argument("--drop-month", action="store_true")
    parser.add_argument("--outdir", default="", help="Output directory (default: final/train/prophet/data)")
    args = parser.parse_args()

    in_path = Path(args.input).resolve()
    if not in_path.exists():
        raise SystemExit(f"Input not found: {in_path}")

    pft = _import_final_preprocess()
    df = pft.preprocess_branch_csv(str(in_path))

    out_dir = Path(args.outdir).resolve() if args.outdir else (Path(__file__).resolve().parent / "prophet" / "data")
    out_dir.mkdir(parents=True, exist_ok=True)

    prophet_df = _build_prophet_frame(
        df,
        target=args.target,
        use_operational_regressors=bool(args.use_operational_regressors),
        include_month=not bool(args.drop_month),
    )
    out_path = out_dir / f"{in_path.stem}_prophet.csv"
    prophet_df.to_csv(out_path, index=False)
    print(f"Wrote: {out_path}")
    print(f"Rows: {len(prophet_df)} | cols: {len(prophet_df.columns)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


