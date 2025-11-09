"""
Pydantic schemas for metrics data
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


class DailyRevenueMetrics(BaseModel):
    """Revenue metrics for a day"""
    total_revenue: float = Field(..., description="Total revenue in the day")
    order_count: int = Field(..., description="Total number of orders")
    avg_order_value: float = Field(..., description="Average order value")


class DailyCustomerMetrics(BaseModel):
    """Customer metrics for a day"""
    customer_count: int = Field(..., description="Total number of customers")
    repeat_customers: int = Field(..., description="Number of repeat customers")
    new_customers: int = Field(..., description="Number of new customers")


class DailyProductMetrics(BaseModel):
    """Product metrics for a day"""
    unique_products_sold: int = Field(..., description="Number of unique products sold")
    top_selling_product_id: Optional[int] = Field(None, description="ID of top selling product")
    product_diversity_score: float = Field(..., ge=0, le=1, description="Product diversity score (0-1)")


class DailyReviewMetrics(BaseModel):
    """Review metrics for a day"""
    avg_review_score: Optional[float] = Field(None, ge=0, le=5, description="Average review score")


class DailyOperationalMetrics(BaseModel):
    """Operational metrics for a day"""
    avg_preparation_time_seconds: Optional[int] = Field(None, description="Average preparation time in seconds")
    staff_efficiency_score: Optional[float] = Field(None, ge=0, le=1, description="Staff efficiency score (0-1)")


class DailyInventoryMetrics(BaseModel):
    """Inventory metrics for a day"""
    low_stock_products: int = Field(..., description="Number of products with low stock")
    out_of_stock_products: int = Field(..., description="Number of out of stock products")


class DailyMaterialCostMetrics(BaseModel):
    """Material cost metrics for a day"""
    material_cost: float = Field(..., description="Total material cost")


class DailyBranchMetrics(BaseModel):
    """Complete daily metrics for a branch"""
    branch_id: int
    report_date: date
    
    # Revenue & Orders
    total_revenue: float = 0.0
    order_count: int = 0
    avg_order_value: float = 0.0
    
    # Customer Metrics
    customer_count: int = 0
    repeat_customers: int = 0
    new_customers: int = 0
    
    # Product Metrics
    unique_products_sold: int = 0
    top_selling_product_id: Optional[int] = None
    product_diversity_score: float = 0.0
    
    # Time-based Features
    peak_hour: int = Field(0, ge=0, le=23)
    day_of_week: int = Field(1, ge=1, le=7)
    is_weekend: bool = False
    
    # Operational Metrics
    avg_preparation_time_seconds: Optional[int] = None
    staff_efficiency_score: Optional[float] = None
    
    # Quality & Cost
    avg_review_score: Optional[float] = None
    material_cost: float = 0.0
    waste_percentage: Optional[float] = None
    
    # Inventory Metrics
    low_stock_products: int = 0
    out_of_stock_products: int = 0

