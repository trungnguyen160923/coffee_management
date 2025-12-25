"""
AI Agent Service using LangChain + OpenAI GPT-4o

IMPORTANT (Dec 2025):
- Thay vì gọi 6 API (order-service + catalog-service) để lấy số liệu thống kê,
  service này sẽ ưu tiên đọc trực tiếp từ bảng `daily_branch_metrics` trong `analytics_db`.
- Để tránh phá vỡ các phần còn lại (ConfidenceService, summary extraction, prompt),
  payload vẫn giữ shape `revenue_metrics/customer_metrics/...` nhưng dữ liệu được map từ DB.
"""
import json
import sys
import asyncio
from datetime import date
from pathlib import Path
from typing import Optional, Dict, Any
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from app.config import settings
from app.clients.order_client import OrderServiceClient
from app.clients.catalog_client import CatalogServiceClient
from app.services.confidence_service import ConfidenceService
from app.database import SessionLocal
from app.models.daily_metrics import DailyBranchMetrics
import logging

logger = logging.getLogger(__name__)

# TOOL2 modules are now in app.TOOL2.src


class AIAgentService:
    """Service to aggregate data and process with AI using LangChain"""
    
    def __init__(self):
        self.order_client = OrderServiceClient()
        self.catalog_client = CatalogServiceClient()
        self.confidence_service = ConfidenceService()
        
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

    @staticmethod
    def _safe_float(value: Any, default: float = 0.0) -> float:
        """Convert Decimal/Numeric/None to float safely."""
        if value is None:
            return default
        if isinstance(value, (int, float)):
            return float(value)
        if hasattr(value, "__float__"):
            try:
                return float(value)
            except Exception:
                return default
        return default

    def _get_daily_branch_metrics_row(
        self,
        branch_id: int,
        target_date: date,
    ) -> Optional[DailyBranchMetrics]:
        """Fetch a single DailyBranchMetrics row for branch/date from analytics_db."""
        db = SessionLocal()
        try:
            return (
                db.query(DailyBranchMetrics)
                .filter(
                    DailyBranchMetrics.branch_id == branch_id,
                    DailyBranchMetrics.report_date == target_date,
                )
                .first()
            )
        finally:
            db.close()

    def _serialize_daily_branch_metrics(
        self,
        row: Optional[DailyBranchMetrics],
    ) -> Dict[str, Any]:
        """Serialize `daily_branch_metrics` row to JSON-friendly dict (new canonical payload)."""
        if row is None:
            return {
                "branch_id": None,
                "report_date": None,
            }

        return {
            "branch_id": int(row.branch_id),
            "report_date": row.report_date.isoformat() if row.report_date else None,
            "total_revenue": self._safe_float(row.total_revenue, 0.0),
            "order_count": int(row.order_count or 0),
            "avg_order_value": self._safe_float(row.avg_order_value, 0.0),
            "customer_count": int(row.customer_count or 0),
            "repeat_customers": int(row.repeat_customers or 0),
            "new_customers": int(row.new_customers or 0),
            "unique_products_sold": int(row.unique_products_sold or 0),
            "top_selling_product_id": row.top_selling_product_id,
            "product_diversity_score": self._safe_float(row.product_diversity_score, 0.0),
            "peak_hour": int(row.peak_hour or 0),
            "day_of_week": int(row.day_of_week or 0) if row.day_of_week is not None else None,
            "is_weekend": bool(row.is_weekend) if row.is_weekend is not None else None,
            "avg_preparation_time_seconds": int(row.avg_preparation_time_seconds or 0) if row.avg_preparation_time_seconds is not None else None,
            "staff_efficiency_score": self._safe_float(row.staff_efficiency_score, 0.0) if row.staff_efficiency_score is not None else None,
            "avg_review_score": float(row.avg_review_score or 0.0),
            "material_cost": self._safe_float(row.material_cost, 0.0),
            "waste_percentage": self._safe_float(row.waste_percentage, 0.0) if row.waste_percentage is not None else None,
            "low_stock_products": int(row.low_stock_products or 0),
            "out_of_stock_products": int(row.out_of_stock_products or 0),
            "created_at": row.created_at.isoformat() if getattr(row, "created_at", None) else None,
        }

    def _derive_branch_kpis(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Compute common KPIs from daily_branch_metrics row (profit, retention, etc.)."""
        total_revenue = self._safe_float(metrics.get("total_revenue"), 0.0)
        material_cost = self._safe_float(metrics.get("material_cost"), 0.0)
        customer_count = int(metrics.get("customer_count") or 0)
        repeat_customers = int(metrics.get("repeat_customers") or 0)
        order_count = int(metrics.get("order_count") or 0)

        profit = total_revenue - material_cost
        profit_margin = (profit / total_revenue) if total_revenue > 0 else 0.0
        retention_rate = (repeat_customers / customer_count) if customer_count > 0 else 0.0
        orders_per_customer = (order_count / customer_count) if customer_count > 0 else 0.0

        return {
            "profit": profit,
            "profit_margin": profit_margin,
            "customer_retention_rate": retention_rate,
            "orders_per_customer": orders_per_customer,
        }
    
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
            from app.TOOL2.src.infrastructure.database.connection import DatabaseConnection
            from app.TOOL2.src.infrastructure.repositories.metrics_repository_impl import MetricsRepositoryImpl
            from app.TOOL2.src.infrastructure.repositories.model_repository_impl import ModelRepositoryImpl
            from app.TOOL2.src.infrastructure.ml.ml_predictor import MLPredictor
            from app.TOOL2.src.infrastructure.ml.weekday_comparator_db import WeekdayComparatorDB
            from app.TOOL2.src.presentation.predict_iforest_for_date_db import (
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
            from app.TOOL2.src.infrastructure.database.connection import DatabaseConnection
            from app.TOOL2.src.infrastructure.repositories.metrics_repository_impl import MetricsRepositoryImpl
            from app.TOOL2.src.infrastructure.repositories.model_repository_impl import ModelRepositoryImpl
            from app.TOOL2.src.infrastructure.repositories.forecast_repository_impl import ForecastRepositoryImpl
            from app.TOOL2.src.application.use_cases.predict_forecast_use_case import PredictForecastUseCase
            from app.TOOL2.src.presentation.predict_forecast_db import (
                create_forecast_json_output,
                calculate_confidence_percentage
            )
            from app.TOOL2.src.presentation.evaluate_forecast_confidence import calculate_confidence_score
            
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
        Thu thập dữ liệu thống kê cho 1 chi nhánh.

        Trước đây dùng 6 API (order-service + catalog-service). Hiện tại ưu tiên đọc từ
        bảng `analytics_db.daily_branch_metrics` và map sang cùng shape payload cũ
        (`revenue_metrics/customer_metrics/...`) để tương thích downstream.
        """
        try:
            # 1) Load daily metrics row from DB
            row = self._get_daily_branch_metrics_row(branch_id, target_date)
            daily_metrics = self._serialize_daily_branch_metrics(row)
            derived = self._derive_branch_kpis(daily_metrics) if row else {}

            # 7. Isolation Forest Anomaly Detection JSON
            isolation_forest_data = self.get_isolation_forest_json(branch_id, target_date)
            
            # 8. Prophet Forecast JSON
            prophet_forecast_data = self.get_prophet_forecast_json(branch_id, target_date)
            
            # Tổng hợp: chỉ dùng dữ liệu daily_branch_metrics (không còn format 6 API)
            aggregated_data = {
                "source": "daily_branch_metrics",
                "branch_id": branch_id,
                "report_date": target_date.isoformat(),
                "daily_branch_metrics": daily_metrics,
                "derived_kpis": derived,
                "isolation_forest_anomaly": isolation_forest_data or {},
                "prophet_forecast": prophet_forecast_data or {}
            }
            
            # Tính Data Quality Score và ML Confidence Score
            try:
                data_quality_score = self.confidence_service.calculate_data_quality_score(
                    aggregated_data, target_date
                )
                ml_confidence_score = self.confidence_service.calculate_ml_confidence_score(
                    aggregated_data
                )
                
                # Thêm confidence scores vào aggregated_data
                aggregated_data["data_quality_score"] = data_quality_score
                aggregated_data["ml_confidence_score"] = ml_confidence_score
                
                logger.info(
                    f"Confidence scores calculated - "
                    f"Data Quality: {data_quality_score:.2f}, "
                    f"ML Confidence: {ml_confidence_score:.2f}"
                )
            except Exception as e:
                logger.warning(f"Error calculating confidence scores: {e}", exc_info=True)
                # Vẫn tiếp tục nếu tính confidence lỗi
                aggregated_data["data_quality_score"] = 0.0
                aggregated_data["ml_confidence_score"] = 0.0
            
            logger.info(
                "Collected data from daily_branch_metrics + 2 ML predictions - "
                f"HasRow: {bool(row)}, IsolationForest: {bool(isolation_forest_data)}, Prophet: {bool(prophet_forecast_data)}"
            )
            
            return aggregated_data
            
        except Exception as e:
            logger.error(f"Error collecting data: {e}", exc_info=True)
            return {
                "source": "daily_branch_metrics",
                "branch_id": branch_id,
                "report_date": target_date.isoformat(),
                "daily_branch_metrics": {},
                "derived_kpis": {},
                "isolation_forest_anomaly": {},
                "prophet_forecast": {},
                "data_quality_score": 0.0,
                "ml_confidence_score": 0.0,
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
            
            # Tính AI Quality Score
            try:
                ai_quality_score = self.confidence_service.calculate_ai_quality_score(
                    analysis_text, aggregated_data
                )
                logger.info(f"AI Quality Score calculated: {ai_quality_score:.2f}")
            except Exception as e:
                logger.warning(f"Error calculating AI quality score: {e}", exc_info=True)
                ai_quality_score = 0.5  # Default: trung bình
            
            # Tính Overall Confidence Score
            try:
                data_quality_score = aggregated_data.get("data_quality_score", 0.0)
                ml_confidence_score = aggregated_data.get("ml_confidence_score", 0.0)
                branch_id = aggregated_data.get("branch_id")
                
                overall_confidence = self.confidence_service.calculate_overall_confidence(
                    data_quality_score=data_quality_score,
                    ml_confidence_score=ml_confidence_score,
                    ai_quality_score=ai_quality_score,
                    historical_accuracy_score=None,  # Sẽ tự tính từ database
                    branch_id=branch_id,
                    aggregated_data=aggregated_data
                )
                logger.info(f"Overall Confidence Score calculated: {overall_confidence.get('overall', 0.0):.2f} ({overall_confidence.get('level', 'UNKNOWN')})")
            except Exception as e:
                logger.warning(f"Error calculating overall confidence: {e}", exc_info=True)
                overall_confidence = {
                    "overall": 0.5,
                    "breakdown": {},
                    "level": "MEDIUM",
                    "warnings": []
                }
            
            return {
                "success": True,
                "analysis": analysis_text,
                "summary": summary,
                "recommendations": recommendations,
                "ai_quality_score": ai_quality_score,
                "overall_confidence": overall_confidence
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

Dữ liệu bạn nhận được được lấy từ bảng `daily_branch_metrics` (theo ngày) và 2 ML predictions:
- daily_branch_metrics: tổng doanh thu, số đơn, giá trị đơn trung bình, khách hàng, sản phẩm, tồn kho, chi phí...
- derived_kpis: các KPI suy ra (profit, profit_margin, retention_rate...)
- anomaly_detection: dự đoán bất thường (chứa danh sách các chỉ tiêu bất thường)
- forecast: dự báo tương lai

QUAN TRỌNG: 
- Khi phân tích các vấn đề bất thường, bạn PHẢI liệt kê TẤT CẢ các chỉ tiêu bất thường, không được bỏ sót bất kỳ chỉ tiêu nào. Format ngắn gọn: chỉ cần tên chỉ tiêu, mức độ thay đổi (tăng/giảm %).
- TUYỆT ĐỐI KHÔNG được đề cập đến tên thuật toán (Isolation Forest, Prophet) trong báo cáo cuối cùng. Chỉ nói "dự đoán bất thường", "dự báo tương lai" hoặc tương tự.

Hãy phân tích một cách chuyên nghiệp, đưa ra các insights cụ thể và khuyến nghị hành động.
Trả lời bằng tiếng Việt, rõ ràng và dễ hiểu."""
    
    def _get_tool3_system_prompt(self) -> str:
        """System prompt cho Tool3 (Phản hồi khách hàng)"""
        return """Bạn là một chuyên gia tư vấn quản lý cho hệ thống quản lý cà phê.
Nhiệm vụ của bạn là phân tích dữ liệu, đặc biệt tập trung vào phản hồi khách hàng và đưa ra các khuyến nghị chiến lược.

Dữ liệu bạn nhận được được lấy từ bảng `daily_branch_metrics` (theo ngày) và 2 ML predictions:
- daily_branch_metrics: doanh thu, đơn, khách, sản phẩm, điểm review, tồn kho, chi phí...
- derived_kpis: các KPI suy ra (profit, profit_margin, retention_rate...)
- anomaly_detection: dự đoán bất thường
- forecast: dự báo tương lai

QUAN TRỌNG: 
- Khi phân tích các vấn đề bất thường, bạn PHẢI liệt kê TẤT CẢ các chỉ tiêu bất thường, không được bỏ sót bất kỳ chỉ tiêu nào. Format ngắn gọn: chỉ cần tên chỉ tiêu, mức độ thay đổi (tăng/giảm %).
- TUYỆT ĐỐI KHÔNG được đề cập đến tên thuật toán (Isolation Forest, Prophet) trong báo cáo cuối cùng. Chỉ nói "dự đoán bất thường", "dự báo tương lai" hoặc tương tự.

Hãy phân tích sâu về phản hồi khách hàng, kết hợp với dữ liệu doanh thu, khách hàng, sản phẩm và hoạt động để đưa ra các khuyến nghị chiến lược nhằm cải thiện trải nghiệm khách hàng và tối ưu hóa hoạt động kinh doanh.
Trả lời bằng tiếng Việt, chuyên nghiệp và có tính thực tiễn."""
    
    def _get_default_system_prompt(self) -> str:
        """System prompt mặc định"""
        return """Bạn là một chuyên gia phân tích dữ liệu cho hệ thống quản lý cà phê.
Nhiệm vụ của bạn là phân tích dữ liệu từ các service và đưa ra insights có giá trị.

Dữ liệu bạn nhận được được lấy từ bảng `daily_branch_metrics` (theo ngày) và 2 ML predictions:
- daily_branch_metrics: tổng doanh thu, số đơn, AOV, khách hàng, sản phẩm, điểm review, tồn kho, chi phí...
- derived_kpis: các KPI suy ra (profit, profit_margin, retention_rate...)
- anomaly_detection: dự đoán bất thường
- forecast: dự báo tương lai

QUAN TRỌNG: 
- Khi phân tích các vấn đề bất thường, bạn PHẢI liệt kê TẤT CẢ các chỉ tiêu bất thường, không được bỏ sót bất kỳ chỉ tiêu nào. Format ngắn gọn: chỉ cần tên chỉ tiêu, mức độ thay đổi (tăng/giảm %).
- TUYỆT ĐỐI KHÔNG được đề cập đến tên thuật toán (Isolation Forest, Prophet) trong báo cáo cuối cùng. Chỉ nói "dự đoán bất thường", "dự báo tương lai" hoặc tương tự.

Hãy phân tích một cách chuyên nghiệp, đưa ra các insights cụ thể và khuyến nghị hành động.
Trả lời bằng tiếng Việt, rõ ràng và dễ hiểu."""
    
    def _extract_summary(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Trích xuất summary từ dữ liệu daily_branch_metrics (không còn 6 API)."""
        metrics = data.get("daily_branch_metrics", {}) if isinstance(data.get("daily_branch_metrics"), dict) else {}
        derived = data.get("derived_kpis", {}) if isinstance(data.get("derived_kpis"), dict) else {}

        total_revenue = self._safe_float(metrics.get("total_revenue"), 0.0)
        material_cost = self._safe_float(metrics.get("material_cost"), 0.0)

        return {
            "total_revenue": total_revenue,
            "order_count": int(metrics.get("order_count") or 0),
            "avg_order_value": self._safe_float(metrics.get("avg_order_value"), 0.0),
            "peak_hour": int(metrics.get("peak_hour") or 0),
            "customer_count": int(metrics.get("customer_count") or 0),
            "new_customers": int(metrics.get("new_customers") or 0),
            "repeat_customers": int(metrics.get("repeat_customers") or 0),
            "customer_retention_rate": self._safe_float(derived.get("customer_retention_rate"), 0.0),
            "unique_products_sold": int(metrics.get("unique_products_sold") or 0),
            "product_diversity_score": self._safe_float(metrics.get("product_diversity_score"), 0.0),
            "top_selling_product_id": metrics.get("top_selling_product_id"),
            "avg_review_score": self._safe_float(metrics.get("avg_review_score"), 0.0),
            "low_stock_products": int(metrics.get("low_stock_products") or 0),
            "out_of_stock_products": int(metrics.get("out_of_stock_products") or 0),
            "total_material_cost": material_cost,
            "profit": self._safe_float(derived.get("profit"), total_revenue - material_cost),
            "profit_margin": self._safe_float(derived.get("profit_margin"), 0.0),
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
        target_date: date,
        include_ml: bool = True,
        ml_branch_limit: int = 10,
        ml_concurrency: int = 4,
    ) -> Dict[str, Any]:
        """
        Thu thập dữ liệu thống kê cho TẤT CẢ chi nhánh từ `daily_branch_metrics`.

        Optionally enrich a subset of branches with:
        - `isolation_forest_anomaly`
        - `prophet_forecast`

        Notes:
        - ML enrichment can be expensive; use `ml_branch_limit` + `ml_concurrency` to control cost.
        """
        try:
            db = SessionLocal()
            try:
                rows = (
                    db.query(DailyBranchMetrics)
                    .filter(DailyBranchMetrics.report_date == target_date)
                    .order_by(DailyBranchMetrics.branch_id.asc())
                    .all()
                )
            finally:
                db.close()

            branches: list[Dict[str, Any]] = []
            total_revenue = 0.0
            total_orders = 0
            total_customers = 0
            total_new_customers = 0
            total_repeat_customers = 0
            total_unique_products_sold = 0
            sum_product_diversity = 0.0
            sum_review_score = 0.0
            review_count = 0
            total_material_cost = 0.0

            for row in rows:
                daily_metrics = self._serialize_daily_branch_metrics(row)
                derived_kpis = self._derive_branch_kpis(daily_metrics)

                branch_total_revenue = self._safe_float(daily_metrics.get("total_revenue"), 0.0)
                branch_orders = int(daily_metrics.get("order_count") or 0)
                branch_customers = int(daily_metrics.get("customer_count") or 0)
                branch_new_customers = int(daily_metrics.get("new_customers") or 0)
                branch_repeat_customers = int(daily_metrics.get("repeat_customers") or 0)
                branch_unique_products_sold = int(daily_metrics.get("unique_products_sold") or 0)
                branch_product_diversity = self._safe_float(daily_metrics.get("product_diversity_score"), 0.0)
                branch_review_score = self._safe_float(daily_metrics.get("avg_review_score"), 0.0)
                branch_material_cost = self._safe_float(daily_metrics.get("material_cost"), 0.0)

                total_revenue += branch_total_revenue
                total_orders += branch_orders
                total_customers += branch_customers
                total_new_customers += branch_new_customers
                total_repeat_customers += branch_repeat_customers
                total_unique_products_sold += branch_unique_products_sold
                sum_product_diversity += branch_product_diversity
                total_material_cost += branch_material_cost
                if branch_review_score > 0:
                    sum_review_score += branch_review_score
                    review_count += 1

                branches.append({
                    "branch_id": int(row.branch_id),
                    "report_date": target_date.isoformat(),
                    "daily_branch_metrics": daily_metrics,
                    "derived_kpis": derived_kpis,
                    # ML enrichment is added later (optional)
                    "isolation_forest_anomaly": {},
                    "prophet_forecast": {},
                })

            avg_order_value = (total_revenue / total_orders) if total_orders > 0 else 0.0
            overall_customer_retention_rate = (total_repeat_customers / total_customers) if total_customers > 0 else 0.0
            overall_product_diversity_score = (sum_product_diversity / len(rows)) if rows else 0.0
            overall_avg_review_score = (sum_review_score / review_count) if review_count > 0 else 0.0
            total_profit = total_revenue - total_material_cost
            overall_profit_margin = (total_profit / total_revenue) if total_revenue > 0 else 0.0

            active_branches = 0
            for b in branches:
                dm = b.get("daily_branch_metrics", {}) or {}
                if self._safe_float(dm.get("total_revenue"), 0.0) > 0 or int(dm.get("order_count") or 0) > 0:
                    active_branches += 1

            # Top/Bottom branches by revenue
            branches_sorted_by_revenue = sorted(
                branches,
                key=lambda x: self._safe_float((x.get("daily_branch_metrics", {}) or {}).get("total_revenue"), 0.0),
                reverse=True
            )

            # Optional ML enrichment for a subset of branches (default: top N by revenue)
            enriched_branches_count = 0
            if include_ml and ml_branch_limit > 0 and branches_sorted_by_revenue:
                # Bound concurrency to at least 1
                ml_concurrency = max(1, int(ml_concurrency or 1))
                limit = max(1, int(ml_branch_limit))
                targets = branches_sorted_by_revenue[:min(limit, len(branches_sorted_by_revenue))]

                sem = asyncio.Semaphore(ml_concurrency)

                async def enrich_one(branch_obj: Dict[str, Any]) -> None:
                    nonlocal enriched_branches_count
                    bid = int(branch_obj.get("branch_id") or 0)
                    if bid <= 0:
                        return
                    async with sem:
                        # Run sync ML calls in thread to avoid blocking the event loop.
                        iso = await asyncio.to_thread(self.get_isolation_forest_json, bid, target_date)
                        fc = await asyncio.to_thread(self.get_prophet_forecast_json, bid, target_date)
                        branch_obj["isolation_forest_anomaly"] = iso or {}
                        branch_obj["prophet_forecast"] = fc or {}
                        enriched_branches_count += 1

                await asyncio.gather(*[enrich_one(b) for b in targets])

            aggregated_data = {
                "source": "daily_branch_metrics",
                "report_date": target_date.isoformat(),
                "branches": branches,
                "totals": {
                    "total_branches": len(branches),
                    "active_branches": active_branches,
                    "total_revenue": total_revenue,
                    "total_order_count": total_orders,
                    "avg_order_value": avg_order_value,
                    "total_customer_count": total_customers,
                    "total_new_customers": total_new_customers,
                    "total_repeat_customers": total_repeat_customers,
                    "overall_customer_retention_rate": overall_customer_retention_rate,
                    "total_unique_products_sold": total_unique_products_sold,
                    "overall_product_diversity_score": overall_product_diversity_score,
                    "overall_avg_review_score": overall_avg_review_score,
                    "total_material_cost": total_material_cost,
                    "total_profit": total_profit,
                    "overall_profit_margin": overall_profit_margin,
                },
                "ml_enrichment": {
                    "enabled": bool(include_ml),
                    "branches_processed": enriched_branches_count,
                    "ml_branch_limit": int(ml_branch_limit),
                    "ml_concurrency": int(ml_concurrency),
                },
                "rankings": {
                    "top_revenue_branches": [
                        {"branch_id": b["branch_id"], "total_revenue": self._safe_float((b.get("daily_branch_metrics", {}) or {}).get("total_revenue"), 0.0)}
                        for b in branches_sorted_by_revenue[:5]
                    ],
                    "bottom_revenue_branches": [
                        {"branch_id": b["branch_id"], "total_revenue": self._safe_float((b.get("daily_branch_metrics", {}) or {}).get("total_revenue"), 0.0)}
                        for b in list(reversed(branches_sorted_by_revenue[-5:]))
                    ] if len(branches_sorted_by_revenue) >= 5 else [
                        {"branch_id": b["branch_id"], "total_revenue": self._safe_float((b.get("daily_branch_metrics", {}) or {}).get("total_revenue"), 0.0)}
                        for b in list(reversed(branches_sorted_by_revenue))
                    ],
                }
            }

            logger.info(f"Collected all branches data from daily_branch_metrics - branches={len(branches)}")
            return aggregated_data
            
        except Exception as e:
            logger.error(f"Error collecting all branches data: {e}", exc_info=True)
            return {
                "source": "daily_branch_metrics",
                "report_date": target_date.isoformat(),
                "branches": [],
                "totals": {},
                "ml_enrichment": {},
                "rankings": {},
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
            
            # Tính AI Quality Score
            try:
                ai_quality_score = self.confidence_service.calculate_ai_quality_score(
                    analysis_text, aggregated_data
                )
                logger.info(f"AI Quality Score (all branches) calculated: {ai_quality_score:.2f}")
            except Exception as e:
                logger.warning(f"Error calculating AI quality score: {e}", exc_info=True)
                ai_quality_score = 0.5  # Default: trung bình
            
            # Tính Overall Confidence Score
            try:
                # Lấy data_quality và ml_confidence từ aggregated_data (nếu có)
                data_quality_score = aggregated_data.get("data_quality_score", 0.0)
                ml_confidence_score = aggregated_data.get("ml_confidence_score", 0.0)
                # Với all branches, không có branch_id cụ thể, dùng None
                branch_id = aggregated_data.get("branch_id")  # Có thể là None
                
                overall_confidence = self.confidence_service.calculate_overall_confidence(
                    data_quality_score=data_quality_score,
                    ml_confidence_score=ml_confidence_score,
                    ai_quality_score=ai_quality_score,
                    historical_accuracy_score=None,  # Sẽ tự tính từ database nếu có branch_id
                    branch_id=branch_id,
                    aggregated_data=aggregated_data
                )
                logger.info(f"Overall Confidence Score (all branches) calculated: {overall_confidence.get('overall', 0.0):.2f} ({overall_confidence.get('level', 'UNKNOWN')})")
            except Exception as e:
                logger.warning(f"Error calculating overall confidence: {e}", exc_info=True)
                overall_confidence = {
                    "overall": 0.5,
                    "breakdown": {},
                    "level": "MEDIUM",
                    "warnings": []
                }
            
            return {
                "success": True,
                "analysis": analysis_text,
                "summary": summary,
                "recommendations": recommendations,
                "ai_quality_score": ai_quality_score,
                "overall_confidence": overall_confidence
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

Dữ liệu bạn nhận được được tổng hợp từ bảng `daily_branch_metrics` và có cấu trúc:
- `branches`: danh sách từng chi nhánh, mỗi phần tử có `branch_id` và các nhóm chỉ số:
  - daily_branch_metrics: các cột gốc theo ngày (doanh thu, đơn, khách, sản phẩm, tồn kho, chi phí...)
  - derived_kpis: KPI suy ra (profit, profit_margin, retention_rate...)
  - isolation_forest_anomaly: kết quả phát hiện bất thường (nếu có)
  - prophet_forecast: kết quả dự báo tương lai (nếu có)
- `totals`: tổng hợp toàn hệ thống
- `rankings`: top/bottom chi nhánh theo doanh thu

QUAN TRỌNG:
- Bạn PHẢI đánh giá TỪNG CHI NHÁNH một cách chi tiết, không được bỏ sót
- So sánh hiệu suất giữa các chi nhánh để xác định chi nhánh tốt nhất và kém nhất
- Xác định các chi nhánh cần hỗ trợ khẩn cấp
- Đưa ra khuyến nghị cụ thể cho từng chi nhánh dựa trên dữ liệu thực tế
- Ưu tiên dựa vào `branches[]` + `totals` + `rankings` để đánh giá từng chi nhánh
- Nếu có `isolation_forest_anomaly` hoặc `prophet_forecast`, hãy tận dụng để nêu rủi ro và xu hướng (KHÔNG nhắc tên thuật toán trong báo cáo)

Hãy phân tích một cách chuyên nghiệp, đưa ra các insights cụ thể và khuyến nghị hành động cho admin.
Trả lời bằng tiếng Việt, rõ ràng, có cấu trúc và dễ hiểu."""
    
    def _extract_all_branches_summary(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Trích xuất summary từ dữ liệu tất cả chi nhánh"""
        totals = data.get("totals", {}) if isinstance(data.get("totals"), dict) else {}
        rankings = data.get("rankings", {}) if isinstance(data.get("rankings"), dict) else {}

        return {
            "total_branches": int(totals.get("total_branches", 0) or 0),
            "active_branches": int(totals.get("active_branches", 0) or 0),
            "total_revenue": self._safe_float(totals.get("total_revenue"), 0.0),
            "total_order_count": int(totals.get("total_order_count", 0) or 0),
            "avg_order_value": self._safe_float(totals.get("avg_order_value"), 0.0),
            "total_customer_count": int(totals.get("total_customer_count", 0) or 0),
            "total_new_customers": int(totals.get("total_new_customers", 0) or 0),
            "total_repeat_customers": int(totals.get("total_repeat_customers", 0) or 0),
            "overall_customer_retention_rate": self._safe_float(totals.get("overall_customer_retention_rate"), 0.0),
            "total_unique_products_sold": int(totals.get("total_unique_products_sold", 0) or 0),
            "overall_product_diversity_score": self._safe_float(totals.get("overall_product_diversity_score"), 0.0),
            "overall_avg_review_score": self._safe_float(totals.get("overall_avg_review_score"), 0.0),
            "total_material_cost": self._safe_float(totals.get("total_material_cost"), 0.0),
            "total_profit": self._safe_float(totals.get("total_profit"), 0.0),
            "overall_profit_margin": self._safe_float(totals.get("overall_profit_margin"), 0.0),
            "top_revenue_branches": rankings.get("top_revenue_branches", []),
            "bottom_revenue_branches": rankings.get("bottom_revenue_branches", []),
        }