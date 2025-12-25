"""
Import CSV branch datasets from `app/TOOL2/src/new_method/data` into MySQL table `daily_branch_metrics`.

Key requirements:
- CSV columns:
  transaction_date,branch_id,total_revenue,order_count,customer_count,new_customers,repeat_customers,
  staff_count,avg_prep_time,avg_review_score,avg_order_value,peak_hour,day_of_week,is_weekend,
  unique_products_sold,product_diversity_score,total_cost,waste_cost

- Insert into `daily_branch_metrics` with mapping:
  report_date := transaction_date (shifted)
  material_cost := total_cost
  waste_percentage := waste_cost/total_cost (0..1)
  avg_preparation_time_seconds := round(avg_prep_time * 60)   # CSV appears to be minutes
  staff_efficiency_score := clamp(order_count / (staff_count*35), 0..1)

- Date shifting for "reporting until 31/12/2025" while preserving weekday:
  We shift ALL rows by a number of days that is a multiple of 7 (weekday preserved).
  The shift is chosen so that the (global) max transaction_date across all CSVs becomes:
    - 2025-12-31 if weekday matches, else the next date AFTER 2025-12-31 with the same weekday.

Usage (from repo root):
  python ai-service/app/TOOL2/src/new_method/import_daily_branch_metrics_from_csv.py --commit

By default it runs in DRY-RUN mode (no DB writes).
"""

from __future__ import annotations

import argparse
import glob
import os
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument(
        "--data-dir",
        default="",
        help="Directory containing branch_*.csv (default: this script's ./data folder).",
    )
    p.add_argument(
        "--target-end-date",
        default="2025-12-31",
        help="Target end date (YYYY-MM-DD). If weekday mismatch, will move forward to match weekday.",
    )
    p.add_argument(
        "--database",
        default="",
        help="Override DB name (default: env DB_NAME/TOOL2_DB_NAME or analytics_db).",
    )
    p.add_argument(
        "--commit",
        action="store_true",
        help="Actually write to DB. Without this flag, script runs in dry-run mode.",
    )
    p.add_argument(
        "--truncate",
        action="store_true",
        help="TRUNCATE daily_branch_metrics before import (requires --commit).",
    )
    p.add_argument(
        "--upsert",
        action="store_true",
        default=True,
        help="Upsert on (branch_id, report_date) unique key (default: true).",
    )
    p.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Insert batch size (default: 500).",
    )
    return p.parse_args()


def _script_data_dir() -> Path:
    here = Path(__file__).resolve()
    return here.parent / "data"


def _parse_date(s: str) -> date:
    return datetime.strptime(s.strip()[:10], "%Y-%m-%d").date()


