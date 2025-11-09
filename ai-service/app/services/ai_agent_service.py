"""
AI Agent Service using LangChain + OpenAI GPT-4o
Tổng hợp 3 JSON từ các service và xử lý với AI
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
        
        # Initialize OpenAI LLM
        if settings.OPENAI_API_KEY:
            self.llm = ChatOpenAI(
                model=settings.OPENAI_MODEL,
                temperature=settings.OPENAI_TEMPERATURE,
                max_tokens=settings.OPENAI_MAX_TOKENS,
                api_key=settings.OPENAI_API_KEY
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
        Thu thập 3 JSON từ các service:
        1. Revenue metrics từ order-service
        2. Inventory metrics từ catalog-service
        3. Material cost metrics từ catalog-service
        """
        try:
            # 1. Revenue Metrics từ Order Service
            revenue_data = await self.order_client.get_revenue_metrics(
                branch_id, target_date
            )
            
            # 2. Inventory Metrics từ Catalog Service
            inventory_data = await self.catalog_client.get_inventory_metrics(
                branch_id, target_date
            )
            
            # 3. Material Cost Metrics từ Catalog Service
            material_cost_data = await self.catalog_client.get_material_cost_metrics(
                branch_id, target_date, target_date
            )
            
            # Tổng hợp thành một dictionary
            aggregated_data = {
                "branch_id": branch_id,
                "date": target_date.isoformat(),
                "revenue_metrics": revenue_data or {},
                "inventory_metrics": inventory_data or {},
                "material_cost_metrics": material_cost_data or {}
            }
            
            return aggregated_data
            
        except Exception as e:
            logger.error(f"Error collecting data: {e}", exc_info=True)
            return {
                "branch_id": branch_id,
                "date": target_date.isoformat(),
                "revenue_metrics": {},
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

Dữ liệu bạn nhận được bao gồm:
- Revenue Metrics: Doanh thu, số đơn, giá trị đơn trung bình, giờ cao điểm
- Inventory Metrics: Tồn kho, sản phẩm sắp hết, sản phẩm hết hàng
- Material Cost Metrics: Chi phí nguyên liệu

Hãy phân tích một cách chuyên nghiệp, đưa ra các insights cụ thể và khuyến nghị hành động.
Trả lời bằng tiếng Việt, rõ ràng và dễ hiểu."""
    
    def _get_tool3_system_prompt(self) -> str:
        """System prompt cho Tool3"""
        return """Bạn là một chuyên gia tư vấn quản lý cho hệ thống quản lý cà phê.
Nhiệm vụ của bạn là phân tích dữ liệu và đưa ra các khuyến nghị chiến lược.

Dữ liệu bạn nhận được bao gồm:
- Revenue Metrics: Doanh thu, số đơn, giá trị đơn trung bình
- Inventory Metrics: Tồn kho, sản phẩm sắp hết, sản phẩm hết hàng
- Material Cost Metrics: Chi phí nguyên liệu

Hãy phân tích và đưa ra các khuyến nghị chiến lược để tối ưu hóa hoạt động kinh doanh.
Trả lời bằng tiếng Việt, chuyên nghiệp và có tính thực tiễn."""
    
    def _get_default_system_prompt(self) -> str:
        """System prompt mặc định"""
        return """Bạn là một chuyên gia phân tích dữ liệu cho hệ thống quản lý cà phê.
Nhiệm vụ của bạn là phân tích dữ liệu từ các service và đưa ra insights có giá trị.

Hãy phân tích một cách chuyên nghiệp, đưa ra các insights cụ thể và khuyến nghị hành động.
Trả lời bằng tiếng Việt, rõ ràng và dễ hiểu."""
    
    def _extract_summary(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Trích xuất summary từ dữ liệu"""
        revenue = data.get("revenue_metrics", {})
        inventory = data.get("inventory_metrics", {})
        material_cost = data.get("material_cost_metrics", {})
        
        return {
            "total_revenue": revenue.get("totalRevenue", 0),
            "order_count": revenue.get("orderCount", 0),
            "avg_order_value": revenue.get("avgOrderValue", 0),
            "low_stock_count": inventory.get("lowStockProducts", 0),
            "out_of_stock_count": inventory.get("outOfStockProducts", 0),
            "total_material_cost": material_cost.get("totalMaterialCost", 0),
            "profit_margin": (
                revenue.get("totalRevenue", 0) - material_cost.get("totalMaterialCost", 0)
                if revenue.get("totalRevenue", 0) > 0 else 0
            )
        }
    
    def _extract_recommendations(self, analysis_text: str) -> list[str]:
        """Trích xuất recommendations từ analysis text (simple extraction)"""
        recommendations = []
        lines = analysis_text.split('\n')
        
        for line in lines:
            line = line.strip()
            # Tìm các dòng có dấu hiệu là recommendation
            if any(keyword in line.lower() for keyword in ['khuyến nghị', 'nên', 'cần', 'đề xuất', '-']):
                if len(line) > 10:  # Bỏ qua các dòng quá ngắn
                    recommendations.append(line)
        
        # Giới hạn số lượng recommendations
        return recommendations[:5] if recommendations else []

