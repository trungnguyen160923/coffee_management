"""
Service for querying metrics from daily_branch_metrics table
"""
import logging
from datetime import date, datetime
from typing import List, Optional
from decimal import Decimal
from sqlalchemy import func, extract, and_, create_engine, text
from sqlalchemy.orm import Session
from sqlalchemy.engine import Engine

from app.models.daily_metrics import DailyBranchMetrics
from app.config import settings

logger = logging.getLogger(__name__)


class MetricsQueryService:
    """Service to query aggregated metrics from daily_branch_metrics"""

    def __init__(self):
        """Initialize with order_db engine for querying branches"""
        self.order_engine = self._create_order_engine()

    def _create_order_engine(self) -> Optional[Engine]:
        """Create SQLAlchemy engine for order_db"""
        try:
            if settings.ORDER_DB_URL:
                url = settings.ORDER_DB_URL
            else:
                url = (
                    f"mysql+pymysql://{settings.DB_USER}:{settings.DB_PASSWORD}"
                    f"@{settings.DB_HOST}:{settings.DB_PORT}/{settings.ORDER_DB_NAME}?charset=utf8mb4"
                )
            return create_engine(
                url,
                pool_pre_ping=True,
                pool_recycle=3600,
                echo=settings.DEBUG,
            )
        except Exception as e:
            logger.error(f"Failed to create order_db engine: {e}")
            return None

    def get_daily_total_revenue(self, db: Session, target_date: Optional[date] = None) -> dict:
        """
        Get total revenue across all branches for a specific date
        Query directly from orders table for real-time data (instead of daily_branch_metrics)
        
        Args:
            db: Database session (not used, kept for compatibility)
            target_date: Date to query (defaults to today)
            
        Returns:
            Dictionary with total_revenue, branch_count, avg_revenue_per_branch
        """
        if target_date is None:
            target_date = date.today()
        
        try:
            if not self.order_engine:
                logger.warning("Order DB engine not available, falling back to daily_branch_metrics")
                # Fallback to daily_branch_metrics if order_db is not available
                result = db.query(
                    func.sum(DailyBranchMetrics.total_revenue).label('total_revenue'),
                    func.count(func.distinct(DailyBranchMetrics.branch_id)).label('branch_count')
                ).filter(
                    DailyBranchMetrics.report_date == target_date
                ).first()
                
                total_revenue = float(result.total_revenue or 0)
                branch_count = result.branch_count or 0
                avg_revenue_per_branch = total_revenue / branch_count if branch_count > 0 else 0
                
                return {
                    "report_date": target_date,
                    "total_revenue": total_revenue,
                    "branch_count": branch_count,
                    "avg_revenue_per_branch": avg_revenue_per_branch
                }
            
            # Query directly from orders table for real-time data
            # Only count COMPLETED orders with PAID status
            query = text("""
                SELECT 
                    COALESCE(SUM(total_amount), 0) AS total_revenue,
                    COUNT(DISTINCT branch_id) AS branch_count
                FROM orders
                WHERE DATE(create_at) = :target_date
                    AND status = 'COMPLETED' 
                    AND payment_status = 'PAID'
            """)
            
            with self.order_engine.connect() as conn:
                result = conn.execute(query, {"target_date": target_date}).first()
                
                total_revenue = float(result[0] or 0)
                branch_count = result[1] or 0
                avg_revenue_per_branch = total_revenue / branch_count if branch_count > 0 else 0
                
                return {
                    "report_date": target_date,
                    "total_revenue": total_revenue,
                    "branch_count": branch_count,
                    "avg_revenue_per_branch": avg_revenue_per_branch
                }
        except Exception as e:
            logger.error(f"Error getting daily total revenue: {e}", exc_info=True)
            raise

    def get_branch_count(self, db: Session) -> dict:
        """
        Get total number of branches
        
        Returns:
            Dictionary with total_branches (from order_db.branches) and branches_with_data (from metrics)
        """
        try:
            # Get total branches from order_db.branches table
            total_branches = 0
            if self.order_engine:
                try:
                    query = text("SELECT COUNT(*) as count FROM branches")
                    with self.order_engine.connect() as conn:
                        result = conn.execute(query).first()
                        total_branches = result[0] if result else 0
                except Exception as e:
                    logger.warning(f"Could not query branches table from order_db: {e}")
                    # Fallback: try to get from metrics if branches table not accessible
                    total_branches = db.query(
                        func.count(func.distinct(DailyBranchMetrics.branch_id))
                    ).scalar() or 0
            
            # Get distinct branch count from metrics table (branches that have data)
            branches_with_data = db.query(
                func.count(func.distinct(DailyBranchMetrics.branch_id))
            ).scalar() or 0
            
            return {
                "total_branches": total_branches,
                "branches_with_data": branches_with_data
            }
        except Exception as e:
            logger.error(f"Error getting branch count: {e}", exc_info=True)
            raise

    def get_yearly_revenue_orders(
        self, 
        db: Session, 
        target_year: Optional[int] = None
    ) -> dict:
        """
        Get revenue and orders breakdown by month for a specific year
        
        Args:
            db: Database session
            target_year: Year to query (defaults to current year)
            
        Returns:
            Dictionary with yearly totals and monthly breakdown
        """
        if target_year is None:
            target_year = datetime.now().year
        
        try:
            # Query monthly aggregates
            monthly_results = db.query(
                extract('year', DailyBranchMetrics.report_date).label('year'),
                extract('month', DailyBranchMetrics.report_date).label('month'),
                func.sum(DailyBranchMetrics.total_revenue).label('total_revenue'),
                func.sum(DailyBranchMetrics.order_count).label('total_orders'),
                func.count(func.distinct(DailyBranchMetrics.branch_id)).label('branch_count'),
                func.count(DailyBranchMetrics.report_date).label('days_with_data')
            ).filter(
                extract('year', DailyBranchMetrics.report_date) == target_year
            ).group_by(
                extract('year', DailyBranchMetrics.report_date),
                extract('month', DailyBranchMetrics.report_date)
            ).order_by('month').all()
            
            monthly_data = []
            total_revenue = 0.0
            total_orders = 0
            
            for row in monthly_results:
                month_revenue = float(row.total_revenue or 0)
                month_orders = int(row.total_orders or 0)
                days_count = int(row.days_with_data or 0)
                
                total_revenue += month_revenue
                total_orders += month_orders
                
                # Calculate averages per day
                avg_revenue_per_day = month_revenue / days_count if days_count > 0 else 0
                avg_orders_per_day = month_orders / days_count if days_count > 0 else 0
                
                monthly_data.append({
                    "year": int(row.year),
                    "month": int(row.month),
                    "total_revenue": month_revenue,
                    "total_orders": month_orders,
                    "avg_revenue_per_day": avg_revenue_per_day,
                    "avg_orders_per_day": avg_orders_per_day,
                    "branch_count": int(row.branch_count or 0)
                })
            
            return {
                "year": target_year,
                "total_revenue": total_revenue,
                "total_orders": total_orders,
                "monthly_data": monthly_data
            }
        except Exception as e:
            logger.error(f"Error getting yearly revenue orders: {e}", exc_info=True)
            raise

    def get_monthly_top_branches(
        self,
        db: Session,
        target_year: Optional[int] = None,
        target_month: Optional[int] = None,
        limit: int = 10
    ) -> dict:
        """
        Get top performing branches by revenue for a specific month
        
        Args:
            db: Database session
            target_year: Year to query (defaults to current year)
            target_month: Month to query (1-12, defaults to current month)
            limit: Number of top branches to return (default: 10)
            
        Returns:
            Dictionary with top branches list
        """
        if target_year is None:
            target_year = datetime.now().year
        if target_month is None:
            target_month = datetime.now().month
        
        try:
            # Query branch aggregates for the month
            branch_results = db.query(
                DailyBranchMetrics.branch_id,
                func.sum(DailyBranchMetrics.total_revenue).label('total_revenue'),
                func.sum(DailyBranchMetrics.order_count).label('order_count'),
                func.avg(DailyBranchMetrics.avg_order_value).label('avg_order_value')
            ).filter(
                and_(
                    extract('year', DailyBranchMetrics.report_date) == target_year,
                    extract('month', DailyBranchMetrics.report_date) == target_month
                )
            ).group_by(
                DailyBranchMetrics.branch_id
            ).order_by(
                func.sum(DailyBranchMetrics.total_revenue).desc()
            ).limit(limit).all()
            
            # Get total branch count for the month
            total_branches = db.query(
                func.count(func.distinct(DailyBranchMetrics.branch_id))
            ).filter(
                and_(
                    extract('year', DailyBranchMetrics.report_date) == target_year,
                    extract('month', DailyBranchMetrics.report_date) == target_month
                )
            ).scalar() or 0
            
            top_branches = []
            for rank, row in enumerate(branch_results, start=1):
                total_revenue = float(row.total_revenue or 0)
                order_count = int(row.order_count or 0)
                avg_order_value = float(row.avg_order_value or 0)
                
                top_branches.append({
                    "branch_id": int(row.branch_id),
                    "total_revenue": total_revenue,
                    "order_count": order_count,
                    "avg_order_value": avg_order_value,
                    "rank": rank
                })
            
            return {
                "year": target_year,
                "month": target_month,
                "top_branches": top_branches,
                "total_branches": total_branches
            }
        except Exception as e:
            logger.error(f"Error getting monthly top branches: {e}", exc_info=True)
            raise

    def get_comprehensive_metrics(
        self,
        db: Session,
        target_date: Optional[date] = None,
        target_year: Optional[int] = None,
        target_month: Optional[int] = None,
        top_branches_limit: int = 10
    ) -> dict:
        """
        Get comprehensive metrics combining all metrics data
        
        Args:
            db: Database session
            target_date: Date for daily revenue (defaults to today)
            target_year: Year for yearly and monthly data (defaults to current year)
            target_month: Month for top branches (defaults to current month)
            top_branches_limit: Number of top branches to return (default: 10)
            
        Returns:
            Dictionary with all metrics combined
        """
        try:
            # Get all metrics
            daily_revenue = self.get_daily_total_revenue(db, target_date)
            branch_count = self.get_branch_count(db)
            yearly_revenue_orders = self.get_yearly_revenue_orders(db, target_year)
            monthly_top_branches = self.get_monthly_top_branches(
                db, target_year, target_month, top_branches_limit
            )
            
            return {
                "daily_revenue": daily_revenue,
                "branch_count": branch_count,
                "yearly_revenue_orders": yearly_revenue_orders,
                "monthly_top_branches": monthly_top_branches
            }
        except Exception as e:
            logger.error(f"Error getting comprehensive metrics: {e}", exc_info=True)
            raise

