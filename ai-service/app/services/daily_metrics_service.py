"""
Service that aggregates daily metrics from operational databases
and stores them in analytics_db.daily_branch_metrics
"""
import logging
from datetime import date, datetime, time, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional, Tuple

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models.daily_metrics import DailyBranchMetrics as DailyBranchMetricsModel

logger = logging.getLogger(__name__)


class DailyMetricsService:
    """Collects daily KPIs across services and persists them"""

    def __init__(self):
        self.order_engine = self._create_engine(
            override_url=settings.ORDER_DB_URL,
            db_name=settings.ORDER_DB_NAME,
            label="order_db",
        )
        self.catalog_engine = self._create_engine(
            override_url=settings.CATALOG_DB_URL,
            db_name=settings.CATALOG_DB_NAME,
            label="catalog_db",
        )

    def _create_engine(
        self, override_url: Optional[str], db_name: str, label: str
    ) -> Optional[Engine]:
        """Create SQLAlchemy engine for a source database"""
        try:
            if override_url:
                url = override_url
            else:
                url = (
                    f"mysql+pymysql://{settings.DB_USER}:{settings.DB_PASSWORD}"
                    f"@{settings.DB_HOST}:{settings.DB_PORT}/{db_name}?charset=utf8mb4"
                )
            return create_engine(
                url,
                pool_pre_ping=True,
                pool_recycle=3600,
                echo=settings.DEBUG,
            )
        except Exception as exc:  # pragma: no cover - defensive
            logger.error("Failed to create engine for %s: %s", label, exc)
            return None

    @staticmethod
    def _quantize(value: Optional[Decimal], exp: str) -> Optional[Decimal]:
        """Convert numeric value to Decimal with desired precision"""
        if value is None:
            return None
        if not isinstance(value, Decimal):
            value = Decimal(str(value))
        return value.quantize(Decimal(exp), rounding=ROUND_HALF_UP)

    def compute_and_store_metrics(
        self,
        target_date: Optional[date] = None,
        branch_ids: Optional[List[int]] = None,
    ) -> Dict[str, object]:
        """
        Aggregate metrics for the given date (default: yesterday)

        Returns:
            Dict summarizing processing results
        """
        if not self.order_engine:
            raise RuntimeError("Order DB connection is not configured")

        target_date = target_date or (date.today() - timedelta(days=1))
        branches = self._resolve_branch_ids(branch_ids)

        if not branches:
            return {
                "success": False,
                "date": target_date.isoformat(),
                "results": [],
                "message": "No branches to process",
            }

        results = []
        for branch_id in branches:
            try:
                payload = self._build_metrics_payload(branch_id, target_date)
                record_id, action = self._upsert_metrics(payload)
                results.append(
                    {
                        "branch_id": branch_id,
                        "action": action,
                        "metric_id": record_id,
                    }
                )
            except Exception as exc:
                logger.error(
                    "Failed to aggregate metrics for branch %s on %s: %s",
                    branch_id,
                    target_date,
                    exc,
                    exc_info=True,
                )
                results.append(
                    {
                        "branch_id": branch_id,
                        "action": "error",
                        "error": str(exc),
                    }
                )

        success = any(r["action"] in {"created", "updated"} for r in results)
        return {
            "success": success,
            "date": target_date.isoformat(),
            "results": results,
        }

    def _resolve_branch_ids(self, branch_ids: Optional[List[int]]) -> List[int]:
        """Fetch branch ids from order_db if not provided"""
        if branch_ids:
            return sorted(set(branch_ids))

        if not self.order_engine:
            return []

        query = text("SELECT branch_id FROM branches")
        with self.order_engine.connect() as conn:
            rows = conn.execute(query).fetchall()
        return sorted({row[0] for row in rows})

    def _build_metrics_payload(self, branch_id: int, target_date: date) -> Dict[str, object]:
        """Collect and normalize all metric segments for a branch"""
        revenue_metrics = self._collect_revenue_metrics(branch_id, target_date)
        customer_metrics = self._collect_customer_metrics(branch_id, target_date)
        product_metrics = self._collect_product_metrics(branch_id, target_date)
        avg_review_score = self._collect_review_score(branch_id, target_date)
        inventory_metrics = self._collect_inventory_metrics(branch_id)
        material_cost = self._collect_material_cost(branch_id, target_date)

        return {
            "branch_id": branch_id,
            "report_date": target_date,
            "total_revenue": revenue_metrics["total_revenue"],
            "order_count": revenue_metrics["order_count"],
            "avg_order_value": revenue_metrics["avg_order_value"],
            "customer_count": customer_metrics["customer_count"],
            "repeat_customers": customer_metrics["repeat_customers"],
            "new_customers": customer_metrics["new_customers"],
            "unique_products_sold": product_metrics["unique_products_sold"],
            "top_selling_product_id": product_metrics["top_selling_product_id"],
            "product_diversity_score": product_metrics["product_diversity_score"],
            "peak_hour": revenue_metrics["peak_hour"],
            "day_of_week": target_date.isoweekday(),
            "is_weekend": target_date.isoweekday() >= 6,
            "avg_preparation_time_seconds": None,
            "staff_efficiency_score": None,
            "avg_review_score": avg_review_score,
            "material_cost": material_cost,
            "waste_percentage": None,
            "low_stock_products": inventory_metrics["low_stock_products"],
            "out_of_stock_products": inventory_metrics["out_of_stock_products"],
        }

    def _collect_revenue_metrics(self, branch_id: int, target_date: date) -> Dict[str, object]:
        """Aggregate revenue KPIs from orders"""
        params = {"branch_id": branch_id, "target_date": target_date}
        base_query = text(
            """
            SELECT
                COUNT(*) AS order_count,
                SUM(CASE WHEN status = 'COMPLETED' AND payment_status = 'PAID'
                         THEN total_amount ELSE 0 END) AS total_revenue,
                SUM(CASE WHEN status = 'COMPLETED' AND payment_status = 'PAID'
                         THEN 1 ELSE 0 END) AS completed_paid_orders
            FROM orders
            WHERE branch_id = :branch_id AND DATE(create_at) = :target_date
            """
        )
        with self.order_engine.connect() as conn:
            core_row = conn.execute(base_query, params).mappings().first()
            peak_row = conn.execute(
                text(
                    """
                    SELECT HOUR(create_at) AS order_hour, COUNT(*) AS cnt
                    FROM orders
                    WHERE branch_id = :branch_id AND DATE(create_at) = :target_date
                    GROUP BY order_hour
                    ORDER BY cnt DESC, order_hour ASC
                    LIMIT 1
                    """
                ),
                params,
            ).first()

        total_revenue = self._quantize(core_row["total_revenue"] or Decimal("0"), "0.01")
        completed_paid = core_row["completed_paid_orders"] or 0
        avg_order_value = (
            self._quantize(
                (total_revenue or Decimal("0")) / completed_paid, "0.01"
            )
            if completed_paid
            else Decimal("0.00")
        )

        return {
            "order_count": core_row["order_count"] or 0,
            "total_revenue": total_revenue,
            "avg_order_value": avg_order_value,
            "peak_hour": peak_row[0] if peak_row else 0,
        }

    def _collect_customer_metrics(self, branch_id: int, target_date: date) -> Dict[str, int]:
        """Compute customer KPIs derived from orders"""
        params = {"branch_id": branch_id, "target_date": target_date}
        start_of_day = datetime.combine(target_date, time.min)

        with self.order_engine.connect() as conn:
            registered_today = {
                row[0]
                for row in conn.execute(
                    text(
                        """
                        SELECT DISTINCT customer_id
                        FROM orders
                        WHERE branch_id = :branch_id
                          AND DATE(create_at) = :target_date
                          AND customer_id IS NOT NULL
                          AND customer_id <> 0
                        """
                    ),
                    params,
                )
            }

            walk_in_count = conn.execute(
                text(
                    """
                    SELECT COUNT(*)
                    FROM orders
                    WHERE branch_id = :branch_id
                      AND DATE(create_at) = :target_date
                      AND (customer_id IS NULL OR customer_id = 0)
                    """
                ),
                params,
            ).scalar_one()

            previous_registered = {
                row[0]
                for row in conn.execute(
                    text(
                        """
                        SELECT DISTINCT customer_id
                        FROM orders
                        WHERE branch_id = :branch_id
                          AND customer_id IS NOT NULL
                          AND customer_id <> 0
                          AND create_at < :start_of_day
                        """
                    ),
                    {**params, "start_of_day": start_of_day},
                )
            }

        repeat_customers = len(registered_today & previous_registered)
        new_customers = max(len(registered_today) - repeat_customers, 0)
        customer_count = len(registered_today) + walk_in_count

        return {
            "customer_count": customer_count,
            "repeat_customers": repeat_customers,
            "new_customers": new_customers,
        }

    def _collect_product_metrics(self, branch_id: int, target_date: date) -> Dict[str, object]:
        """Aggregate product-level KPIs"""
        params = {"branch_id": branch_id, "target_date": target_date}
        query = text(
            """
            SELECT od.product_id AS product_id, SUM(od.qty) AS total_qty
            FROM orders o
            JOIN order_details od ON o.order_id = od.order_id
            WHERE o.branch_id = :branch_id AND DATE(o.create_at) = :target_date
            GROUP BY od.product_id
            """
        )
        with self.order_engine.connect() as conn:
            rows = conn.execute(query, params).mappings().all()

        unique_products = len(rows)
        total_qty = sum((row["total_qty"] or Decimal("0")) for row in rows)
        top_product_id = None
        if rows:
            top_row = max(rows, key=lambda r: r["total_qty"] or Decimal("0"))
            top_product_id = top_row["product_id"]

        diversity_score = (
            (Decimal(unique_products) / total_qty) if total_qty else Decimal("0")
        )

        return {
            "unique_products_sold": unique_products,
            "top_selling_product_id": top_product_id,
            "product_diversity_score": self._quantize(diversity_score, "0.0001")
            or Decimal("0.0000"),
        }

    def _collect_review_score(self, branch_id: int, target_date: date) -> Optional[float]:
        """Average review rating for the day"""
        params = {"branch_id": branch_id, "target_date": target_date}
        query = text(
            """
            SELECT AVG(rating) AS avg_rating
            FROM reviews
            WHERE branch_id = :branch_id
              AND DATE(create_at) = :target_date
              AND (is_deleted IS NULL OR is_deleted = 0)
            """
        )
        with self.order_engine.connect() as conn:
            row = conn.execute(query, params).first()
        if not row or row[0] is None:
            return None
        return float(row[0])

    def _collect_inventory_metrics(self, branch_id: int) -> Dict[str, int]:
        """Low/out of stock counts from catalog DB"""
        if not self.catalog_engine:
            logger.warning("Catalog DB connection missing - inventory metrics default to 0")
            return {"low_stock_products": 0, "out_of_stock_products": 0}

        query = text(
            """
            SELECT
                SUM(CASE WHEN IFNULL(quantity, 0) <= IFNULL(threshold, 0) AND IFNULL(threshold, 0) > 0 THEN 1 ELSE 0 END) AS low_stock,
                SUM(CASE WHEN IFNULL(quantity, 0) <= 0 THEN 1 ELSE 0 END) AS out_stock
            FROM stocks
            WHERE branch_id = :branch_id
            """
        )
        with self.catalog_engine.connect() as conn:
            row = conn.execute(query, {"branch_id": branch_id}).mappings().first()

        return {
            "low_stock_products": int(row["low_stock"] or 0),
            "out_of_stock_products": int(row["out_stock"] or 0),
        }

    def _collect_material_cost(self, branch_id: int, target_date: date) -> Decimal:
        """Total material spend captured via inventory transactions"""
        if not self.catalog_engine:
            return Decimal("0.00")

        query = text(
            """
            SELECT COALESCE(SUM(line_total), 0) AS total_cost
            FROM inventory_transactions
            WHERE branch_id = :branch_id
              AND DATE(create_at) = :target_date
              AND txn_type IN ('RECEIPT', 'ADJUST_IN')
            """
        )
        with self.catalog_engine.connect() as conn:
            row = conn.execute(
                query, {"branch_id": branch_id, "target_date": target_date}
            ).first()

        return self._quantize(row[0] or Decimal("0"), "0.01")

    def _upsert_metrics(self, payload: Dict[str, object]) -> Tuple[int, str]:
        """Insert or update daily_branch_metrics row"""
        session: Session = SessionLocal()
        try:
            existing = (
                session.query(DailyBranchMetricsModel)
                .filter(
                    DailyBranchMetricsModel.branch_id == payload["branch_id"],
                    DailyBranchMetricsModel.report_date == payload["report_date"],
                )
                .one_or_none()
            )

            if existing:
                for key, value in payload.items():
                    setattr(existing, key, value)
                record = existing
                action = "updated"
            else:
                record = DailyBranchMetricsModel(**payload)
                session.add(record)
                action = "created"

            session.commit()
            session.refresh(record)
            return record.id, action
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()



