"""
Preprocess branch-level daily dataset before training.

Input (default):
  ../output/coffee-shop-sales-summary-by-branch.csv

Outputs (default folder):
  ../output/ml/
    - dataset.csv                                  (train-ready table with engineered features)
    - isolation_forest/branch_<id>.csv             (optional: per-branch anomaly dataset)
    - prophet/branch_<id>.csv                      (optional: per-branch Prophet dataset with ds,y)
  Optional (if --split):
    - train.csv / test.csv                         (time-based split)
  Optional (if --with-sklearn):
    - train_X.npz / test_X.npz                     (numpy arrays for ML)
    - train_y.csv / test_y.csv                     (targets)
    - feature_names.txt                            (final feature names after encoding)
    - preprocessor.joblib                          (sklearn transformer to reuse in training/inference)

Notes:
- By default this script ONLY prepares a clean, feature-engineered dataset for training.
- If you want a split: use --split (default: last 30 days per branch go to test,
  or use --cutoff-date for a global split).
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import List, Optional, Tuple


DEFAULT_TARGET = "total_revenue"


def _default_input() -> Path:
    here = Path(__file__).resolve()
    base = here.parent.parent
    for p in [
        base / "output" / "coffee-shop-sales-summary-by-branch.csv",
        base / "out_put" / "coffee-shop-sales-summary-by-branch.csv",
    ]:
        if p.exists():
            return p
    return base / "output" / "coffee-shop-sales-summary-by-branch.csv"


def _ensure_cols(df, cols: List[str]) -> None:
    missing = [c for c in cols if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")


def _add_features(df):
    import numpy as np
    import pandas as pd

    df = df.copy()
    df["transaction_date"] = pd.to_datetime(df["transaction_date"], errors="coerce")
    df = df.dropna(subset=["transaction_date"])

    # Map column names from DB schema to expected names
    if "avg_preparation_time_seconds" in df.columns and "avg_prep_time" not in df.columns:
        df["avg_prep_time"] = df["avg_preparation_time_seconds"]
    
    # Ensure dtypes
    int_cols = [
        "branch_id",
        "order_count",
        "customer_count",
        "new_customers",
        "repeat_customers",
        "peak_hour",
        "day_of_week",
        "is_weekend",
        "unique_products_sold",
        "staff_count",
    ]
    for c in int_cols:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0).astype(int)
    
    # Handle missing staff_count (not in DB schema)
    if "staff_count" not in df.columns:
        # Default to 1 to avoid division by zero, or calculate from other metrics if available
        df["staff_count"] = 1

    float_cols = [
        "total_revenue",
        "avg_order_value",
        "product_diversity_score",
        "avg_prep_time",
        "avg_review_score",
        "total_cost",
        "waste_cost",
        "material_cost",
        "waste_percentage",
    ]
    for c in float_cols:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0.0).astype(float)

    # Handle missing cost columns: derive from material_cost if available
    if "total_cost" not in df.columns:
        if "material_cost" in df.columns:
            df["total_cost"] = df["material_cost"].fillna(0.0)
        else:
            df["total_cost"] = 0.0
    
    if "waste_cost" not in df.columns:
        if "material_cost" in df.columns and "waste_percentage" in df.columns:
            # waste_cost = material_cost * waste_percentage
            df["waste_cost"] = (df["material_cost"] * df["waste_percentage"]).fillna(0.0)
        else:
            df["waste_cost"] = 0.0

    # Basic ratios / margins
    df["gross_profit"] = df["total_revenue"] - df["total_cost"]
    df["gross_margin"] = np.where(df["total_revenue"] > 0, df["gross_profit"] / df["total_revenue"], 0.0)
    df["waste_ratio"] = np.where(df["total_cost"] > 0, df["waste_cost"] / df["total_cost"], 0.0)
    df["revenue_per_order"] = np.where(df["order_count"] > 0, df["total_revenue"] / df["order_count"], 0.0)
    df["new_ratio"] = np.where(df["customer_count"] > 0, df["new_customers"] / df["customer_count"], 0.0)
    df["repeat_ratio"] = np.where(df["customer_count"] > 0, df["repeat_customers"] / df["customer_count"], 0.0)
    df["orders_per_staff"] = np.where(df["staff_count"] > 0, df["order_count"] / df["staff_count"], 0.0)
    df["utilization"] = np.where(df["staff_count"] > 0, df["order_count"] / (df["staff_count"] * 35.0), 0.0)

    # Calendar features
    df["month"] = df["transaction_date"].dt.month.astype(int)
    df["day"] = df["transaction_date"].dt.day.astype(int)
    df["week_of_year"] = df["transaction_date"].dt.isocalendar().week.astype(int)
    df["quarter"] = df["transaction_date"].dt.quarter.astype(int)

    # Sort for time features
    df = df.sort_values(["branch_id", "transaction_date"]).reset_index(drop=True)

    # Lag / rolling features per branch (avoid leakage by shifting)
    group = df.groupby("branch_id", group_keys=False)
    for col in [
        "total_revenue",
        "order_count",
        "avg_prep_time",
        "avg_review_score",
        "waste_ratio",
        "new_ratio",
    ]:
        if col not in df.columns:
            continue
        df[f"{col}_lag1"] = group[col].shift(1)
        df[f"{col}_lag7"] = group[col].shift(7)
        df[f"{col}_roll7_mean"] = group[col].shift(1).rolling(7, min_periods=3).mean()
        df[f"{col}_roll7_std"] = group[col].shift(1).rolling(7, min_periods=3).std()

    # Fill NaNs created by lags/rolling
    lag_cols = [c for c in df.columns if "_lag" in c or "_roll" in c]
    for c in lag_cols:
        df[c] = df[c].fillna(0.0)

    # Clip ratios to sane bounds
    df["gross_margin"] = df["gross_margin"].clip(-1.0, 1.0)
    df["waste_ratio"] = df["waste_ratio"].clip(0.0, 1.0)
    df["new_ratio"] = df["new_ratio"].clip(0.0, 1.0)
    df["repeat_ratio"] = df["repeat_ratio"].clip(0.0, 1.0)

    return df


def preprocess_branch_csv(input_csv: str):
    """
    Convenience API for other scripts.

    Reads a branch-level CSV (e.g. output/branch_1.csv), applies the same cleaning + feature
    engineering used in this module, and returns a pandas DataFrame.
    
    Accepts both 'report_date' (from DB export) and 'transaction_date' (legacy) column names.
    """
    import pandas as pd

    df = pd.read_csv(input_csv)
    
    # Handle both report_date (DB-native) and transaction_date (legacy)
    if "report_date" in df.columns and "transaction_date" not in df.columns:
        df = df.rename(columns={"report_date": "transaction_date"})
    elif "transaction_date" not in df.columns:
        raise ValueError("CSV must contain either 'report_date' or 'transaction_date' column")
    
    _ensure_cols(df, ["transaction_date", "branch_id"])
    return _add_features(df)


def _time_split(
    df,
    *,
    cutoff_date: Optional[str],
    test_days_per_branch: int,
) -> Tuple:
    import pandas as pd

    if cutoff_date:
        cutoff = pd.to_datetime(cutoff_date)
        train = df[df["transaction_date"] < cutoff].copy()
        test = df[df["transaction_date"] >= cutoff].copy()
        return train, test

    # Default: last N days per branch
    def _split_one(g):
        g = g.sort_values("transaction_date")
        if len(g) <= test_days_per_branch:
            return g.iloc[:0], g
        return g.iloc[:-test_days_per_branch], g.iloc[-test_days_per_branch:]

    parts = [_split_one(g) for _, g in df.groupby("branch_id")]
    train = pd.concat([p[0] for p in parts], ignore_index=True)
    test = pd.concat([p[1] for p in parts], ignore_index=True)
    return train, test


def _export_prophet(
    df,
    *,
    out_dir: Path,
    target: str,
    fill_missing_dates: bool,
) -> None:
    """
    Prophet expects columns:
    - ds (datetime)
    - y  (float)
    Optional: extra regressors as additional numeric columns.

    We export one file per branch to keep Prophet training simple.
    """
    import pandas as pd

    prophet_dir = out_dir / "prophet"
    prophet_dir.mkdir(parents=True, exist_ok=True)

    # Regressors: keep a small, causal set (no leakage lags by default)
    candidate_regs = [
        "is_weekend",
        "day_of_week",
        "month",
        "staff_count",
        "avg_prep_time",
        "new_ratio",
        "waste_ratio",
        "product_diversity_score",
        "peak_hour",
    ]
    regs = [c for c in candidate_regs if c in df.columns]

    for bid, g in df.groupby("branch_id"):
        g = g.sort_values("transaction_date").copy()
        out = pd.DataFrame({"ds": g["transaction_date"], "y": g[target].astype(float)})
        for c in regs:
            out[c] = pd.to_numeric(g[c], errors="coerce").fillna(0.0)

        if fill_missing_dates:
            # Ensure daily frequency without gaps
            full = pd.date_range(out["ds"].min(), out["ds"].max(), freq="D")
            out = out.set_index("ds").reindex(full)
            out.index.name = "ds"
            out = out.reset_index()
            # If missing day exists, assume shop still "open" but unknown -> fill y/regressors with 0
            out["y"] = out["y"].fillna(0.0)
            for c in regs:
                out[c] = out[c].fillna(0.0)

        out_path = prophet_dir / f"branch_{int(bid)}.csv"
        out.to_csv(out_path, index=False)


def _export_isolation_forest(df, *, out_dir: Path) -> None:
    """
    Export per-branch anomaly datasets (keep transaction_date for mapping anomalies back to time).

    For IsolationForest you typically:
    - train per branch (recommended) OR keep branch_id as a category.
    - scale features (StandardScaler/RobustScaler) before fitting.
    """
    iso_dir = out_dir / "isolation_forest"
    iso_dir.mkdir(parents=True, exist_ok=True)

    # Keep a compact, useful feature set (avoid duplicate columns like revenue_per_order vs avg_order_value)
    preferred = [
        "transaction_date",
        "branch_id",
        "total_revenue",
        "order_count",
        "avg_order_value",
        "avg_prep_time",
        "avg_review_score",
        "staff_count",
        "utilization",
        "gross_margin",
        "waste_ratio",
        "new_ratio",
        "product_diversity_score",
        "unique_products_sold",
        "peak_hour",
        "day_of_week",
        "is_weekend",
    ]
    # Add lags/rolling (good for spotting sudden changes)
    preferred += [c for c in df.columns if c.endswith("_lag1") or c.endswith("_lag7") or c.endswith("_roll7_mean")]

    cols = [c for c in preferred if c in df.columns]

    for bid, g in df.groupby("branch_id"):
        out_path = iso_dir / f"branch_{int(bid)}.csv"
        g.sort_values("transaction_date")[cols].to_csv(out_path, index=False)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default=str(_default_input()), help="Input CSV path.")
    parser.add_argument(
        "--outdir",
        default="",
        help="Output directory (default: sibling output/ml/ next to input file).",
    )
    parser.add_argument("--target", default=DEFAULT_TARGET, help="Target column to predict.")
    parser.add_argument(
        "--export-prophet",
        action="store_true",
        help="Export per-branch Prophet-ready files (output/ml/prophet/branch_<id>.csv).",
    )
    parser.add_argument(
        "--export-isolation-forest",
        action="store_true",
        help="Export per-branch IsolationForest files (output/ml/isolation_forest/branch_<id>.csv).",
    )
    parser.add_argument(
        "--fill-missing-dates",
        action="store_true",
        help="(Prophet) Reindex to daily frequency and fill missing days with 0.",
    )
    parser.add_argument(
        "--split",
        action="store_true",
        help="Also create train.csv/test.csv using a time-based split.",
    )
    parser.add_argument(
        "--cutoff-date",
        default="",
        help="Global cutoff date (YYYY-MM-DD). If provided, overrides per-branch last-N split.",
    )
    parser.add_argument(
        "--test-days",
        type=int,
        default=30,
        help="If no cutoff-date, use last N days per branch as test.",
    )
    parser.add_argument(
        "--with-sklearn",
        action="store_true",
        help="Also export sklearn preprocessor + encoded arrays (npz) for training/inference reuse.",
    )
    args = parser.parse_args()

    import pandas as pd

    in_path = Path(args.input).resolve()
    if not in_path.exists():
        raise SystemExit(f"Input not found: {in_path}")

    out_dir = Path(args.outdir).resolve() if args.outdir else (in_path.parent / "ml").resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(in_path)
    _ensure_cols(df, ["transaction_date", "branch_id", "order_count", "total_revenue"])

    df = _add_features(df)

    if args.target not in df.columns:
        raise SystemExit(f"Target not found: {args.target}. Available columns: {list(df.columns)}")

    # Drop rows with invalid target
    df[args.target] = pd.to_numeric(df[args.target], errors="coerce")
    df = df.dropna(subset=[args.target])

    # Always write a single train-ready dataset table
    dataset_csv = out_dir / "dataset.csv"
    df.to_csv(dataset_csv, index=False)
    print(f"Wrote: {dataset_csv} (rows={len(df)})")

    # Optional exports for specific algorithms
    if args.export_isolation_forest:
        _export_isolation_forest(df, out_dir=out_dir)
        print(f"Wrote folder: {out_dir / 'isolation_forest'}")
    if args.export_prophet:
        _export_prophet(df, out_dir=out_dir, target=args.target, fill_missing_dates=bool(args.fill_missing_dates))
        print(f"Wrote folder: {out_dir / 'prophet'}")

    train_df = None
    test_df = None
    if args.split:
        train_df, test_df = _time_split(
            df,
            cutoff_date=args.cutoff_date.strip() or None,
            test_days_per_branch=int(args.test_days),
        )
        train_csv = out_dir / "train.csv"
        test_csv = out_dir / "test.csv"
        train_df.to_csv(train_csv, index=False)
        test_df.to_csv(test_csv, index=False)
        print(f"Wrote: {train_csv} (rows={len(train_df)})")
        print(f"Wrote: {test_csv}  (rows={len(test_df)})")

    if not args.with_sklearn:
        return 0

    # Build sklearn preprocessor: OneHot for categorical, scale numeric
    try:
        import numpy as np
        from joblib import dump
        from sklearn.compose import ColumnTransformer
        from sklearn.preprocessing import OneHotEncoder, StandardScaler
    except Exception:
        print("Skip sklearn outputs (missing sklearn/joblib). Run with --no-sklearn or install sklearn/joblib.")
        return 0

    # Use split if available; otherwise, fit on full dataset and export only train_X/train_y.
    if train_df is None or test_df is None:
        train_df = df
        test_df = df.iloc[:0].copy()

    # Features: exclude leakage columns + target
    drop_cols = {"transaction_date", args.target}
    X_cols = [c for c in train_df.columns if c not in drop_cols]

    # Categorical columns we want encoded
    cat_cols = [c for c in ["branch_id", "day_of_week", "is_weekend", "month", "quarter"] if c in X_cols]
    num_cols = [c for c in X_cols if c not in set(cat_cols)]

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols),
            ("num", StandardScaler(), num_cols),
        ],
        remainder="drop",
        sparse_threshold=0.3,
    )

    X_train = preprocessor.fit_transform(train_df[X_cols])
    X_test = preprocessor.transform(test_df[X_cols])

    y_train = train_df[args.target].to_numpy()
    y_test = test_df[args.target].to_numpy()

    # Feature names
    feature_names: List[str] = []
    try:
        cat_names = list(preprocessor.named_transformers_["cat"].get_feature_names_out(cat_cols))
        feature_names = cat_names + num_cols
    except Exception:
        feature_names = [f"f{i}" for i in range(X_train.shape[1])]

    # Persist
    dump(preprocessor, out_dir / "preprocessor.joblib")
    with open(out_dir / "feature_names.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(feature_names))

    # Save arrays
    np.savez_compressed(out_dir / "train_X.npz", X=X_train)
    np.savez_compressed(out_dir / "test_X.npz", X=X_test)
    pd.DataFrame({"y": y_train}).to_csv(out_dir / "train_y.csv", index=False)
    pd.DataFrame({"y": y_test}).to_csv(out_dir / "test_y.csv", index=False)

    print(f"Wrote: {out_dir / 'preprocessor.joblib'}")
    print(f"Wrote: {out_dir / 'train_X.npz'}, {out_dir / 'test_X.npz'}")
    print(f"Target: {args.target}")
    print(f"Features: {len(feature_names)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


