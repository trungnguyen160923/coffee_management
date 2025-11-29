"""
Metrics Repository Implementation
"""
from typing import List, Optional
from datetime import date

from ...domain.entities.metrics import DailyBranchMetrics
from ...domain.repositories.metrics_repository import IMetricsRepository
from ..database.connection import DatabaseConnection


class MetricsRepositoryImpl(IMetricsRepository):
    """Implementation của metrics repository"""
    
    def __init__(self, db: DatabaseConnection):
        self.db = db
    
    def save(self, metrics: DailyBranchMetrics) -> int:
        """Lưu metrics, trả về ID"""
        query = """
        INSERT INTO daily_branch_metrics (
            branch_id, report_date, created_at,
            total_revenue, order_count, avg_order_value,
            customer_count, repeat_customers, new_customers,
            unique_products_sold, top_selling_product_id, product_diversity_score,
            peak_hour, day_of_week, is_weekend,
            avg_preparation_time_seconds, staff_efficiency_score,
            avg_review_score, material_cost, waste_percentage,
            low_stock_products, out_of_stock_products
        ) VALUES (
            %s, %s, %s,
            %s, %s, %s,
            %s, %s, %s,
            %s, %s, %s,
            %s, %s, %s,
            %s, %s,
            %s, %s, %s,
            %s, %s
        )
        ON DUPLICATE KEY UPDATE
            total_revenue = VALUES(total_revenue),
            order_count = VALUES(order_count),
            avg_order_value = VALUES(avg_order_value),
            customer_count = VALUES(customer_count),
            repeat_customers = VALUES(repeat_customers),
            new_customers = VALUES(new_customers),
            unique_products_sold = VALUES(unique_products_sold),
            top_selling_product_id = VALUES(top_selling_product_id),
            product_diversity_score = VALUES(product_diversity_score),
            peak_hour = VALUES(peak_hour),
            day_of_week = VALUES(day_of_week),
            is_weekend = VALUES(is_weekend),
            avg_preparation_time_seconds = VALUES(avg_preparation_time_seconds),
            staff_efficiency_score = VALUES(staff_efficiency_score),
            avg_review_score = VALUES(avg_review_score),
            material_cost = VALUES(material_cost),
            waste_percentage = VALUES(waste_percentage),
            low_stock_products = VALUES(low_stock_products),
            out_of_stock_products = VALUES(out_of_stock_products)
        """
        
        # Set created_at = report_date (DATE sẽ tự động convert sang TIMESTAMP với time 00:00:00)
        # Nếu muốn set time cụ thể, có thể dùng datetime.combine(report_date, time(0, 0, 0))
        created_at = metrics.report_date  # DATE sẽ được MySQL convert sang TIMESTAMP
        
        params = (
            metrics.branch_id, metrics.report_date, created_at,
            metrics.total_revenue, metrics.order_count, metrics.avg_order_value,
            metrics.customer_count, metrics.repeat_customers, metrics.new_customers,
            metrics.unique_products_sold, metrics.top_selling_product_id, metrics.product_diversity_score,
            metrics.peak_hour, metrics.day_of_week, metrics.is_weekend,
            metrics.avg_preparation_time_seconds, metrics.staff_efficiency_score,
            metrics.avg_review_score, metrics.material_cost, metrics.waste_percentage,
            metrics.low_stock_products, metrics.out_of_stock_products
        )
        
        result = self.db.execute_query(query, params, fetch=False)
        return result
    
    def find_by_id(self, metric_id: int) -> Optional[DailyBranchMetrics]:
        """Tìm metrics theo ID"""
        query = "SELECT * FROM daily_branch_metrics WHERE id = %s"
        result = self.db.execute_query(query, (metric_id,))
        if result:
            return DailyBranchMetrics.from_dict(result[0])
        return None
    
    def find_by_branch_and_date(self, branch_id: int, report_date: date) -> Optional[DailyBranchMetrics]:
        """Tìm metrics theo branch_id và ngày"""
        query = "SELECT * FROM daily_branch_metrics WHERE branch_id = %s AND report_date = %s"
        result = self.db.execute_query(query, (branch_id, report_date))
        if result:
            return DailyBranchMetrics.from_dict(result[0])
        return None
    
    def find_for_training(self, branch_id: int, days: int = 90) -> List[DailyBranchMetrics]:
        """
        Lấy metrics để train model
        Lấy N ngày gần nhất từ ngày cuối cùng trong DB (giống logic CSV version)
        """
        # Tìm ngày cuối cùng trong DB cho branch này
        query_max_date = """
        SELECT MAX(report_date) as max_date 
        FROM daily_branch_metrics 
        WHERE branch_id = %s
        """
        max_date_result = self.db.execute_query(query_max_date, (branch_id,))
        
        if not max_date_result or not max_date_result[0]['max_date']:
            return []
        
        max_date = max_date_result[0]['max_date']
        
        # Lấy N ngày từ max_date trở về trước
        query = """
        SELECT * FROM daily_branch_metrics
        WHERE branch_id = %s
        AND report_date >= DATE_SUB(%s, INTERVAL %s DAY)
        AND report_date <= %s
        ORDER BY report_date ASC
        """
        result = self.db.execute_query(query, (branch_id, max_date, days - 1, max_date))
        return [DailyBranchMetrics.from_dict(row) for row in result]
    
    def find_unpredicted(self, branch_id: Optional[int] = None) -> List[DailyBranchMetrics]:
        """Lấy metrics chưa được predict"""
        if branch_id:
            query = """
            SELECT m.* FROM daily_branch_metrics m
            LEFT JOIN anomaly_results ar ON m.id = ar.metric_id
            WHERE m.branch_id = %s AND ar.id IS NULL
            ORDER BY m.report_date DESC
            """
            params = (branch_id,)
        else:
            query = """
            SELECT m.* FROM daily_branch_metrics m
            LEFT JOIN anomaly_results ar ON m.id = ar.metric_id
            WHERE ar.id IS NULL
            ORDER BY m.report_date DESC
            """
            params = None
        
        result = self.db.execute_query(query, params)
        return [DailyBranchMetrics.from_dict(row) for row in result]
    
    def find_all_branches(self) -> List[int]:
        """Lấy danh sách tất cả branch_id có metrics"""
        query = "SELECT DISTINCT branch_id FROM daily_branch_metrics"
        result = self.db.execute_query(query)
        return [row['branch_id'] for row in result]

