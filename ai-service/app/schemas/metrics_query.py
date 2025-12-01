"""
Pydantic schemas for metrics query responses
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date


class DailyTotalRevenueResponse(BaseModel):
    """Total revenue across all branches for a specific date"""
    report_date: date = Field(..., description="Date of the metrics")
    total_revenue: float = Field(..., description="Total revenue across all branches")
    branch_count: int = Field(..., description="Number of branches included")
    avg_revenue_per_branch: float = Field(..., description="Average revenue per branch")


class BranchCountResponse(BaseModel):
    """Total number of branches"""
    total_branches: int = Field(..., description="Total number of branches")
    branches_with_data: int = Field(..., description="Number of branches with metrics data")


class MonthlyRevenueOrder(BaseModel):
    """Revenue and order count for a month"""
    year: int = Field(..., description="Year")
    month: int = Field(..., ge=1, le=12, description="Month (1-12)")
    total_revenue: float = Field(..., description="Total revenue for the month")
    total_orders: int = Field(..., description="Total number of orders for the month")
    avg_revenue_per_day: float = Field(..., description="Average revenue per day")
    avg_orders_per_day: float = Field(..., description="Average orders per day")
    branch_count: int = Field(..., description="Number of branches with data")


class YearlyRevenueOrdersResponse(BaseModel):
    """Yearly revenue and orders breakdown by month"""
    year: int = Field(..., description="Year")
    total_revenue: float = Field(..., description="Total revenue for the year")
    total_orders: int = Field(..., description="Total orders for the year")
    monthly_data: List[MonthlyRevenueOrder] = Field(..., description="Monthly breakdown")


class TopBranchPerformance(BaseModel):
    """Top performing branch by revenue"""
    branch_id: int = Field(..., description="Branch ID")
    total_revenue: float = Field(..., description="Total revenue for the period")
    order_count: int = Field(..., description="Number of orders")
    avg_order_value: float = Field(..., description="Average order value")
    rank: int = Field(..., description="Rank (1-based)")


class MonthlyTopBranchesResponse(BaseModel):
    """Top performing branches for a specific month"""
    year: int = Field(..., description="Year")
    month: int = Field(..., ge=1, le=12, description="Month (1-12)")
    top_branches: List[TopBranchPerformance] = Field(..., description="List of top branches")
    total_branches: int = Field(..., description="Total number of branches")


class ComprehensiveMetricsResponse(BaseModel):
    """Comprehensive metrics combining all metrics data"""
    # Daily total revenue
    daily_revenue: DailyTotalRevenueResponse = Field(..., description="Daily total revenue across all branches")
    
    # Branch count
    branch_count: BranchCountResponse = Field(..., description="Total number of branches")
    
    # Yearly revenue and orders
    yearly_revenue_orders: YearlyRevenueOrdersResponse = Field(..., description="Yearly revenue and orders breakdown")
    
    # Monthly top branches
    monthly_top_branches: MonthlyTopBranchesResponse = Field(..., description="Top performing branches for the month")


class BranchMonthlyStatsResponse(BaseModel):
    """Monthly statistics for a specific branch"""
    branch_id: int = Field(..., description="Branch ID")
    year: int = Field(..., description="Year")
    month: int = Field(..., ge=1, le=12, description="Month (1-12)")
    total_revenue: float = Field(..., description="Total revenue for the month")
    total_orders: int = Field(..., description="Total number of orders for the month")
    total_material_cost: float = Field(default=0, description="Total material cost for the month")
    total_profit: float = Field(default=0, description="Total profit (revenue - material cost) for the month")
    profit_margin: float = Field(default=0, description="Profit margin percentage")
    avg_revenue_per_day: float = Field(..., description="Average revenue per day")
    avg_orders_per_day: float = Field(..., description="Average orders per day")
    avg_profit_per_day: float = Field(default=0, description="Average profit per day")
    days_with_data: int = Field(..., description="Number of days with data")
    avg_order_value: float = Field(..., description="Average order value")
    customer_count: int = Field(default=0, description="Total unique customers")
    top_product_id: Optional[int] = Field(None, description="Top selling product ID")


class BranchYearlyStatsResponse(BaseModel):
    """Yearly statistics for a specific branch"""
    branch_id: int = Field(..., description="Branch ID")
    year: int = Field(..., description="Year")
    total_revenue: float = Field(..., description="Total revenue for the year")
    total_orders: int = Field(..., description="Total number of orders for the year")
    total_material_cost: float = Field(default=0, description="Total material cost for the year")
    total_profit: float = Field(default=0, description="Total profit (revenue - material cost) for the year")
    profit_margin: float = Field(default=0, description="Profit margin percentage")
    avg_revenue_per_month: float = Field(..., description="Average revenue per month")
    avg_orders_per_month: float = Field(..., description="Average orders per month")
    avg_profit_per_month: float = Field(default=0, description="Average profit per month")
    months_with_data: int = Field(..., description="Number of months with data")
    avg_order_value: float = Field(..., description="Average order value")
    monthly_data: List[MonthlyRevenueOrder] = Field(..., description="Monthly breakdown")


class DailyBranchMetricsItem(BaseModel):
    """Single daily branch metrics record"""
    id: int = Field(..., description="Record ID")
    branch_id: int = Field(..., description="Branch ID")
    report_date: date = Field(..., description="Report date")
    total_revenue: Optional[float] = Field(None, description="Total revenue")
    order_count: Optional[int] = Field(None, description="Order count")
    avg_order_value: Optional[float] = Field(None, description="Average order value")
    customer_count: Optional[int] = Field(None, description="Customer count")
    repeat_customers: Optional[int] = Field(None, description="Repeat customers")
    new_customers: Optional[int] = Field(None, description="New customers")
    unique_products_sold: Optional[int] = Field(None, description="Unique products sold")
    top_selling_product_id: Optional[int] = Field(None, description="Top selling product ID")
    product_diversity_score: Optional[float] = Field(None, description="Product diversity score")
    peak_hour: Optional[int] = Field(None, description="Peak hour")
    day_of_week: Optional[int] = Field(None, description="Day of week")
    is_weekend: Optional[bool] = Field(None, description="Is weekend")
    avg_preparation_time_seconds: Optional[int] = Field(None, description="Average preparation time")
    staff_efficiency_score: Optional[float] = Field(None, description="Staff efficiency score")
    avg_review_score: Optional[float] = Field(None, description="Average review score")
    material_cost: Optional[float] = Field(None, description="Material cost")
    waste_percentage: Optional[float] = Field(None, description="Waste percentage")
    low_stock_products: Optional[int] = Field(None, description="Low stock products")
    out_of_stock_products: Optional[int] = Field(None, description="Out of stock products")
    created_at: Optional[str] = Field(None, description="Created at timestamp")


class DailyBranchMetricsListResponse(BaseModel):
    """List of daily branch metrics"""
    total: int = Field(..., description="Total number of records")
    page: int = Field(1, description="Current page")
    page_size: int = Field(10, description="Page size")
    items: List[DailyBranchMetricsItem] = Field(..., description="List of metrics records")


class AllBranchesMonthlyStatsResponse(BaseModel):
    """Monthly statistics aggregated across all branches"""
    year: int = Field(..., description="Year")
    month: int = Field(..., ge=1, le=12, description="Month (1-12)")
    total_revenue: float = Field(..., description="Total revenue across all branches")
    total_orders: int = Field(..., description="Total number of orders across all branches")
    total_material_cost: float = Field(default=0, description="Total material cost across all branches")
    total_profit: float = Field(default=0, description="Total profit across all branches")
    profit_margin: float = Field(default=0, description="Profit margin percentage")
    avg_revenue_per_day: float = Field(..., description="Average revenue per day")
    avg_orders_per_day: float = Field(..., description="Average orders per day")
    avg_profit_per_day: float = Field(default=0, description="Average profit per day")
    avg_revenue_per_branch: float = Field(..., description="Average revenue per branch")
    days_with_data: int = Field(..., description="Number of days with data")
    avg_order_value: float = Field(..., description="Average order value")
    branch_count: int = Field(..., description="Number of branches")
    total_customer_count: int = Field(default=0, description="Total customer count")


class AllBranchesYearlyStatsResponse(BaseModel):
    """Yearly statistics aggregated across all branches"""
    year: int = Field(..., description="Year")
    total_revenue: float = Field(..., description="Total revenue across all branches")
    total_orders: int = Field(..., description="Total number of orders across all branches")
    total_material_cost: float = Field(default=0, description="Total material cost across all branches")
    total_profit: float = Field(default=0, description="Total profit across all branches")
    profit_margin: float = Field(default=0, description="Profit margin percentage")
    avg_revenue_per_month: float = Field(..., description="Average revenue per month")
    avg_orders_per_month: float = Field(..., description="Average orders per month")
    avg_profit_per_month: float = Field(default=0, description="Average profit per month")
    months_with_data: int = Field(..., description="Number of months with data")
    avg_order_value: float = Field(..., description="Average order value")
    avg_branch_count: int = Field(..., description="Average number of branches")
    monthly_data: List[MonthlyRevenueOrder] = Field(..., description="Monthly breakdown")