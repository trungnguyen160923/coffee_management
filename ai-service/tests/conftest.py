"""
Pytest configuration và fixtures chung cho tất cả tests
"""
import pytest
import sys
from pathlib import Path

# Add app directory to path
app_dir = Path(__file__).parent.parent
sys.path.insert(0, str(app_dir))


@pytest.fixture
def sample_aggregated_data():
    """Fixture: Sample aggregated data cho testing"""
    from datetime import date
    
    return {
        "branch_id": 1,
        "report_date": date.today().isoformat(),
        "daily_branch_metrics": {
            "branch_id": 1,
            "report_date": date.today().isoformat(),
            "total_revenue": 1000000,
            "order_count": 50,
            "avg_order_value": 20000,
            "customer_count": 100,
            "repeat_customers": 80,
            "new_customers": 20,
            "unique_products_sold": 30,
            "top_selling_product_id": 10,
            "product_diversity_score": 0.8,
            "peak_hour": 10,
            "day_of_week": 4,
            "is_weekend": False,
            "avg_review_score": 4.5,
            "material_cost": 200000,
            "low_stock_products": 2,
            "out_of_stock_products": 1,
            "created_at": None
        },
        "derived_kpis": {
            "profit": 800000,
            "profit_margin": 0.8,
            "customer_retention_rate": 0.8,
            "orders_per_customer": 0.5
        },
        "isolation_forest_anomaly": {
            "co_bat_thuong": False,
            "confidence": 0.85
        },
        "prophet_forecast": {
            "do_tin_cay": {
                "phan_tram": 88.0,
                "muc_do": "RẤT CAO"
            }
        }
    }


@pytest.fixture
def sample_ai_analysis():
    """Fixture: Sample AI analysis text"""
    return """
    Tóm tắt tình hình hoạt động:
    
    1. Tổng quan:
    - Doanh thu: 1,000,000 VNĐ
    - Số đơn hàng: 50 đơn
    - Số khách hàng: 100 người
    - Điểm đánh giá trung bình: 4.5/5
    
    2. Điểm mạnh:
    - Doanh thu ổn định
    - Khách hàng quay lại nhiều
    
    3. Vấn đề cần chú ý:
    - Không có bất thường được phát hiện
    
    4. Dự đoán tương lai:
    - Dự báo doanh thu sẽ tăng trong tuần tới
    
    5. Khuyến nghị:
    1. Tăng cường quản lý chất lượng sản phẩm
    2. Theo dõi xu hướng khách hàng
    3. Tối ưu hóa quản lý tồn kho
    """


@pytest.fixture
def confidence_service():
    """Fixture: ConfidenceService instance"""
    from app.services.confidence_service import ConfidenceService
    return ConfidenceService()

