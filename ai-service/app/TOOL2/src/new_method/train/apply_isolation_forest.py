"""
FINAL - Apply a saved IsolationForest model bundle to a CSV and export anomaly results.

This works with model bundles produced by:
- final/train/run_isolation_forest_pipeline.py  (model saved under final/train/pipeline/<group>/..._model.joblib)

Usage (from project root):
  python .\\final\\train\\apply_isolation_forest.py ^
    --model .\\final\\train\\pipeline\\a\\branch_1_model.joblib ^
    --input .\\final\\data\\branch_1.csv

Output:
  final/train/anomalies/<input_stem>_anomalies.csv
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import List


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True, help="Path to .joblib model bundle")
    parser.add_argument("--input", required=True, help="CSV to score")
    parser.add_argument("--out", default="", help="Output CSV path (optional)")
    parser.add_argument(
        "--keep-cols",
        default="transaction_date,branch_id,total_revenue,order_count,avg_prep_time,avg_review_score,waste_cost,total_cost",
        help="Comma-separated columns to keep in output if present.",
    )
    args = parser.parse_args()

    try:
        import pandas as pd
        from joblib import load
    except Exception as e:  # pragma: no cover
        raise SystemExit("Missing deps. Install: `pip install pandas joblib scikit-learn`") from e

    model_path = Path(args.model).resolve()
    in_path = Path(args.input).resolve()
    if not model_path.exists():
        raise SystemExit(f"Model not found: {model_path}")
    if not in_path.exists():
        raise SystemExit(f"Input not found: {in_path}")

    bundle = load(model_path)
    scaler = bundle["scaler"]
    model = bundle["model"]
    feature_cols: List[str] = list(bundle["feature_cols"])
    drop_cols: List[str] = list(bundle.get("drop_cols", []))

    df = pd.read_csv(in_path)
    if "transaction_date" in df.columns:
        df["transaction_date"] = pd.to_datetime(df["transaction_date"], errors="coerce")
        df = df.dropna(subset=["transaction_date"]).sort_values("transaction_date").reset_index(drop=True)

    X_df = df.copy()
    for c in drop_cols:
        if c in X_df.columns:
            X_df = X_df.drop(columns=[c])
    for c in feature_cols:
        if c not in X_df.columns:
            X_df[c] = 0.0
    X_df = X_df[feature_cols].apply(pd.to_numeric, errors="coerce").fillna(0.0)

    Xs = scaler.transform(X_df.values)
    pred = model.predict(Xs)  # -1 anomaly, 1 normal
    scores = model.score_samples(Xs)  # higher = more normal

    out = pd.DataFrame({"anomaly": (pred == -1).astype(int), "score": scores})

    keep = [c.strip() for c in args.keep_cols.split(",") if c.strip()]
    for c in keep:
        if c in df.columns:
            out[c] = df[c].values

    if "transaction_date" in out.columns:
        cols = list(out.columns)
        cols = ["transaction_date"] + [c for c in cols if c != "transaction_date"]
        out = out[cols]

    out_dir = (Path(__file__).resolve().parent / "anomalies").resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = Path(args.out).resolve() if args.out else (out_dir / f"{in_path.stem}_anomalies.csv")
    out.to_csv(out_path, index=False)

    n = len(out)
    n_anom = int(out["anomaly"].sum()) if n else 0
    print(f"Wrote: {out_path}")
    print(f"Rows: {n} | anomalies: {n_anom} ({(n_anom/n) if n else 0:.3f})")
    if "transaction_date" in out.columns and n_anom:
        top = out.sort_values("score").head(min(10, n_anom))
        dates = []
        for d in top["transaction_date"].tolist():
            dates.append(d.strftime("%Y-%m-%d") if hasattr(d, "strftime") else str(d))
        print(f"Top anomaly dates (lowest score): {dates}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


