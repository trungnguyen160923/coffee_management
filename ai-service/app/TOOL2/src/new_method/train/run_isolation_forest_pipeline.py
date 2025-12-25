"""
FINAL - One-command Isolation Forest pipeline (per branch, per group).

You already have:
  - final/Preprocess/preprocess_for_training.py  (cleaning + feature engineering)
  - final/data/branch_1.csv, branch_2.csv, branch_3.csv (branch datasets)

This script:
1) Loads ONE branch CSV
2) Uses DB-native column names (from daily_branch_metrics export)
3) Selects a feature GROUP (A/B/C/D)
4) Tunes IsolationForest hyperparameters (grid) using pseudo-labels (IQR / pct_change)
5) Trains best model and saves:
   - processed train CSV
   - tuning CSV
   - model bundle (.joblib)
   - anomalies CSV (date, anomaly, score)

Run (from project root):
  python .\\final\\train\\run_isolation_forest_pipeline.py --input .\\final\\data\\branch_1.csv --group d
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Dict, List


def _u01(key: str) -> float:
    h = hashlib.sha256(key.encode("utf-8")).digest()
    n = int.from_bytes(h[:8], "big")
    return (n % (10**12)) / float(10**12)


def _clip_int(x: float, lo: int, hi: int) -> int:
    return max(lo, min(hi, int(round(x))))


def _iqr_labels(values, k: float) -> List[int]:
    import numpy as np

    x = np.asarray(values, dtype=float)
    if len(x) < 8:
        return [0] * len(x)
    q1 = float(np.nanpercentile(x, 25))
    q3 = float(np.nanpercentile(x, 75))
    iqr = q3 - q1
    if iqr == 0 or not (iqr == iqr):
        return [0] * len(x)
    lo = q1 - k * iqr
    hi = q3 + k * iqr
    return [1 if (v < lo or v > hi) else 0 for v in x]


def _pct_change(values) -> List[float]:
    import numpy as np

    x = np.asarray(values, dtype=float)
    if len(x) == 0:
        return []
    out = np.zeros(len(x), dtype=float)
    prev = x[:-1]
    curr = x[1:]
    denom = np.where(prev == 0, 1.0, prev)
    out[1:] = (curr - prev) / denom
    return out.tolist()


def _prf1(y_true, y_pred) -> Dict[str, float]:
    tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 1)
    fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 0 and yp == 1)
    fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 0)
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 0.0
    if precision + recall > 0:
        f1 = 2 * precision * recall / (precision + recall)
    return {"precision": float(precision), "recall": float(recall), "f1": float(f1)}


def _build_group_df(df, group: str):
    group = group.lower().strip()
    if group not in ("a", "b", "c", "d"):
        raise ValueError("group must be one of: a, b, c, d")

    if group == "a":
        cols = [
            "report_date",
            "branch_id",
            "total_revenue",
            "order_count",
            "avg_order_value",
            "peak_hour",
            "day_of_week",
            "is_weekend",
            "customer_count",
            "new_customers",
            "repeat_customers",
            "unique_products_sold",
            "product_diversity_score",
        ]
        return df[[c for c in cols if c in df.columns]].copy()

    if group == "b":
        cols = [
            "report_date",
            "branch_id",
            "avg_review_score",
            "avg_preparation_time_seconds",
            "order_count",
            "product_diversity_score",
            "peak_hour",
            "is_weekend",
            "day_of_week",
            "staff_efficiency_score",
        ]
        return df[[c for c in cols if c in df.columns]].copy()

    if group == "d":
        cols = [
            "report_date",
            "branch_id",
            "avg_preparation_time_seconds",
            "staff_efficiency_score",
            "order_count",
            "avg_review_score",
            "peak_hour",
            "is_weekend",
            "day_of_week",
        ]
        return df[[c for c in cols if c in df.columns]].copy()

    # group == "c"
    cols = [
        "report_date",
        "branch_id",
        "material_cost",
        "waste_percentage",
        "low_stock_products",
        "out_of_stock_products",
        "total_revenue",
        "order_count",
        "avg_order_value",
    ]
    return df[[c for c in cols if c in df.columns]].copy()


def _build_X(frame, drop_cols: List[str]):
    import numpy as np
    import pandas as pd

    keep_cols = [c for c in frame.columns if c not in set(drop_cols)]
    X = frame[keep_cols].copy()
    X = X.apply(pd.to_numeric, errors="coerce").fillna(0.0)
    return np.asarray(X, dtype=float), keep_cols


def _default_metric_for_group(group: str) -> str:
    group = group.lower().strip()
    if group == "a":
        return "total_revenue"
    if group == "b":
        return "avg_review_score"
    if group == "c":
        return "waste_percentage"
    return "avg_preparation_time_seconds"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Branch CSV file (e.g. final/data/branch_1.csv)")
    parser.add_argument("--group", required=True, choices=["a", "b", "c", "d"], help="Feature group to train.")
    parser.add_argument("--metric", default="", help="Metric for pseudo labels (default depends on group).")
    parser.add_argument("--iqr-k", type=float, default=1.5, help="IQR multiplier.")
    parser.add_argument(
        "--label-mode",
        default="iqr_then_pct_change",
        choices=["iqr", "pct_change", "iqr_then_pct_change"],
        help="Pseudo-label mode for tuning.",
    )
    parser.add_argument("--drop-cols", default="report_date,branch_id", help="Columns to drop from X.")

    # Grid for tuning
    parser.add_argument("--n-estimators", default="200,300,500")
    parser.add_argument("--contamination", default="0.02,0.05,0.08")
    parser.add_argument("--max-samples", default="auto,0.6,0.8")
    parser.add_argument("--max-features", default="0.7,1.0")
    parser.add_argument("--bootstrap", default="false")
    parser.add_argument("--random-state", type=int, default=42)

    parser.add_argument("--outdir", default="", help="Base output dir (default: final/train/pipeline/<group>/)")
    args = parser.parse_args()

    try:
        import numpy as np
        import pandas as pd
        from joblib import dump
        from sklearn.ensemble import IsolationForest
        from sklearn.preprocessing import RobustScaler
    except Exception as e:  # pragma: no cover
        raise SystemExit("Missing deps. Install: `pip install scikit-learn pandas numpy joblib`") from e

    in_path = Path(args.input).resolve()
    if not in_path.exists():
        raise SystemExit(f"Input not found: {in_path}")

    df = pd.read_csv(in_path)
    if "report_date" not in df.columns:
        raise SystemExit("Input CSV must contain `report_date` (DB-native).")
    df["report_date"] = pd.to_datetime(df["report_date"], errors="coerce")
    df = df.dropna(subset=["report_date"]).sort_values("report_date").reset_index(drop=True)
    
    gdf = _build_group_df(df.copy(), args.group)
    # Coerce numeric for model input
    for c in gdf.columns:
        if c in ("report_date", "branch_id"):
            continue
        gdf[c] = pd.to_numeric(gdf[c], errors="coerce").fillna(0.0)

    metric = args.metric.strip() or _default_metric_for_group(args.group)
    if metric not in gdf.columns:
        raise SystemExit(f"Metric {metric!r} not found in selected group columns: {list(gdf.columns)}")

    drop_cols = [c.strip() for c in args.drop_cols.split(",") if c.strip()]
    X, feature_cols = _build_X(gdf, drop_cols=drop_cols)
    scaler = RobustScaler()
    Xs = scaler.fit_transform(X)

    def _parse_list(s: str) -> List[str]:
        return [p.strip() for p in str(s).split(",") if p.strip()]

    n_estimators_list = [int(x) for x in _parse_list(args.n_estimators)]
    contamination_list = [float(x) for x in _parse_list(args.contamination)]
    max_features_list = [float(x) for x in _parse_list(args.max_features)]
    max_samples_list: List[object] = []
    for x in _parse_list(args.max_samples):
        max_samples_list.append("auto" if x.lower() == "auto" else float(x))
    bootstrap = _parse_list(args.bootstrap)[0].lower() in ("true", "1", "yes") if _parse_list(args.bootstrap) else False

    mv = gdf[metric].values
    if args.label_mode == "iqr":
        y_true = _iqr_labels(mv, float(args.iqr_k))
        label_mode_used = f"iqr({metric})"
    elif args.label_mode == "pct_change":
        y_true = _iqr_labels(_pct_change(mv), float(args.iqr_k))
        label_mode_used = f"iqr(pct_change({metric}))"
    else:
        y_true = _iqr_labels(mv, float(args.iqr_k))
        label_mode_used = f"iqr({metric})"
        if sum(y_true) == 0:
            y_true = _iqr_labels(_pct_change(mv), float(args.iqr_k))
            label_mode_used = f"iqr(pct_change({metric}))"

    best = None
    tuning_rows: List[Dict[str, object]] = []

    for ne in n_estimators_list:
        for cont in contamination_list:
            for ms in max_samples_list:
                for mf in max_features_list:
                    model = IsolationForest(
                        n_estimators=int(ne),
                        contamination=float(cont),
                        max_samples=ms,
                        max_features=float(mf),
                        bootstrap=bool(bootstrap),
                        random_state=int(args.random_state),
                        n_jobs=-1,
                    )
                    pred = model.fit_predict(Xs)
                    scores = model.score_samples(Xs)
                    y_pred = [1 if v == -1 else 0 for v in pred]

                    anom_scores = [s for s, yp in zip(scores, y_pred) if yp == 1]
                    norm_scores = [s for s, yp in zip(scores, y_pred) if yp == 0]
                    sep = 0.0
                    if len(scores) > 1 and np.std(scores) > 0 and anom_scores and norm_scores:
                        sep = float((np.mean(norm_scores) - np.mean(anom_scores)) / np.std(scores))

                    prf = _prf1(y_true, y_pred) if sum(y_true) > 0 else {"precision": 0.0, "recall": 0.0, "f1": 0.0}

                    row = {
                        "metric": metric,
                        "label_mode": label_mode_used,
                        "n_estimators": ne,
                        "contamination": cont,
                        "max_samples": ms,
                        "max_features": mf,
                        "bootstrap": bool(bootstrap),
                        "label_anomaly_rate": (sum(y_true) / len(y_true)) if len(y_true) else 0.0,
                        "pred_anomaly_rate": (sum(y_pred) / len(y_pred)) if len(y_pred) else 0.0,
                        "pseudo_f1": prf["f1"],
                        "pseudo_precision": prf["precision"],
                        "pseudo_recall": prf["recall"],
                        "score_separation_z": sep,
                    }
                    tuning_rows.append(row)

                    if sum(y_true) > 0:
                        key = (row["pseudo_f1"], row["score_separation_z"])
                    else:
                        key = (row["score_separation_z"], -abs(row["pred_anomaly_rate"] - cont))
                    if best is None or key > best[0]:
                        best = (key, row)

    if best is None:
        raise SystemExit("No tuning results produced.")

    best_row = best[1]
    best_params = {
        "n_estimators": int(best_row["n_estimators"]),
        "contamination": float(best_row["contamination"]),
        "max_samples": best_row["max_samples"],
        "max_features": float(best_row["max_features"]),
        "bootstrap": bool(best_row["bootstrap"]),
    }

    final = IsolationForest(
        n_estimators=int(best_params["n_estimators"]),
        contamination=float(best_params["contamination"]),
        max_samples=best_params["max_samples"],
        max_features=float(best_params["max_features"]),
        bootstrap=bool(best_params["bootstrap"]),
        random_state=int(args.random_state),
        n_jobs=-1,
    )
    pred = final.fit_predict(Xs)
    scores = final.score_samples(Xs)

    out_base = Path(args.outdir).resolve() if args.outdir else (Path(__file__).resolve().parent / "pipeline" / args.group).resolve()
    out_base.mkdir(parents=True, exist_ok=True)

    processed_csv = out_base / f"{in_path.stem}_processed_group_{args.group}.csv"
    tuning_csv = out_base / f"{in_path.stem}_tuning.csv"
    model_path = out_base / f"{in_path.stem}_model.joblib"
    anomalies_csv = out_base / f"{in_path.stem}_anomalies.csv"

    gdf.to_csv(processed_csv, index=False)
    import pandas as pd

    pd.DataFrame(tuning_rows).sort_values(["pseudo_f1", "score_separation_z"], ascending=[False, False]).to_csv(tuning_csv, index=False)

    bundle = {
        "scaler": scaler,
        "model": final,
        "feature_cols": feature_cols,
        "drop_cols": drop_cols,
        "group": args.group,
        "metric_for_eval": metric,
        "label_mode": label_mode_used,
        "best_params": best_params,
        "random_state": int(args.random_state),
    }
    dump(bundle, model_path)

    out = pd.DataFrame(
        {
            "report_date": gdf["report_date"] if "report_date" in gdf.columns else None,
            "anomaly": (pred == -1).astype(int),
            "score": scores,
            metric: gdf[metric].astype(float),
        }
    )
    out = out.dropna(axis=1, how="all")
    out.to_csv(anomalies_csv, index=False)

    print(
        json.dumps(
            {
                "input": str(in_path),
                "group": args.group,
                "metric": metric,
                "label_mode": label_mode_used,
                "best_params": best_params,
                "paths": {
                    "processed_csv": str(processed_csv),
                    "tuning_csv": str(tuning_csv),
                    "model": str(model_path),
                    "anomalies_csv": str(anomalies_csv),
                },
                "pred_anomaly_rate": float((pred == -1).mean()) if len(pred) else 0.0,
                "label_anomaly_rate": float(sum(y_true) / len(y_true)) if len(y_true) else 0.0,
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


