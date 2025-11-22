"""
AI Agent Service using LangChain + OpenAI GPT-4o
Tổng hợp dữ liệu từ các service (Tool 1: Revenue, Inventory, Material Cost; Tool 3: Review Metrics) và xử lý với AI
"""
import json
import sys
from datetime import date
from pathlib import Path
from typing import Optional, Dict, Any
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from app.config import settings
from app.clients.order_client import OrderServiceClient
from app.clients.catalog_client import CatalogServiceClient
import logging

logger = logging.getLogger(__name__)

# Add TOOL2 to path để import các modules
TOOL2_PATH = Path(__file__).parent.parent.parent / "TOOL2"
if str(TOOL2_PATH) not in sys.path:
    sys.path.insert(0, str(TOOL2_PATH))


class AIAgentService:
    """Service to aggregate data and process with AI using LangChain"""
    
    def __init__(self):
        self.order_client = OrderServiceClient()
        self.catalog_client = CatalogServiceClient()
        
        # Initialize OpenAI LLM with custom base_url
        if settings.OPENAI_API_KEY:
            logger.info(f"Initializing OpenAI with base_url: {settings.OPENAI_BASE_URL}")
            logger.info(f"Using model: {settings.OPENAI_MODEL}")
            
            self.llm = ChatOpenAI(
                model=settings.OPENAI_MODEL,
                temperature=settings.OPENAI_TEMPERATURE,
                max_tokens=settings.OPENAI_MAX_TOKENS,
                api_key=settings.OPENAI_API_KEY,
                openai_api_base=settings.OPENAI_BASE_URL  # Thử dùng openai_api_base thay vì base_url
            )
        else:
            logger.warning("OpenAI API key not configured. AI features will be disabled.")
            self.llm = None
    
    def get_isolation_forest_json(
        self,
        branch_id: int,
        target_date: date
    ) -> Optional[Dict[str, Any]]:
        """
        Gọi trực tiếp Isolation Forest predict và trả về JSON (không lưu file, không tạo biểu đồ)
        
        Args:
            branch_id: ID chi nhánh
            target_date: Ngày cần lấy dự đoán
        
        Returns:
            Dict chứa JSON dự đoán anomaly hoặc None nếu có lỗi
        """
        try:
            # Import các components từ TOOL2
            from src.infrastructure.database.connection import DatabaseConnection
            from src.infrastructure.repositories.metrics_repository_impl import MetricsRepositoryImpl
            from src.infrastructure.repositories.model_repository_impl import ModelRepositoryImpl
            from src.infrastructure.ml.ml_predictor import MLPredictor
            from src.infrastructure.ml.weekday_comparator_db import WeekdayComparatorDB
            from src.presentation.predict_iforest_for_date_db import (
                create_anomaly_json_output,
                adjust_confidence_with_historical
            )
            
            # Kết nối database - TOOL2 cần dùng analytics_db (không phải analytics_db_report)
            db = DatabaseConnection(database_name='analytics_db')
            db.connect()
            
            try:
                # Khởi tạo repositories
                metrics_repo = MetricsRepositoryImpl(db)
                model_repo = ModelRepositoryImpl(db)
                predictor = MLPredictor()
                
                # Load active model
                model_entity = model_repo.find_active_by_branch(branch_id)
                if not model_entity:
                    logger.warning(f"No active model found for branch_id={branch_id}")
                    return None
                
                # Load model, scaler và score_stats
                model, scaler, score_stats = predictor.load_model(model_entity)
                
                # Lấy metrics cho target date
                metric = metrics_repo.find_by_branch_and_date(branch_id, target_date)
                if not metric:
                    logger.warning(f"No metrics found for branch_id={branch_id}, date={target_date}")
                    return None
                
                # Predict với Isolation Forest
                is_anomaly_iforest, anomaly_score, confidence = predictor.predict(
                    model, scaler, metric, score_stats
                )
                
                # So sánh với phân phối lịch sử (dùng method 'both' để có thông tin đầy đủ)
                comparator = WeekdayComparatorDB(db, branch_id)
                weekday_result = comparator.compare_with_historical(target_date, method='both')
                
                # Điều chỉnh confidence với historical comparison
                adjusted_confidence, adjustment_reasons = adjust_confidence_with_historical(
                    confidence, weekday_result, is_anomaly_iforest
                )
                
                # Tạo JSON output (summary_only=True để chỉ lấy thông tin cần thiết)
                json_output = create_anomaly_json_output(
                    report_date=target_date,
                    branch_id=branch_id,
                    is_anomaly_iforest=is_anomaly_iforest,
                    anomaly_score=anomaly_score,
                    confidence=adjusted_confidence,
                    weekday_result=weekday_result,
                    metric=metric,
                    model_entity=model_entity,
                    score_stats=score_stats,
                    summary_only=True  # Chỉ lấy thông tin quản lý cần
                )
                
                return json_output
                
            finally:
                db.disconnect()
                
        except ImportError as e:
            logger.error(f"Error importing TOOL2 modules: {e}", exc_info=True)
            return None
        except Exception as e:
            logger.error(f"Error getting isolation forest JSON: {e}", exc_info=True)
            return None
    
    def get_prophet_forecast_json(
        self,
        branch_id: int,
        target_date: date,
        forecast_days: int = 7
    ) -> Optional[Dict[str, Any]]:
        """
        Gọi trực tiếp Prophet Forecast predict và trả về JSON (không lưu file, không tạo biểu đồ)
        
        Args:
            branch_id: ID chi nhánh
            target_date: Ngày bắt đầu dự đoán
            forecast_days: Số ngày dự đoán (mặc định 7 ngày)
        
        Returns:
            Dict chứa JSON dự đoán forecast hoặc None nếu có lỗi
        """
        try:
            # Import các components từ TOOL2
            from src.infrastructure.database.connection import DatabaseConnection
            from src.infrastructure.repositories.metrics_repository_impl import MetricsRepositoryImpl
            from src.infrastructure.repositories.model_repository_impl import ModelRepositoryImpl
            from src.infrastructure.repositories.forecast_repository_impl import ForecastRepositoryImpl
            from src.application.use_cases.predict_forecast_use_case import PredictForecastUseCase
            from src.presentation.predict_forecast_db import (
                create_forecast_json_output,
                calculate_confidence_percentage
            )
            from src.presentation.evaluate_forecast_confidence import calculate_confidence_score
            
            # Kết nối database - TOOL2 cần dùng analytics_db (không phải analytics_db_report)
            db = DatabaseConnection(database_name='analytics_db')
            db.connect()
            
            try:
                # Khởi tạo repositories và use case
                metrics_repo = MetricsRepositoryImpl(db)
                model_repo = ModelRepositoryImpl(db)
                forecast_repo = ForecastRepositoryImpl(db)
                predict_use_case = PredictForecastUseCase(metrics_repo, model_repo, forecast_repo)
                
                # Predict (không lưu vào database)
                result = predict_use_case.execute(
                    branch_id=branch_id,
                    algorithm='PROPHET',  # Mặc định dùng PROPHET
                    target_metric='order_count',  # Mặc định dự đoán order_count
                    forecast_horizon_days=forecast_days,
                    start_date=target_date,
                    model_id=None,  # Dùng active model
                    save_result=False  # Không lưu vào database
                )
                
                forecast_values = result['forecast_values']
                confidence_intervals = result['confidence_intervals']
                
                # Tính toán độ tin cậy
                confidence_metrics = calculate_confidence_score(forecast_values, confidence_intervals)
                
                # Tạo JSON output (summary_only=True để chỉ lấy thông tin cần thiết)
                json_output = create_forecast_json_output(
                    branch_id=branch_id,
                    algorithm='PROPHET',
                    target_metric='order_count',
                    forecast_values=forecast_values,
                    confidence_intervals=confidence_intervals,
                    forecast_start_date=result['forecast_start_date'],
                    forecast_end_date=result['forecast_end_date'],
                    confidence_metrics=confidence_metrics,
                    summary_only=True  # Chỉ lấy thông tin quản lý cần
                )
                
                return json_output
                
            finally:
                db.disconnect()
                
        except ImportError as e:
            logger.error(f"Error importing TOOL2 modules: {e}", exc_info=True)
            return None
        except Exception as e:
            logger.error(f"Error getting prophet forecast JSON: {e}", exc_info=True)
            return None
    
    async def collect_three_json_data(
        self,
        branch_id: int,
        target_date: date
    ) -> Dict[str, Any]:
        """
        Thu thập dữ liệu từ các service (6 API):
        Order Service (4 API):
        1. Revenue metrics
        2. Customer metrics
        3. Product metrics
        4. Review metrics
        Catalog Service (2 API):
        5. Inventory metrics
        6. Material cost metrics
        """
        try:
            # Order Service APIs (4 API)
            # 1. Revenue Metrics
            revenue_data = await self.order_client.get_revenue_metrics(
                branch_id, target_date
            )
            
            # 2. Customer Metrics
            customer_data = await self.order_client.get_customer_metrics(
                branch_id, target_date
            )
            
            # 3. Product Metrics
            product_data = await self.order_client.get_product_metrics(
                branch_id, target_date
            )
            
            # 4. Review Metrics
            review_data = await self.order_client.get_review_metrics(
                branch_id, target_date
            )
            
            # Catalog Service APIs (2 API)
            # 5. Inventory Metrics
            inventory_data = await self.catalog_client.get_inventory_metrics(
                branch_id, target_date
            )
            
            # 6. Material Cost Metrics
            material_cost_data = await self.catalog_client.get_material_cost_metrics(
                branch_id, target_date, target_date
            )
            
            # Default structure khi không có data (giống backend Java trả về)
            if review_data is None:
                review_data = {
                    "avgReviewScore": 0.0,
                    "totalReviews": 0,
                    "reviewDistribution": {},
                    "positiveReviews": 0,
                    "negativeReviews": 0,
                    "reviewRate": 0.0,
                    "recentReviews": []
                }
            
            # 7. Isolation Forest Anomaly Detection JSON
            isolation_forest_data = self.get_isolation_forest_json(branch_id, target_date)
            
            # 8. Prophet Forecast JSON
            prophet_forecast_data = self.get_prophet_forecast_json(branch_id, target_date)
            
            # Tổng hợp thành một dictionary với đầy đủ 6 API + 2 ML predictions
            aggregated_data = {
                "branch_id": branch_id,
                "date": target_date.isoformat(),
                "revenue_metrics": revenue_data or {},
                "customer_metrics": customer_data or {},
                "product_metrics": product_data or {},
                "review_metrics": review_data,
                "inventory_metrics": inventory_data or {},
                "material_cost_metrics": material_cost_data or {},
                "isolation_forest_anomaly": isolation_forest_data or {},
                "prophet_forecast": prophet_forecast_data or {}
            }
            
            logger.info(f"Collected data from 6 APIs + 2 ML predictions - Revenue: {bool(revenue_data)}, Customer: {bool(customer_data)}, Product: {bool(product_data)}, Review: {bool(review_data)}, Inventory: {bool(inventory_data)}, Material Cost: {bool(material_cost_data)}, Isolation Forest: {bool(isolation_forest_data)}, Prophet: {bool(prophet_forecast_data)}")
            
            return aggregated_data
            
        except Exception as e:
            logger.error(f"Error collecting data: {e}", exc_info=True)
            return {
                "branch_id": branch_id,
                "date": target_date.isoformat(),
                "revenue_metrics": {},
                "customer_metrics": {},
                "product_metrics": {},
                "review_metrics": {},
                "inventory_metrics": {},
                "material_cost_metrics": {},
                "isolation_forest_anomaly": {},
                "prophet_forecast": {},
                "error": str(e)
            }
    
    async def process_with_ai(
        self,
        aggregated_data: Dict[str, Any],
        query: Optional[str] = None,
        tool_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Xử lý dữ liệu đã tổng hợp với AI sử dụng LangChain
        """
        if not self.llm:
            return {
                "success": False,
                "message": "OpenAI API key not configured"
            }
        
        try:
            # Chuyển đổi data thành JSON string để đưa vào prompt
            data_json = json.dumps(aggregated_data, indent=2, ensure_ascii=False)
            
            # Xác định loại tool và prompt tương ứng
            if tool_type == "tool1":
                system_prompt = self._get_tool1_system_prompt()
            elif tool_type == "tool3":
                system_prompt = self._get_tool3_system_prompt()
            else:
                system_prompt = self._get_default_system_prompt()
            
            # Tạo user prompt
            if query:
                user_prompt = f"""
Dữ liệu thống kê của chi nhánh:
{data_json}

Câu hỏi cụ thể: {query}

Hãy phân tích dữ liệu và trả lời câu hỏi một cách chi tiết, đưa ra các insights và khuyến nghị.
"""
            else:
                user_prompt = f"""
Dữ liệu thống kê của chi nhánh:
{data_json}

Hãy phân tích toàn diện dữ liệu này và đưa ra:
1. Tóm tắt tình hình hoạt động
2. Điểm mạnh và điểm yếu
3. Các vấn đề cần chú ý:
   - Nếu có dữ liệu bất thường (isolation_forest_anomaly), hãy liệt kê TẤT CẢ các chỉ tiêu bất thường từ field "chi_tieu_bat_thuong" (nếu có) hoặc "anomalous_features" (nếu có), không được bỏ sót bất kỳ chỉ tiêu nào. Format ngắn gọn: chỉ cần tên chỉ tiêu, mức độ thay đổi (tăng/giảm %), và mức độ nghiêm trọng. KHÔNG đề cập đến tên thuật toán (Isolation Forest, Prophet) trong báo cáo.
   - Nếu không có bất thường, hãy ghi rõ "Không có bất thường được phát hiện"
4. Dự đoán tương lai (KHÔNG đề cập đến tên thuật toán Prophet)
5. Khuyến nghị cụ thể để cải thiện
"""
            
            # Gọi LLM
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]
            
            response = self.llm.invoke(messages)
            analysis_text = response.content
            
            # Parse response để lấy summary và recommendations (nếu có)
            summary = self._extract_summary(aggregated_data)
            recommendations = self._extract_recommendations(analysis_text)
            
            return {
                "success": True,
                "analysis": analysis_text,
                "summary": summary,
                "recommendations": recommendations
            }
            
        except Exception as e:
            logger.error(f"Error processing with AI: {e}", exc_info=True)
            return {
                "success": False,
                "message": f"Error processing with AI: {str(e)}"
            }
    
    def _get_tool1_system_prompt(self) -> str:
        """System prompt cho Tool1 (Thống kê)"""
        return """Bạn là một chuyên gia phân tích dữ liệu cho hệ thống quản lý cà phê.
Nhiệm vụ của bạn là phân tích dữ liệu thống kê từ các service và đưa ra insights có giá trị.

Dữ liệu bạn nhận được bao gồm (6 API) và 2 ML predictions:
- Revenue Metrics: Doanh thu, số đơn, giá trị đơn trung bình, giờ cao điểm
- Customer Metrics: Số lượng khách hàng, khách hàng mới, khách hàng quay lại
- Product Metrics: Số sản phẩm bán được, sản phẩm bán chạy, đa dạng sản phẩm
- Review Metrics: Đánh giá khách hàng, điểm trung bình, phản hồi tích cực/tiêu cực
- Inventory Metrics: Tồn kho, sản phẩm sắp hết, sản phẩm hết hàng
- Material Cost Metrics: Chi phí nguyên liệu
- Anomaly Detection: Dự đoán bất thường (chứa danh sách các chỉ tiêu bất thường)
- Forecast: Dự đoán tương lai

QUAN TRỌNG: 
- Khi phân tích các vấn đề bất thường, bạn PHẢI liệt kê TẤT CẢ các chỉ tiêu bất thường, không được bỏ sót bất kỳ chỉ tiêu nào. Format ngắn gọn: chỉ cần tên chỉ tiêu, mức độ thay đổi (tăng/giảm %).
- TUYỆT ĐỐI KHÔNG được đề cập đến tên thuật toán (Isolation Forest, Prophet) trong báo cáo cuối cùng. Chỉ nói "dự đoán bất thường", "dự báo tương lai" hoặc tương tự.

Hãy phân tích một cách chuyên nghiệp, đưa ra các insights cụ thể và khuyến nghị hành động.
Trả lời bằng tiếng Việt, rõ ràng và dễ hiểu."""
    
    def _get_tool3_system_prompt(self) -> str:
        """System prompt cho Tool3 (Phản hồi khách hàng)"""
        return """Bạn là một chuyên gia tư vấn quản lý cho hệ thống quản lý cà phê.
Nhiệm vụ của bạn là phân tích dữ liệu, đặc biệt tập trung vào phản hồi khách hàng và đưa ra các khuyến nghị chiến lược.

Dữ liệu bạn nhận được bao gồm (6 API) và 2 ML predictions:
- Revenue Metrics: Doanh thu, số đơn, giá trị đơn trung bình
- Customer Metrics: Số lượng khách hàng, khách hàng mới, khách hàng quay lại
- Product Metrics: Số sản phẩm bán được, sản phẩm bán chạy, đa dạng sản phẩm
- Review Metrics: Đánh giá khách hàng (điểm trung bình, tổng số đánh giá, phân bố điểm, phản hồi tích cực/tiêu cực, tỷ lệ đánh giá, các đánh giá gần đây)
- Inventory Metrics: Tồn kho, sản phẩm sắp hết, sản phẩm hết hàng
- Material Cost Metrics: Chi phí nguyên liệu
- Anomaly Detection: Dự đoán bất thường (chứa danh sách các chỉ tiêu bất thường)
- Forecast: Dự đoán tương lai

QUAN TRỌNG: 
- Khi phân tích các vấn đề bất thường, bạn PHẢI liệt kê TẤT CẢ các chỉ tiêu bất thường, không được bỏ sót bất kỳ chỉ tiêu nào. Format ngắn gọn: chỉ cần tên chỉ tiêu, mức độ thay đổi (tăng/giảm %).
- TUYỆT ĐỐI KHÔNG được đề cập đến tên thuật toán (Isolation Forest, Prophet) trong báo cáo cuối cùng. Chỉ nói "dự đoán bất thường", "dự báo tương lai" hoặc tương tự.

Hãy phân tích sâu về phản hồi khách hàng, kết hợp với dữ liệu doanh thu, khách hàng, sản phẩm và hoạt động để đưa ra các khuyến nghị chiến lược nhằm cải thiện trải nghiệm khách hàng và tối ưu hóa hoạt động kinh doanh.
Trả lời bằng tiếng Việt, chuyên nghiệp và có tính thực tiễn."""
    
    def _get_default_system_prompt(self) -> str:
        """System prompt mặc định"""
        return """Bạn là một chuyên gia phân tích dữ liệu cho hệ thống quản lý cà phê.
Nhiệm vụ của bạn là phân tích dữ liệu từ các service và đưa ra insights có giá trị.

Dữ liệu bạn nhận được bao gồm (6 API) và 2 ML predictions:
- Revenue Metrics: Doanh thu, số đơn, giá trị đơn trung bình, giờ cao điểm
- Customer Metrics: Số lượng khách hàng, khách hàng mới, khách hàng quay lại
- Product Metrics: Số sản phẩm bán được, sản phẩm bán chạy, đa dạng sản phẩm
- Review Metrics: Đánh giá khách hàng, điểm trung bình, phản hồi tích cực/tiêu cực
- Inventory Metrics: Tồn kho, sản phẩm sắp hết, sản phẩm hết hàng
- Material Cost Metrics: Chi phí nguyên liệu
- Anomaly Detection: Dự đoán bất thường (chứa danh sách các chỉ tiêu bất thường)
- Forecast: Dự đoán tương lai

QUAN TRỌNG: 
- Khi phân tích các vấn đề bất thường, bạn PHẢI liệt kê TẤT CẢ các chỉ tiêu bất thường, không được bỏ sót bất kỳ chỉ tiêu nào. Format ngắn gọn: chỉ cần tên chỉ tiêu, mức độ thay đổi (tăng/giảm %).
- TUYỆT ĐỐI KHÔNG được đề cập đến tên thuật toán (Isolation Forest, Prophet) trong báo cáo cuối cùng. Chỉ nói "dự đoán bất thường", "dự báo tương lai" hoặc tương tự.

Hãy phân tích một cách chuyên nghiệp, đưa ra các insights cụ thể và khuyến nghị hành động.
Trả lời bằng tiếng Việt, rõ ràng và dễ hiểu."""
    
    def _extract_summary(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Trích xuất summary từ dữ liệu (6 API)"""
        revenue = data.get("revenue_metrics", {})
        customer = data.get("customer_metrics", {})
        product = data.get("product_metrics", {})
        review = data.get("review_metrics", {})
        inventory = data.get("inventory_metrics", {})
        material_cost = data.get("material_cost_metrics", {})
        
        # Convert BigDecimal to float if needed
        def safe_float(value, default=0):
            if value is None:
                return default
            if isinstance(value, (int, float)):
                return float(value)
            if hasattr(value, '__float__'):
                return float(value)
            return default
        
        return {
            # Revenue Metrics
            "total_revenue": safe_float(revenue.get("totalRevenue")),
            "order_count": revenue.get("orderCount", 0),
            "avg_order_value": safe_float(revenue.get("avgOrderValue")),
            "peak_hour": revenue.get("peakHour", 0),
            # Customer Metrics
            "customer_count": customer.get("customerCount", 0),
            "new_customers": customer.get("newCustomers", 0),
            "repeat_customers": customer.get("repeatCustomers", 0),
            "customer_retention_rate": safe_float(customer.get("customerRetentionRate")),
            "unique_customers": customer.get("uniqueCustomers", 0),
            # Product Metrics
            "unique_products_sold": product.get("uniqueProductsSold", 0),
            "product_diversity_score": safe_float(product.get("productDiversityScore")),
            "top_selling_product_id": product.get("topSellingProductId"),
            "top_selling_product_name": product.get("topSellingProductName"),
            # Review Metrics
            "avg_review_score": safe_float(review.get("avgReviewScore")),
            "total_reviews": review.get("totalReviews", 0),
            "positive_reviews": review.get("positiveReviews", 0),
            "negative_reviews": review.get("negativeReviews", 0),
            "review_rate": safe_float(review.get("reviewRate")),
            # Inventory Metrics
            "low_stock_count": inventory.get("lowStockProducts", 0),
            "out_of_stock_count": inventory.get("outOfStockProducts", 0),
            "total_inventory_value": safe_float(inventory.get("totalInventoryValue")),
            # Material Cost Metrics
            "total_material_cost": safe_float(material_cost.get("totalMaterialCost")),
            "profit_margin": (
                safe_float(revenue.get("totalRevenue")) - safe_float(material_cost.get("totalMaterialCost"))
                if safe_float(revenue.get("totalRevenue")) > 0 else 0
            )
        }
    
    def _extract_recommendations(self, analysis_text: str) -> list[str]:
        """Trích xuất recommendations từ analysis text - chỉ lấy phần khuyến nghị"""
        recommendations = []
        lines = analysis_text.split('\n')
        
        # Tìm phần "4. Khuyến nghị cụ thể để cải thiện"
        in_recommendations_section = False
        skip_until_recommendations = True
        
        for i, line in enumerate(lines):
            line = line.strip()
            
            # Bỏ qua các phần trước phần 4
            if skip_until_recommendations:
                if "4." in line and any(keyword in line.lower() for keyword in ['khuyến nghị', 'cải thiện', 'đề xuất']):
                    in_recommendations_section = True
                    skip_until_recommendations = False
                    continue
                continue
            
            # Dừng nếu gặp phần khác hoặc kết thúc
            if in_recommendations_section:
                # Dừng nếu gặp dòng bắt đầu bằng "Bằng cách" (kết luận)
                if line.startswith("Bằng cách") or line.startswith("###"):
                    break
                
                # Lấy các dòng có dấu hiệu là recommendation
                # Các dòng bắt đầu bằng "- **" hoặc "-" và có từ khóa khuyến nghị
                if line.startswith("-"):
                    # Loại bỏ markdown formatting
                    clean_line = line.replace("-", "").replace("**", "").replace("*", "").strip()
                    # Chỉ lấy nếu có từ khóa khuyến nghị thực sự
                    recommendation_keywords = [
                        'tăng cường', 'quản lý', 'nâng cao', 'tối ưu', 
                        'đẩy mạnh', 'cải thiện', 'khuyến khích', 'xem xét',
                        'theo dõi', 'bổ sung', 'điều chỉnh', 'đánh giá'
                    ]
                    if any(keyword in clean_line.lower() for keyword in recommendation_keywords):
                        if len(clean_line) > 20:  # Chỉ lấy dòng có nội dung đủ dài
                            recommendations.append(clean_line)
                # Lấy các dòng mô tả khuyến nghị (không phải tiêu đề, không bắt đầu bằng -)
                elif line and not line.startswith("#") and len(line) > 30:
                    # Kiểm tra xem có phải là mô tả khuyến nghị không
                    if any(keyword in line.lower() for keyword in ['tăng cường', 'quản lý', 'nâng cao', 'tối ưu', 'đẩy mạnh']):
                        recommendations.append(line)
        
        # Giới hạn số lượng recommendations
        return recommendations[:10] if recommendations else []
    
    async def collect_all_branches_data(
        self,
        target_date: date
    ) -> Dict[str, Any]:
        """
        Thu thập dữ liệu từ các service cho TẤT CẢ chi nhánh (6 API mới):
        Order Service (4 API):
        1. All branches revenue metrics
        2. All branches customer metrics
        3. All branches product metrics
        4. All branches review metrics
        Order Service (2 API):
        5. All branches stats (cần date range, dùng target_date làm cả 2)
        6. All branches revenue (cần date range, dùng target_date làm cả 2)
        """
        try:
            # Order Service APIs (4 API) - cho ngày cụ thể
            # 1. All Branches Revenue Metrics
            all_revenue_data = await self.order_client.get_all_branches_revenue_metrics(
                target_date
            )
            
            # 2. All Branches Customer Metrics
            all_customer_data = await self.order_client.get_all_branches_customer_metrics(
                target_date
            )
            
            # 3. All Branches Product Metrics
            all_product_data = await self.order_client.get_all_branches_product_metrics(
                target_date
            )
            
            # 4. All Branches Review Metrics
            all_review_data = await self.order_client.get_all_branches_review_metrics(
                target_date
            )
            
            # Order Service APIs (2 API) - cho date range (dùng target_date làm cả 2)
            # 5. All Branches Stats
            all_stats_data = await self.order_client.get_all_branches_stats(
                target_date, target_date
            )
            
            # 6. All Branches Revenue
            all_revenue_range_data = await self.order_client.get_all_branches_revenue(
                target_date, target_date
            )
            
            # Default structure khi không có data
            if all_review_data is None:
                all_review_data = {
                    "overallAvgReviewScore": 0.0,
                    "totalReviews": 0,
                    "reviewDistribution": {},
                    "totalPositiveReviews": 0,
                    "totalNegativeReviews": 0,
                    "overallReviewRate": 0.0,
                    "recentReviews": [],
                    "branchReviewStats": []
                }
            
            # Tổng hợp thành một dictionary với đầy đủ 6 API
            aggregated_data = {
                "date": target_date.isoformat(),
                "all_branches_revenue_metrics": all_revenue_data or {},
                "all_branches_customer_metrics": all_customer_data or {},
                "all_branches_product_metrics": all_product_data or {},
                "all_branches_review_metrics": all_review_data,
                "all_branches_stats": all_stats_data or {},
                "all_branches_revenue": all_revenue_range_data or {}
            }
            
            logger.info(f"Collected all branches data - Revenue: {bool(all_revenue_data)}, Customer: {bool(all_customer_data)}, Product: {bool(all_product_data)}, Review: {bool(all_review_data)}, Stats: {bool(all_stats_data)}, Revenue Range: {bool(all_revenue_range_data)}")
            
            return aggregated_data
            
        except Exception as e:
            logger.error(f"Error collecting all branches data: {e}", exc_info=True)
            return {
                "date": target_date.isoformat(),
                "all_branches_revenue_metrics": {},
                "all_branches_customer_metrics": {},
                "all_branches_product_metrics": {},
                "all_branches_review_metrics": {},
                "all_branches_stats": {},
                "all_branches_revenue": {},
                "error": str(e)
            }
    
    async def process_all_branches_with_ai(
        self,
        aggregated_data: Dict[str, Any],
        query: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Xử lý dữ liệu tất cả chi nhánh đã tổng hợp với AI sử dụng LangChain
        Tập trung vào đánh giá tình hình từng chi nhánh
        """
        if not self.llm:
            return {
                "success": False,
                "message": "OpenAI API key not configured"
            }
        
        try:
            # Chuyển đổi data thành JSON string để đưa vào prompt
            data_json = json.dumps(aggregated_data, indent=2, ensure_ascii=False)
            
            # System prompt cho admin - đánh giá tất cả chi nhánh
            system_prompt = self._get_admin_system_prompt()
            
            # Tạo user prompt
            if query:
                user_prompt = f"""
Dữ liệu thống kê của TẤT CẢ chi nhánh:
{data_json}

Câu hỏi cụ thể: {query}

Hãy phân tích dữ liệu và đánh giá tình hình từng chi nhánh, so sánh giữa các chi nhánh, và trả lời câu hỏi một cách chi tiết.
"""
            else:
                user_prompt = f"""
Dữ liệu thống kê của TẤT CẢ chi nhánh:
{data_json}

Hãy phân tích toàn diện và đánh giá tình hình TỪNG CHI NHÁNH, bao gồm:

1. TỔNG QUAN TẤT CẢ CHI NHÁNH:
   - Tổng doanh thu, số đơn hàng, số khách hàng
   - Chi nhánh hoạt động tốt nhất và kém nhất
   - So sánh hiệu suất giữa các chi nhánh

2. ĐÁNH GIÁ TỪNG CHI NHÁNH (liệt kê chi tiết cho từng chi nhánh):
   - Tên chi nhánh và ID
   - Điểm mạnh của chi nhánh
   - Điểm yếu và vấn đề cần chú ý
   - Đánh giá tổng thể (Tốt / Khá / Cần cải thiện / Nghiêm trọng)
   - Xếp hạng trong hệ thống

3. SO SÁNH VÀ PHÂN TÍCH:
   - Chi nhánh nào đang dẫn đầu về doanh thu, khách hàng, đánh giá
   - Chi nhánh nào cần hỗ trợ khẩn cấp
   - Xu hướng chung của toàn hệ thống

4. KHUYẾN NGHỊ CHO TỪNG CHI NHÁNH:
   - Khuyến nghị cụ thể cho từng chi nhánh dựa trên tình hình thực tế
   - Ưu tiên các chi nhánh cần hỗ trợ

5. KẾT LUẬN:
   - Tóm tắt tình hình tổng thể
   - Đề xuất hành động ưu tiên cho admin

Hãy trình bày rõ ràng, chi tiết và có cấu trúc để admin dễ dàng nắm bắt tình hình từng chi nhánh.
"""
            
            # Gọi LLM
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]
            
            response = self.llm.invoke(messages)
            analysis_text = response.content
            
            # Parse response để lấy summary và recommendations
            summary = self._extract_all_branches_summary(aggregated_data)
            recommendations = self._extract_recommendations(analysis_text)
            
            return {
                "success": True,
                "analysis": analysis_text,
                "summary": summary,
                "recommendations": recommendations
            }
            
        except Exception as e:
            logger.error(f"Error processing all branches with AI: {e}", exc_info=True)
            return {
                "success": False,
                "message": f"Error processing with AI: {str(e)}"
            }
    
    def _get_admin_system_prompt(self) -> str:
        """System prompt cho Admin - đánh giá tất cả chi nhánh"""
        return """Bạn là một chuyên gia phân tích dữ liệu cấp cao cho hệ thống quản lý cà phê.
Nhiệm vụ của bạn là đánh giá và phân tích tình hình TẤT CẢ các chi nhánh trong hệ thống.

Dữ liệu bạn nhận được bao gồm 6 API tổng hợp từ tất cả chi nhánh:
- All Branches Revenue Metrics: Tổng hợp doanh thu, số đơn, giá trị đơn trung bình từ tất cả chi nhánh
- All Branches Customer Metrics: Tổng hợp số lượng khách hàng, khách hàng mới, khách hàng quay lại từ tất cả chi nhánh
- All Branches Product Metrics: Tổng hợp sản phẩm bán được, sản phẩm bán chạy từ tất cả chi nhánh
- All Branches Review Metrics: Tổng hợp đánh giá khách hàng, điểm trung bình từ tất cả chi nhánh (bao gồm branchReviewStats để xem từng chi nhánh)
- All Branches Stats: Thống kê tổng hợp với branchSummaries cho từng chi nhánh
- All Branches Revenue: Doanh thu tổng hợp với branchRevenueDetails cho từng chi nhánh

QUAN TRỌNG:
- Bạn PHẢI đánh giá TỪNG CHI NHÁNH một cách chi tiết, không được bỏ sót
- So sánh hiệu suất giữa các chi nhánh để xác định chi nhánh tốt nhất và kém nhất
- Xác định các chi nhánh cần hỗ trợ khẩn cấp
- Đưa ra khuyến nghị cụ thể cho từng chi nhánh dựa trên dữ liệu thực tế
- Sử dụng dữ liệu từ branchReviewStats, branchSummaries, branchRevenueDetails để đánh giá từng chi nhánh

Hãy phân tích một cách chuyên nghiệp, đưa ra các insights cụ thể và khuyến nghị hành động cho admin.
Trả lời bằng tiếng Việt, rõ ràng, có cấu trúc và dễ hiểu."""
    
    def _extract_all_branches_summary(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Trích xuất summary từ dữ liệu tất cả chi nhánh"""
        revenue = data.get("all_branches_revenue_metrics", {})
        customer = data.get("all_branches_customer_metrics", {})
        product = data.get("all_branches_product_metrics", {})
        review = data.get("all_branches_review_metrics", {})
        stats = data.get("all_branches_stats", {})
        revenue_range = data.get("all_branches_revenue", {})
        
        # Convert BigDecimal to float if needed
        def safe_float(value, default=0):
            if value is None:
                return default
            if isinstance(value, (int, float)):
                return float(value)
            if hasattr(value, '__float__'):
                return float(value)
            return default
        
        return {
            # Overall Metrics
            "total_branches": stats.get("totalBranches", 0),
            "active_branches": stats.get("activeBranches", 0),
            "total_revenue": safe_float(revenue.get("totalRevenue")),
            "total_order_count": revenue.get("totalOrderCount", 0),
            "avg_order_value": safe_float(revenue.get("avgOrderValue")),
            # Customer Metrics
            "total_customer_count": customer.get("totalCustomerCount", 0),
            "total_new_customers": customer.get("totalNewCustomers", 0),
            "total_repeat_customers": customer.get("totalRepeatCustomers", 0),
            "overall_customer_retention_rate": safe_float(customer.get("overallCustomerRetentionRate")),
            # Product Metrics
            "total_unique_products_sold": product.get("totalUniqueProductsSold", 0),
            "overall_product_diversity_score": safe_float(product.get("overallProductDiversityScore")),
            # Review Metrics
            "overall_avg_review_score": safe_float(review.get("overallAvgReviewScore")),
            "total_reviews": review.get("totalReviews", 0),
            "total_positive_reviews": review.get("totalPositiveReviews", 0),
            "total_negative_reviews": review.get("totalNegativeReviews", 0),
            # Stats
            "average_revenue_per_branch": safe_float(stats.get("averageRevenuePerBranch")),
            "total_orders": stats.get("totalOrders", 0),
            "average_orders_per_branch": safe_float(stats.get("averageOrdersPerBranch")),
            # Revenue Range
            "total_revenue_range": safe_float(revenue_range.get("totalRevenue"))
        }