"""
AI Agent Service using LangChain + OpenAI GPT-4o
Tổng hợp dữ liệu từ các service (Tool 1: Revenue, Inventory, Material Cost; Tool 3: Review Metrics) và xử lý với AI
"""
import json
from datetime import date
from typing import Optional, Dict, Any
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from app.config import settings
from app.clients.order_client import OrderServiceClient
from app.clients.catalog_client import CatalogServiceClient
import logging

logger = logging.getLogger(__name__)


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
            
            # Tổng hợp thành một dictionary với đầy đủ 6 API
            aggregated_data = {
                "branch_id": branch_id,
                "date": target_date.isoformat(),
                "revenue_metrics": revenue_data or {},
                "customer_metrics": customer_data or {},
                "product_metrics": product_data or {},
                "review_metrics": review_data,
                "inventory_metrics": inventory_data or {},
                "material_cost_metrics": material_cost_data or {}
            }
            
            logger.info(f"Collected data from 6 APIs - Revenue: {bool(revenue_data)}, Customer: {bool(customer_data)}, Product: {bool(product_data)}, Review: {bool(review_data)}, Inventory: {bool(inventory_data)}, Material Cost: {bool(material_cost_data)}")
            
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
3. Các vấn đề cần chú ý
4. Khuyến nghị cụ thể để cải thiện
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

Dữ liệu bạn nhận được bao gồm (6 API):
- Revenue Metrics: Doanh thu, số đơn, giá trị đơn trung bình, giờ cao điểm
- Customer Metrics: Số lượng khách hàng, khách hàng mới, khách hàng quay lại
- Product Metrics: Số sản phẩm bán được, sản phẩm bán chạy, đa dạng sản phẩm
- Review Metrics: Đánh giá khách hàng, điểm trung bình, phản hồi tích cực/tiêu cực
- Inventory Metrics: Tồn kho, sản phẩm sắp hết, sản phẩm hết hàng
- Material Cost Metrics: Chi phí nguyên liệu

Hãy phân tích một cách chuyên nghiệp, đưa ra các insights cụ thể và khuyến nghị hành động.
Trả lời bằng tiếng Việt, rõ ràng và dễ hiểu."""
    
    def _get_tool3_system_prompt(self) -> str:
        """System prompt cho Tool3 (Phản hồi khách hàng)"""
        return """Bạn là một chuyên gia tư vấn quản lý cho hệ thống quản lý cà phê.
Nhiệm vụ của bạn là phân tích dữ liệu, đặc biệt tập trung vào phản hồi khách hàng và đưa ra các khuyến nghị chiến lược.

Dữ liệu bạn nhận được bao gồm (6 API):
- Revenue Metrics: Doanh thu, số đơn, giá trị đơn trung bình
- Customer Metrics: Số lượng khách hàng, khách hàng mới, khách hàng quay lại
- Product Metrics: Số sản phẩm bán được, sản phẩm bán chạy, đa dạng sản phẩm
- Review Metrics: Đánh giá khách hàng (điểm trung bình, tổng số đánh giá, phân bố điểm, phản hồi tích cực/tiêu cực, tỷ lệ đánh giá, các đánh giá gần đây)
- Inventory Metrics: Tồn kho, sản phẩm sắp hết, sản phẩm hết hàng
- Material Cost Metrics: Chi phí nguyên liệu

Hãy phân tích sâu về phản hồi khách hàng, kết hợp với dữ liệu doanh thu, khách hàng, sản phẩm và hoạt động để đưa ra các khuyến nghị chiến lược nhằm cải thiện trải nghiệm khách hàng và tối ưu hóa hoạt động kinh doanh.
Trả lời bằng tiếng Việt, chuyên nghiệp và có tính thực tiễn."""
    
    def _get_default_system_prompt(self) -> str:
        """System prompt mặc định"""
        return """Bạn là một chuyên gia phân tích dữ liệu cho hệ thống quản lý cà phê.
Nhiệm vụ của bạn là phân tích dữ liệu từ các service và đưa ra insights có giá trị.

Dữ liệu bạn nhận được bao gồm (6 API):
- Revenue Metrics: Doanh thu, số đơn, giá trị đơn trung bình, giờ cao điểm
- Customer Metrics: Số lượng khách hàng, khách hàng mới, khách hàng quay lại
- Product Metrics: Số sản phẩm bán được, sản phẩm bán chạy, đa dạng sản phẩm
- Review Metrics: Đánh giá khách hàng, điểm trung bình, phản hồi tích cực/tiêu cực
- Inventory Metrics: Tồn kho, sản phẩm sắp hết, sản phẩm hết hàng
- Material Cost Metrics: Chi phí nguyên liệu

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