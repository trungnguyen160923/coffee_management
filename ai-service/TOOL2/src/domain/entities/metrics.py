"""
Metrics Entity - Domain model for daily branch metrics
"""
from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional


@dataclass
class DailyBranchMetrics:
    """Entity đại diện cho metrics hàng ngày của chi nhánh"""
    
    id: Optional[int] = None
    branch_id: int = 0
    report_date: date = None
    
    # Revenue & Orders
    total_revenue: Optional[float] = None
    order_count: Optional[int] = None
    avg_order_value: Optional[float] = None
    
    # Customer Metrics
    customer_count: Optional[int] = None
    repeat_customers: Optional[int] = None
    new_customers: Optional[int] = None
    
    # Product Metrics
    unique_products_sold: Optional[int] = None
    top_selling_product_id: Optional[int] = None
    product_diversity_score: Optional[float] = None
    
    # Time-based Features
    peak_hour: Optional[int] = None
    day_of_week: Optional[int] = None
    is_weekend: Optional[bool] = None
    
    # Operational Metrics
    avg_preparation_time_seconds: Optional[int] = None
    staff_efficiency_score: Optional[float] = None
    
    # Quality & Cost
    avg_review_score: Optional[float] = None
    material_cost: Optional[float] = None
    waste_percentage: Optional[float] = None
    
    # Inventory Metrics
    low_stock_products: Optional[int] = None
    out_of_stock_products: Optional[int] = None
    
    # Timestamps
    created_at: Optional[datetime] = None
    
    def to_dict(self) -> dict:
        """Convert entity to dictionary"""
        return {
            'id': self.id,
            'branch_id': self.branch_id,
            'report_date': self.report_date,
            'total_revenue': self.total_revenue,
            'order_count': self.order_count,
            'avg_order_value': self.avg_order_value,
            'customer_count': self.customer_count,
            'repeat_customers': self.repeat_customers,
            'new_customers': self.new_customers,
            'unique_products_sold': self.unique_products_sold,
            'top_selling_product_id': self.top_selling_product_id,
            'product_diversity_score': self.product_diversity_score,
            'peak_hour': self.peak_hour,
            'day_of_week': self.day_of_week,
            'is_weekend': self.is_weekend,
            'avg_preparation_time_seconds': self.avg_preparation_time_seconds,
            'staff_efficiency_score': self.staff_efficiency_score,
            'avg_review_score': self.avg_review_score,
            'material_cost': self.material_cost,
            'waste_percentage': self.waste_percentage,
            'low_stock_products': self.low_stock_products,
            'out_of_stock_products': self.out_of_stock_products,
            'created_at': self.created_at
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'DailyBranchMetrics':
        """Create entity from dictionary"""
        # Filter out fields that are not part of the entity
        valid_fields = {
            'id', 'branch_id', 'report_date',
            'total_revenue', 'order_count', 'avg_order_value',
            'customer_count', 'repeat_customers', 'new_customers',
            'unique_products_sold', 'top_selling_product_id', 'product_diversity_score',
            'peak_hour', 'day_of_week', 'is_weekend',
            'avg_preparation_time_seconds', 'staff_efficiency_score',
            'avg_review_score', 'material_cost', 'waste_percentage',
            'low_stock_products', 'out_of_stock_products',
            'created_at'
        }
        filtered_data = {k: v for k, v in data.items() if k in valid_fields}
        return cls(**filtered_data)

