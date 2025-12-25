"""
FINAL - One-command Prophet pipeline (similar to IF pipeline).

Run (from project root):
  python .\\final\\train\\run_prophet_pipeline.py --input .\\final\\data\\branch_1.csv --target total_revenue

Flags:
- --drop-month: remove month regressor
- --use-operational-regressors: include staff/prep/waste... as regressors
- --min-coverage / --interval-width-grid: tune for reliability (coverage)
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Branch CSV file, e.g. final/data/branch_1.csv")
    parser.add_argument("--target", default="total_revenue")
    parser.add_argument("--horizon", type=int, default=30)
    parser.add_argument("--future-periods", type=int, default=30)
    parser.add_argument("--interval-width", type=float, default=0.8)
    parser.add_argument("--interval-width-grid", default="")
    parser.add_argument("--min-coverage", type=float, default=0.0)
    parser.add_argument("--coverage-weight", type=float, default=2.0)
    parser.add_argument("--use-operational-regressors", action="store_true")
    parser.add_argument("--drop-month", action="store_true")
    args = parser.parse_args()

    in_path = Path(args.input).resolve()
    if not in_path.exists():
        raise SystemExit(f"Input not found: {in_path}")

    base = Path(__file__).resolve().parent
    prophet_data_dir = base / "prophet" / "data"
    prophet_data_dir.mkdir(parents=True, exist_ok=True)

    preprocess_cmd = [
        sys.executable,
        str(base / "prophet_preprocess.py"),
        "--input",
        str(in_path),
        "--target",
        str(args.target),
        "--outdir",
        str(prophet_data_dir),
    ]
    if args.use_operational_regressors:
        preprocess_cmd.append("--use-operational-regressors")
    if args.drop_month:
        preprocess_cmd.append("--drop-month")
    subprocess.check_call(preprocess_cmd)

    prophet_csv = prophet_data_dir / f"{in_path.stem}_prophet.csv"
    if not prophet_csv.exists():
        raise SystemExit(f"Expected prophet csv not found: {prophet_csv}")

    tuning_dir = base / "prophet"
    tuning_dir.mkdir(parents=True, exist_ok=True)
    tuning_csv = tuning_dir / f"tuning_results_{prophet_csv.stem}.csv"

    tune_cmd = [
        sys.executable,
        str(base / "tune_prophet.py"),
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
        tune_cmd.extend(["--interval-width-grid", str(args.interval_width_grid).strip()])
    if float(args.min_coverage) > 0:
        tune_cmd.extend(
            ["--min-coverage", str(float(args.min_coverage)), "--coverage-weight", str(float(args.coverage_weight))]
        )
    subprocess.check_call(tune_cmd)

    train_cmd = [
        sys.executable,
        str(base / "train_and_save_prophet.py"),
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
        str(in_path.stem),
    ]
    subprocess.check_call(train_cmd)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


