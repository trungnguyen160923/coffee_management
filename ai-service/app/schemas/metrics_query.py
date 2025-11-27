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