def _compute_shift_days(max_date: date, target_end: date) -> Tuple[int, date]:
    """
    Return (shift_days, chosen_end_date), where shift_days is a multiple of 7.
    """
    old_wd = max_date.weekday()  # Mon=0..Sun=6
    tgt_wd = target_end.weekday()
    # Move forward from target_end to match old weekday
    delta_ahead = (old_wd - tgt_wd) % 7
    chosen_end = target_end + timedelta(days=delta_ahead)
    shift_days = (chosen_end - max_date).days
    # Ensure multiple of 7 and non-negative
    if shift_days < 0:
        # If data already beyond target, keep weekday and shift forward by weeks to make it non-negative
        shift_days += ((-shift_days + 6) // 7) * 7
        chosen_end = max_date + timedelta(days=shift_days)
    # By construction, (chosen_end.weekday == old_wd) => shift_days % 7 == 0
    return shift_days, chosen_end


def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


@dataclass
class Row:
    branch_id: int
    report_date: date
    total_revenue: float
    order_count: int
    avg_order_value: float
    customer_count: int
    repeat_customers: int
    new_customers: int
    unique_products_sold: int
    top_selling_product_id: Optional[int]
    product_diversity_score: float
    peak_hour: int
    day_of_week: int  # 1..7
    is_weekend: int  # 0/1
    avg_preparation_time_seconds: int
    staff_efficiency_score: float
    avg_review_score: float
    material_cost: float
    waste_percentage: float
    low_stock_products: int
    out_of_stock_products: int


def _read_csv_rows(csv_path: Path, *, shift_days: int) -> List[Row]:
    try:
        import pandas as pd
    except Exception as e:  # pragma: no cover
        raise SystemExit("Missing dependency pandas. Install it in ai-service env.") from e

    df = pd.read_csv(csv_path)
    required = [
        "transaction_date",
        "branch_id",
        "total_revenue",
        "order_count",
        "customer_count",
        "new_customers",
        "repeat_customers",
        "staff_count",
        "avg_prep_time",
        "avg_review_score",
        "avg_order_value",
        "peak_hour",
        "day_of_week",
        "is_weekend",
        "unique_products_sold",
        "product_diversity_score",
        "total_cost",
        "waste_cost",
    ]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"CSV missing columns {missing}: {csv_path}")

    # Normalize types
    df["transaction_date"] = pd.to_datetime(df["transaction_date"], errors="coerce").dt.date
    df = df.dropna(subset=["transaction_date"]).copy()

    out: List[Row] = []
    for _, r in df.iterrows():
        old_dt: date = r["transaction_date"]
        new_dt = old_dt + timedelta(days=int(shift_days))

        bid = int(r["branch_id"])
        order_count = int(r["order_count"]) if not pd.isna(r["order_count"]) else 0
        staff_count = int(r["staff_count"]) if not pd.isna(r["staff_count"]) else 0
        cap = max(1, staff_count) * 35.0
        eff = float(order_count) / cap if cap > 0 else 0.0
        eff = _clamp(eff, 0.0, 1.0)

        total_cost = float(r["total_cost"]) if not pd.isna(r["total_cost"]) else 0.0
        waste_cost = float(r["waste_cost"]) if not pd.isna(r["waste_cost"]) else 0.0
        waste_pct = (waste_cost / total_cost) if total_cost > 0 else 0.0
        waste_pct = _clamp(float(waste_pct), 0.0, 1.0)

        avg_prep_time = float(r["avg_prep_time"]) if not pd.isna(r["avg_prep_time"]) else 0.0
        avg_prep_seconds = int(round(max(0.0, avg_prep_time) * 60.0))

        # day_of_week in CSV is 0..6 (Mon..Sun). DB expects 1..7.
        dow_0_6 = int(r["day_of_week"]) if not pd.isna(r["day_of_week"]) else int(new_dt.weekday())
        dow_1_7 = int(dow_0_6) + 1
        if not (1 <= dow_1_7 <= 7):
            dow_1_7 = int(new_dt.weekday()) + 1

        # Recompute weekend from date to guarantee correctness after shifting
        is_weekend = 1 if new_dt.weekday() >= 5 else 0

        out.append(
            Row(
                branch_id=bid,
                report_date=new_dt,
                total_revenue=float(r["total_revenue"]) if not pd.isna(r["total_revenue"]) else 0.0,
                order_count=order_count,
                avg_order_value=float(r["avg_order_value"]) if not pd.isna(r["avg_order_value"]) else 0.0,
                customer_count=int(r["customer_count"]) if not pd.isna(r["customer_count"]) else 0,
                repeat_customers=int(r["repeat_customers"]) if not pd.isna(r["repeat_customers"]) else 0,
                new_customers=int(r["new_customers"]) if not pd.isna(r["new_customers"]) else 0,
                unique_products_sold=int(r["unique_products_sold"]) if not pd.isna(r["unique_products_sold"]) else 0,
                top_selling_product_id=None,
                product_diversity_score=float(r["product_diversity_score"])
                if not pd.isna(r["product_diversity_score"])
                else 0.0,
                peak_hour=int(r["peak_hour"]) if not pd.isna(r["peak_hour"]) else 0,
                day_of_week=dow_1_7,
                is_weekend=is_weekend,
                avg_preparation_time_seconds=avg_prep_seconds,
                staff_efficiency_score=eff,
                avg_review_score=float(r["avg_review_score"]) if not pd.isna(r["avg_review_score"]) else 0.0,
                material_cost=total_cost,
                waste_percentage=waste_pct,
                low_stock_products=0,
                out_of_stock_products=0,
            )
        )
    return out


def _discover_csvs(data_dir: Path) -> List[Path]:
    files = sorted(Path(p).resolve() for p in glob.glob(str(data_dir / "branch_*.csv")))
    if not files:
        raise SystemExit(f"No branch_*.csv found under: {data_dir}")
    return files


def _global_max_date(csvs: List[Path]) -> date:
    try:
        import pandas as pd
    except Exception as e:  # pragma: no cover
        raise SystemExit("Missing dependency pandas. Install it in ai-service env.") from e

    max_dt: Optional[date] = None
    for p in csvs:
        df = pd.read_csv(p, usecols=["transaction_date"])
        s = pd.to_datetime(df["transaction_date"], errors="coerce").dropna()
        if s.empty:
            continue
        dmax = s.max().date()
        if max_dt is None or dmax > max_dt:
            max_dt = dmax
    if max_dt is None:
        raise SystemExit("Could not find any valid transaction_date values in input CSVs.")
    return max_dt


def _connect_db(database_name: str):
    # Import TOOL2 DB connection (ships with ai-service)
    try:
        from app.TOOL2.src.infrastructure.database.connection import DatabaseConnection  # type: ignore
    except Exception:
        # Fallback when running from a different working directory
        repo_root = Path(__file__).resolve().parents[5]  # .../coffee_management
        os.sys.path.insert(0, str(repo_root / "ai-service"))
        from app.TOOL2.src.infrastructure.database.connection import DatabaseConnection  # type: ignore

    db = DatabaseConnection(database_name=database_name or None)
    db.connect()
    return db


