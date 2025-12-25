"""
FINAL - Train + save Prophet model and log reliability metrics.

Inputs:
- Prophet-ready CSV (ds,y + optional regressors)
- Optional tuning results CSV from final/train/tune_prophet.py (best config in first row)

Outputs (under final/train):
- models/prophet/<name>.joblib
- prophet/forecast/<name>_forecast.csv
- prophet/reports/<name>_metrics.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List


def _smape(y_true, y_pred) -> float:
    import numpy as np

    yt = np.asarray(y_true, dtype=float)
    yp = np.asarray(y_pred, dtype=float)
    denom = (np.abs(yt) + np.abs(yp)) / 2.0
    denom = np.where(denom == 0, 1.0, denom)
    return float(np.mean(np.abs(yt - yp) / denom))


def _mape(y_true, y_pred) -> float:
    import numpy as np

    yt = np.asarray(y_true, dtype=float)
    yp = np.asarray(y_pred, dtype=float)
    denom = np.where(yt == 0, 1.0, yt)
    return float(np.mean(np.abs((yt - yp) / denom)))


def _mae(y_true, y_pred) -> float:
    import numpy as np

    yt = np.asarray(y_true, dtype=float)
    yp = np.asarray(y_pred, dtype=float)
    return float(np.mean(np.abs(yt - yp)))


def _rmse(y_true, y_pred) -> float:
    import numpy as np

    yt = np.asarray(y_true, dtype=float)
    yp = np.asarray(y_pred, dtype=float)
    return float(np.sqrt(np.mean((yt - yp) ** 2)))


def _interval_coverage(y_true, yhat_lower, yhat_upper) -> float:
    import numpy as np

    yt = np.asarray(y_true, dtype=float)
    lo = np.asarray(yhat_lower, dtype=float)
    hi = np.asarray(yhat_upper, dtype=float)
    ok = (yt >= lo) & (yt <= hi)
    return float(np.mean(ok))


def _load_best_config(tuning_csv: Path) -> Dict[str, object]:
    import pandas as pd

    if not tuning_csv.exists():
        raise FileNotFoundError(f"Tuning file not found: {tuning_csv}")
    df = pd.read_csv(tuning_csv)
    if df.empty:
        raise ValueError(f"Empty tuning file: {tuning_csv}")
    return df.iloc[0].to_dict()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Prophet-ready CSV (ds,y + regressors)")
    parser.add_argument("--horizon", type=int, default=30)
    parser.add_argument("--future-periods", type=int, default=30)
    parser.add_argument("--interval-width", type=float, default=0.8)
    parser.add_argument("--from-tuning", default="")
    parser.add_argument("--outname", default="")
    args = parser.parse_args()

    try:
        import pandas as pd
        from joblib import dump
    except Exception as e:  # pragma: no cover
        raise SystemExit("Missing deps. Install: `pip install pandas joblib`") from e

    try:
        from prophet import Prophet
    except Exception as e:  # pragma: no cover
        raise SystemExit("Missing Prophet. Install: `pip install prophet`") from e

    in_path = Path(args.input).resolve()
    if not in_path.exists():
        raise SystemExit(f"Input not found: {in_path}")

    df = pd.read_csv(in_path)
    if "ds" not in df.columns or "y" not in df.columns:
        raise SystemExit("Input must contain columns: ds, y")

    df["ds"] = pd.to_datetime(df["ds"], errors="coerce")
    df["y"] = pd.to_numeric(df["y"], errors="coerce")
    df = df.dropna(subset=["ds", "y"]).sort_values("ds").reset_index(drop=True)

    regressors = [c for c in df.columns if c not in ("ds", "y")]

    cfg = {
        "changepoint_prior_scale": 0.1,
        "seasonality_prior_scale": 5.0,
        "seasonality_mode": "additive",
        "changepoint_range": 0.9,
        "interval_width": float(args.interval_width),
    }
    if args.from_tuning:
        best = _load_best_config(Path(args.from_tuning).resolve())
        for k in ["changepoint_prior_scale", "seasonality_prior_scale", "seasonality_mode", "changepoint_range", "interval_width"]:
            if k in best and best[k] == best[k]:
                cfg[k] = best[k]

    name = args.outname.strip() or in_path.stem

    base = Path(__file__).resolve().parent
    model_dir = base / "models" / "prophet"
    forecast_dir = base / "prophet" / "forecast"
    reports_dir = base / "prophet" / "reports"
    model_dir.mkdir(parents=True, exist_ok=True)
    forecast_dir.mkdir(parents=True, exist_ok=True)
    reports_dir.mkdir(parents=True, exist_ok=True)

    horizon = int(args.horizon)
    if len(df) < horizon + 20:
        horizon = max(1, min(30, len(df) // 4))

    train_df = df.iloc[:-horizon].copy() if horizon < len(df) else df.copy()
    test_df = df.iloc[-horizon:].copy() if horizon < len(df) else df.iloc[:0].copy()

    m = Prophet(
        interval_width=float(cfg["interval_width"]),
        changepoint_prior_scale=float(cfg["changepoint_prior_scale"]),
        seasonality_prior_scale=float(cfg["seasonality_prior_scale"]),
        seasonality_mode=str(cfg["seasonality_mode"]),
        changepoint_range=float(cfg["changepoint_range"]),
        weekly_seasonality=True,
        daily_seasonality=False,
        yearly_seasonality=False,
    )
    for r in regressors:
        m.add_regressor(r)
    m.fit(train_df)

    # Forecast on history + future
    last_date = df["ds"].max()
    future_dates = pd.date_range(last_date, periods=int(args.future_periods) + 1, freq="D")[1:]
    future = pd.DataFrame({"ds": pd.concat([df["ds"], pd.Series(future_dates)], ignore_index=True)})

    hist_regs = df[["ds"] + regressors].copy() if regressors else df[["ds"]].copy()
    future = future.merge(hist_regs, on="ds", how="left")

    # Fill calendar regressors
    if "is_weekend" in regressors:
        future["is_weekend"] = future["ds"].dt.dayofweek.isin([5, 6]).astype(int)
    if "day_of_week" in regressors:
        future["day_of_week"] = future["ds"].dt.dayofweek.astype(int)
    if "month" in regressors:
        future["month"] = future["ds"].dt.month.astype(int)
    # Operational regressors: forward fill
    for r in regressors:
        if r in ("is_weekend", "day_of_week", "month"):
            continue
        future[r] = pd.to_numeric(future[r], errors="coerce").ffill().fillna(0.0)

    fc = m.predict(future[["ds"] + regressors])

    metrics: Dict[str, object] = {
        "name": name,
        "rows_total": int(len(df)),
        "rows_train": int(len(train_df)),
        "rows_test": int(len(test_df)),
        "horizon": int(horizon),
        "config": {
            "changepoint_prior_scale": float(cfg["changepoint_prior_scale"]),
            "seasonality_prior_scale": float(cfg["seasonality_prior_scale"]),
            "seasonality_mode": str(cfg["seasonality_mode"]),
            "changepoint_range": float(cfg["changepoint_range"]),
            "interval_width": float(cfg["interval_width"]),
        },
        "regressors": regressors,
    }

    if len(test_df):
        test_fc = fc[fc["ds"].isin(test_df["ds"])].copy().sort_values("ds")
        y_true = test_df.sort_values("ds")["y"].values
        y_pred = test_fc["yhat"].values
        metrics.update(
            {
                "rmse": _rmse(y_true, y_pred),
                "mae": _mae(y_true, y_pred),
                "mape": _mape(y_true, y_pred),
                "smape": _smape(y_true, y_pred),
                "coverage": _interval_coverage(y_true, test_fc["yhat_lower"].values, test_fc["yhat_upper"].values),
            }
        )
    else:
        metrics.update({"rmse": None, "mae": None, "mape": None, "smape": None, "coverage": None})

    model_path = model_dir / f"{name}.joblib"
    dump({"model": m, "config": metrics["config"], "regressors": regressors}, model_path)

    forecast_path = forecast_dir / f"{name}_forecast.csv"
    fc[["ds", "yhat", "yhat_lower", "yhat_upper"]].to_csv(forecast_path, index=False)

    report_path = reports_dir / f"{name}_metrics.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, ensure_ascii=False, indent=2)

    print(json.dumps({"model": str(model_path), "forecast": str(forecast_path), "report": str(report_path), "metrics": metrics}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


