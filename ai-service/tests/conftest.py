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
        "date": date.today().isoformat(),
        "revenue_metrics": {
            "totalRevenue": 1000000,
            "orderCount": 50,
            "avgOrderValue": 20000
        },
        "customer_metrics": {
            "customerCount": 100,
            "newCustomers": 20,
            "repeatCustomers": 80
        },
        "product_metrics": {
            "uniqueProductsSold": 30,
            "productDiversityScore": 0.8
        },
        "review_metrics": {
            "avgReviewScore": 4.5,
            "totalReviews": 50
        },
        "inventory_metrics": {
            "totalIngredients": 50,
            "totalInventoryValue": 500000
        },
        "material_cost_metrics": {
            "totalMaterialCost": 200000,
            "totalTransactions": 10
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