def _insert_rows(db, rows: List[Row], *, upsert: bool, batch_size: int) -> int:
    cols = [
        "branch_id",
        "report_date",
        "total_revenue",
        "order_count",
        "avg_order_value",
        "customer_count",
        "repeat_customers",
        "new_customers",
        "unique_products_sold",
        "top_selling_product_id",
        "product_diversity_score",
        "peak_hour",
        "day_of_week",
        "is_weekend",
        "avg_preparation_time_seconds",
        "staff_efficiency_score",
        "avg_review_score",
        "material_cost",
        "waste_percentage",
        "low_stock_products",
        "out_of_stock_products",
    ]
    placeholders = ", ".join(["%s"] * len(cols))
    insert_sql = f"INSERT INTO daily_branch_metrics ({', '.join(cols)}) VALUES ({placeholders})"
    if upsert:
        updates = ", ".join([f"{c}=VALUES({c})" for c in cols if c not in ("branch_id", "report_date")])
        insert_sql += f" ON DUPLICATE KEY UPDATE {updates}"

    def _to_tuple(r: Row) -> Tuple:
        return (
            r.branch_id,
            r.report_date,
            round(r.total_revenue, 2),
            int(r.order_count),
            round(r.avg_order_value, 2),
            int(r.customer_count),
            int(r.repeat_customers),
            int(r.new_customers),
            int(r.unique_products_sold),
            r.top_selling_product_id,
            round(r.product_diversity_score, 4),
            int(r.peak_hour),
            int(r.day_of_week),
            int(r.is_weekend),
            int(r.avg_preparation_time_seconds),
            round(r.staff_efficiency_score, 4),
            float(r.avg_review_score),
            round(r.material_cost, 2),
            round(r.waste_percentage, 4),
            int(r.low_stock_products),
            int(r.out_of_stock_products),
        )

    conn = db.get_connection()
    cursor = conn.cursor()
    total = 0
    try:
        for i in range(0, len(rows), batch_size):
            batch = rows[i : i + batch_size]
            cursor.executemany(insert_sql, [_to_tuple(r) for r in batch])
            conn.commit()
            total += len(batch)
    finally:
        cursor.close()
    return total


def main() -> int:
    args = _parse_args()
    data_dir = Path(args.data_dir).resolve() if str(args.data_dir).strip() else _script_data_dir()
    csvs = _discover_csvs(data_dir)

    target_end = _parse_date(args.target_end_date)
    max_dt = _global_max_date(csvs)
    shift_days, chosen_end = _compute_shift_days(max_dt, target_end)

    print("=" * 90)
    print("CSV -> daily_branch_metrics importer")
    print(f"Data dir: {data_dir}")
    print(f"Found CSVs: {[p.name for p in csvs]}")
    print(f"Global max transaction_date: {max_dt} (weekday={max_dt.weekday()})")
    print(f"Target end date: {target_end} (weekday={target_end.weekday()})")
    print(f"Chosen end date (weekday-aligned): {chosen_end} (weekday={chosen_end.weekday()})")
    print(f"Shift days: {shift_days} (multiple of 7: {shift_days % 7 == 0})")
    print(f"Mode: {'COMMIT' if args.commit else 'DRY-RUN'}")
    print("=" * 90)

    all_rows: List[Row] = []
    for p in csvs:
        rows = _read_csv_rows(p, shift_days=shift_days)
        all_rows.extend(rows)
        print(f"Loaded {len(rows):4d} rows from {p.name}")

    if not args.commit:
        # Show a small sample
        if all_rows:
            sample = all_rows[0]
            print("\nSample mapped row:")
            print(
                {
                    "branch_id": sample.branch_id,
                    "report_date": str(sample.report_date),
                    "total_revenue": sample.total_revenue,
                    "order_count": sample.order_count,
                    "day_of_week(1-7)": sample.day_of_week,
                    "is_weekend": sample.is_weekend,
                    "avg_preparation_time_seconds": sample.avg_preparation_time_seconds,
                    "staff_efficiency_score": sample.staff_efficiency_score,
                    "material_cost": sample.material_cost,
                    "waste_percentage": sample.waste_percentage,
                }
            )
        print(f"\nDRY-RUN complete. Would write {len(all_rows)} rows.")
        print("Re-run with --commit to write to DB.")
        return 0

    if args.truncate and not args.commit:
        raise SystemExit("--truncate requires --commit")

    db = _connect_db(args.database)
    try:
        if args.truncate:
            print("TRUNCATE daily_branch_metrics ...")
            db.execute_query("TRUNCATE TABLE daily_branch_metrics", fetch=False)

        written = _insert_rows(db, all_rows, upsert=bool(args.upsert), batch_size=int(args.batch_size))
        print(f"\n✅ Done. Written rows: {written}")
        print(
            "Note: created_at uses DB default CURRENT_TIMESTAMP. "
            "Duplicates are handled by ON DUPLICATE KEY UPDATE."
        )
        return 0
    finally:
        db.disconnect()


if __name__ == "__main__":
    raise SystemExit(main())


