"""
SQLAlchemy model for daily_branch_metrics table
"""
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    Integer,
    Numeric,
    Float,
    UniqueConstraint,
)
from sqlalchemy.sql import func
from app.database import Base


class DailyBranchMetrics(Base):
    """Daily metrics aggregated per branch"""

    __tablename__ = "daily_branch_metrics"
    __table_args__ = (
        UniqueConstraint("branch_id", "report_date", name="uq_branch_date"),
    )

    id = Column(BigInteger, primary_key=True, index=True)
    branch_id = Column(Integer, nullable=False, index=True)
    report_date = Column(Date, nullable=False, index=True)

    # Revenue & Orders
    total_revenue = Column(Numeric(15, 2), nullable=True)
    order_count = Column(Integer, nullable=True)
    avg_order_value = Column(Numeric(10, 2), nullable=True)

    # Customer metrics
    customer_count = Column(Integer, nullable=True)
    repeat_customers = Column(Integer, nullable=True)
    new_customers = Column(Integer, nullable=True)

    # Product metrics
    unique_products_sold = Column(Integer, nullable=True)
    top_selling_product_id = Column(Integer, nullable=True)
    product_diversity_score = Column(Numeric(5, 4), nullable=True)

    # Time-based features
    peak_hour = Column(Integer, nullable=True)
    day_of_week = Column(Integer, nullable=True)
    is_weekend = Column(Boolean, nullable=True)

    # Operational metrics (placeholders until real data is available)
    avg_preparation_time_seconds = Column(Integer, nullable=True)
    staff_efficiency_score = Column(Numeric(5, 4), nullable=True)

    # Quality & cost
    avg_review_score = Column(Float, nullable=True)
    material_cost = Column(Numeric(15, 2), nullable=True)
    waste_percentage = Column(Numeric(5, 4), nullable=True)

    # Inventory
    low_stock_products = Column(Integer, nullable=True)
    out_of_stock_products = Column(Integer, nullable=True)

    created_at = Column(DateTime, nullable=False, server_default=func.now())



