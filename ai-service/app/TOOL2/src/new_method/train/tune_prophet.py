"""
FINAL - Tune Prophet hyperparameters on a Prophet-ready CSV (ds,y + regressors).

Uses time-based holdout:
- Train: all but last N days
- Validate: last N days

Adds an objective that can penalize low coverage (interval reliability).
"""

from __future__ import annotations

import argparse
import itertools
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


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Prophet-ready CSV (ds,y + regressors)")
    parser.add_argument("--horizon", type=int, default=30)
    parser.add_argument("--interval-width", type=float, default=0.8)
    parser.add_argument("--interval-width-grid", default="", help="Optional grid: 0.8,0.9,0.95")
    parser.add_argument("--min-coverage", type=float, default=0.0)
    parser.add_argument("--coverage-weight", type=float, default=2.0)

    parser.add_argument("--changepoint-prior-scale", default="0.05,0.1,0.2")
    parser.add_argument("--seasonality-prior-scale", default="1.0,5.0,10.0")
    parser.add_argument("--seasonality-mode", default="additive,multiplicative")
    parser.add_argument("--changepoint-range", default="0.8,0.9")

    parser.add_argument("--out", default="")
    args = parser.parse_args()

    try:
        import pandas as pd
    except Exception as e:  # pragma: no cover
        raise SystemExit("Missing pandas. Install: `pip install pandas`") from e

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

    horizon = int(args.horizon)
    if len(df) < horizon + 20:
        raise SystemExit(f"Not enough rows ({len(df)}) for horizon={horizon}")

    regressors = [c for c in df.columns if c not in ("ds", "y")]
    train_df = df.iloc[:-horizon].copy()
    test_df = df.iloc[-horizon:].copy()

    def _parse_list(s: str) -> List[str]:
        return [p.strip() for p in str(s).split(",") if p.strip()]

    cps_list = [float(x) for x in _parse_list(args.changepoint_prior_scale)]
    sps_list = [float(x) for x in _parse_list(args.seasonality_prior_scale)]
    smode_list = _parse_list(args.seasonality_mode)
    crange_list = [float(x) for x in _parse_list(args.changepoint_range)]
    iw_list = [float(x) for x in _parse_list(args.interval_width_grid)] if str(args.interval_width_grid).strip() else [float(args.interval_width)]

    rows: List[Dict[str, object]] = []

    for cps, sps, smode, crange, iw in itertools.product(cps_list, sps_list, smode_list, crange_list, iw_list):
        m = Prophet(
            interval_width=float(iw),
            changepoint_prior_scale=float(cps),
            seasonality_prior_scale=float(sps),
            seasonality_mode=str(smode),
            changepoint_range=float(crange),
            weekly_seasonality=True,
            daily_seasonality=False,
            yearly_seasonality=False,
        )
        for r in regressors:
            m.add_regressor(r)

        try:
            m.fit(train_df)
        except Exception:
            continue

        future = test_df[["ds"] + regressors].copy()
        fc = m.predict(future)

        y_true = test_df["y"].values
        y_pred = fc["yhat"].values

        rmse = _rmse(y_true, y_pred)
        mae = _mae(y_true, y_pred)
        mape = _mape(y_true, y_pred)
        smape = _smape(y_true, y_pred)
        cov = _interval_coverage(y_true, fc["yhat_lower"].values, fc["yhat_upper"].values)

        objective = float(rmse)
        if float(args.min_coverage) > 0 and float(cov) < float(args.min_coverage):
            objective = objective * (1.0 + float(args.coverage_weight) * (float(args.min_coverage) - float(cov)))

        rows.append(
            {
                "changepoint_prior_scale": cps,
                "seasonality_prior_scale": sps,
                "seasonality_mode": smode,
                "changepoint_range": crange,
                "horizon": horizon,
                "interval_width": float(iw),
                "rmse": float(rmse),
                "mae": float(mae),
                "mape": float(mape),
                "smape": float(smape),
                "coverage": float(cov),
                "objective": float(objective),
                "regressor_count": int(len(regressors)),
            }
        )

    if not rows:
        raise SystemExit("No tuning results (all configs failed).")

    res = pd.DataFrame(rows).sort_values(["objective", "rmse", "mae"], ascending=[True, True, True]).reset_index(drop=True)

    out_path = Path(args.out).resolve() if args.out else (Path(__file__).resolve().parent / "prophet" / f"tuning_results_{in_path.stem}.csv")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    res.to_csv(out_path, index=False)

    best = res.iloc[0].to_dict()
    print(f"Wrote: {out_path}")
    print("Best config:")
    print(best)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


