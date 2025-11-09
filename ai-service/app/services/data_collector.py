"""
Service to collect and aggregate data from multiple sources
"""
from datetime import date
from typing import Optional
from app.clients.order_client import OrderServiceClient
from app.clients.catalog_client import CatalogServiceClient
from app.schemas.metrics import DailyBranchMetrics
import logging

logger = logging.getLogger(__name__)


class DataCollectorService:
    """Service to collect metrics data from various sources"""
    
    def __init__(self):
        self.order_client = OrderServiceClient()
        self.catalog_client = CatalogServiceClient()
    
    async def collect_daily_metrics(
        self, 
        branch_id: int, 
        target_date: date
    ) -> Optional[DailyBranchMetrics]:
        """
        Collect all daily metrics for a branch on a specific date
        """
        try:
            # Collect data from Order Service
            revenue_data = await self.order_client.get_revenue_metrics(branch_id, target_date)
            customer_data = await self.order_client.get_customer_metrics(branch_id, target_date)
            product_data = await self.order_client.get_product_metrics(branch_id, target_date)
            review_data = await self.order_client.get_review_metrics(branch_id, target_date)
            # operational_data = await self.order_client.get_operational_metrics(branch_id, target_date)  # Tạm thời không có API này
            
            # Collect data from Catalog Service
            inventory_data = await self.catalog_client.get_inventory_metrics(branch_id, target_date)
            material_cost_data = await self.catalog_client.get_material_cost_metrics(
                branch_id, target_date, target_date
            )
            
            # Calculate time-based features
            day_of_week = target_date.weekday() + 1  # 1-7 (Monday=1)
            is_weekend = day_of_week >= 6
            
            # Aggregate all data into DailyBranchMetrics
            metrics = DailyBranchMetrics(
                branch_id=branch_id,
                report_date=target_date,
                
                # Revenue & Orders
                total_revenue=revenue_data.get("total_revenue", 0.0) if revenue_data else 0.0,
                order_count=revenue_data.get("order_count", 0) if revenue_data else 0,
                avg_order_value=revenue_data.get("avg_order_value", 0.0) if revenue_data else 0.0,
                
                # Customer Metrics
                customer_count=customer_data.get("customer_count", 0) if customer_data else 0,
                repeat_customers=customer_data.get("repeat_customers", 0) if customer_data else 0,
                new_customers=customer_data.get("new_customers", 0) if customer_data else 0,
                
                # Product Metrics
                unique_products_sold=product_data.get("unique_products_sold", 0) if product_data else 0,
                top_selling_product_id=product_data.get("top_selling_product_id") if product_data else None,
                product_diversity_score=product_data.get("product_diversity_score", 0.0) if product_data else 0.0,
                
                # Time-based Features
                day_of_week=day_of_week,
                is_weekend=is_weekend,
                peak_hour=revenue_data.get("peak_hour", 0) if revenue_data else 0,
                
                # Operational Metrics (Tạm thời không có API)
                avg_preparation_time_seconds=None,  # Tạm thời không có API operational metrics
                staff_efficiency_score=None,  # Tạm thời không có API operational metrics
                
                # Quality & Cost
                avg_review_score=review_data.get("avg_review_score") if review_data else None,
                material_cost=material_cost_data.get("material_cost", 0.0) if material_cost_data else 0.0,
                waste_percentage=None,  # TODO: Implement if available
                
                # Inventory Metrics
                low_stock_products=inventory_data.get("low_stock_products", 0) if inventory_data else 0,
                out_of_stock_products=inventory_data.get("out_of_stock_products", 0) if inventory_data else 0,
            )
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error collecting daily metrics: {e}", exc_info=True)
            return None

