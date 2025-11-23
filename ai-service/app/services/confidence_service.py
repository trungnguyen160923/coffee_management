"""
Confidence Scoring Service
Tính toán độ tin cậy cho báo cáo AI dựa trên:
1. Data Quality Score
2. ML Confidence Score
3. AI Response Quality Score
4. Overall Confidence Score
"""
from typing import Dict, Any, Optional, List, Set
from datetime import date, datetime
import re
import logging

logger = logging.getLogger(__name__)


class ConfidenceService:
    """Service to calculate confidence scores for AI reports"""
    
    def __init__(self):
        pass
    
    def calculate_data_quality_score(
        self,
        aggregated_data: Dict[str, Any],
        target_date: Optional[date] = None
    ) -> float:
        """
        Tính điểm chất lượng dữ liệu đầu vào
        
        Args:
            aggregated_data: Dictionary chứa dữ liệu đã tổng hợp từ 8 sources
            target_date: Ngày target (nếu None, lấy từ aggregated_data)
        
        Returns:
            float: Điểm từ 0.0 đến 1.0 (hoặc 0-100)
        
        Công thức:
        - API Success Rate (40%): Số API thành công / tổng số API
        - Data Completeness (30%): Tỷ lệ non-null trong các response
        - Data Freshness (30%): Độ mới của dữ liệu
        """
        try:
            # Danh sách 8 sources cần kiểm tra
            data_sources = [
                "revenue_metrics",
                "customer_metrics",
                "product_metrics",
                "review_metrics",
                "inventory_metrics",
                "material_cost_metrics",
                "isolation_forest_anomaly",
                "prophet_forecast"
            ]
            
            # 1. Tính API Success Rate (40%)
            successful_apis = 0
            total_non_null_ratios = []
            
            for source_key in data_sources:
                source_data = aggregated_data.get(source_key, {})
                
                # Kiểm tra API thành công (không phải empty dict và không có error)
                if source_data and isinstance(source_data, dict):
                    # Không phải empty dict
                    if len(source_data) > 0:
                        # Không có error field
                        if "error" not in source_data:
                            successful_apis += 1
                            
                            # Tính non-null ratio cho source này
                            non_null_ratio = self._calculate_non_null_ratio(source_data)
                            total_non_null_ratios.append(non_null_ratio)
            
            api_success_rate = successful_apis / len(data_sources) if len(data_sources) > 0 else 0.0
            
            # 2. Tính Data Completeness (30%)
            avg_non_null_ratio = (
                sum(total_non_null_ratios) / len(total_non_null_ratios)
                if len(total_non_null_ratios) > 0
                else 0.0
            )
            
            # 3. Tính Data Freshness (30%)
            freshness_score = self._calculate_data_freshness(
                aggregated_data, target_date
            )
            
            # Tính tổng điểm
            data_quality_score = (
                api_success_rate * 0.4 +
                avg_non_null_ratio * 0.3 +
                freshness_score * 0.3
            )
            
            # Đảm bảo score trong khoảng 0-1
            data_quality_score = max(0.0, min(1.0, data_quality_score))
            
            logger.info(
                f"Data Quality Score calculated: {data_quality_score:.2f} "
                f"(API Success: {api_success_rate:.2f}, "
                f"Completeness: {avg_non_null_ratio:.2f}, "
                f"Freshness: {freshness_score:.2f})"
            )
            
            return data_quality_score
            
        except Exception as e:
            logger.error(f"Error calculating data quality score: {e}", exc_info=True)
            return 0.0
    
    def _calculate_non_null_ratio(self, data: Dict[str, Any]) -> float:
        """
        Tính tỷ lệ non-null trong một dictionary
        
        Args:
            data: Dictionary cần kiểm tra
        
        Returns:
            float: Tỷ lệ non-null từ 0.0 đến 1.0
        """
        if not data or not isinstance(data, dict):
            return 0.0
        
        total_fields = 0
        non_null_fields = 0
        
        def count_fields(obj, depth=0):
            """Recursively count fields"""
            nonlocal total_fields, non_null_fields
            
            # Giới hạn depth để tránh vòng lặp vô hạn
            if depth > 5:
                return
            
            if isinstance(obj, dict):
                for key, value in obj.items():
                    total_fields += 1
                    if value is not None:
                        non_null_fields += 1
                        # Recursively check nested structures
                        if isinstance(value, (dict, list)):
                            count_fields(value, depth + 1)
            elif isinstance(obj, list):
                for item in obj:
                    total_fields += 1
                    if item is not None:
                        non_null_fields += 1
                        if isinstance(item, (dict, list)):
                            count_fields(item, depth + 1)
            else:
                total_fields += 1
                if obj is not None:
                    non_null_fields += 1
        
        count_fields(data)
        
        return non_null_fields / total_fields if total_fields > 0 else 0.0
    
    def _calculate_data_freshness(
        self,
        aggregated_data: Dict[str, Any],
        target_date: Optional[date] = None
    ) -> float:
        """
        Tính điểm độ mới của dữ liệu
        
        Args:
            aggregated_data: Dictionary chứa dữ liệu
            target_date: Ngày target (nếu None, lấy từ aggregated_data)
        
        Returns:
            float: Điểm từ 0.0 đến 1.0
        """
        try:
            # Lấy target_date từ aggregated_data nếu không có
            if target_date is None:
                date_str = aggregated_data.get("date")
                if date_str:
                    if isinstance(date_str, str):
                        target_date = datetime.fromisoformat(date_str).date()
                    elif isinstance(date_str, date):
                        target_date = date_str
            
            if target_date is None:
                # Không có date → freshness = 0.5 (trung bình)
                return 0.5
            
            # So sánh với ngày hiện tại
            today = date.today()
            days_diff = (today - target_date).days
            
            # Tính freshness score:
            # - Hôm nay (0 ngày): 1.0
            # - 1-3 ngày: 0.9-0.7
            # - 4-7 ngày: 0.6-0.4
            # - 8-14 ngày: 0.3-0.2
            # - >14 ngày: 0.1
            
            if days_diff == 0:
                return 1.0
            elif days_diff <= 3:
                return 1.0 - (days_diff * 0.1)  # 0.9, 0.8, 0.7
            elif days_diff <= 7:
                return 0.7 - ((days_diff - 3) * 0.075)  # 0.625, 0.55, 0.475, 0.4
            elif days_diff <= 14:
                return 0.4 - ((days_diff - 7) * 0.028)  # ~0.3-0.2
            else:
                return 0.1
            
        except Exception as e:
            logger.warning(f"Error calculating data freshness: {e}")
            return 0.5  # Default: trung bình
    
    def calculate_ml_confidence_score(
        self,
        aggregated_data: Dict[str, Any]
    ) -> float:
        """
        Tính điểm độ tin cậy của ML predictions
        
        Args:
            aggregated_data: Dictionary chứa dữ liệu, bao gồm isolation_forest và prophet_forecast
        
        Returns:
            float: Điểm từ 0.0 đến 1.0
        """
        try:
            isolation_confidence = None
            prophet_confidence = None
            
            # 1. Lấy confidence từ Isolation Forest
            isolation_data = aggregated_data.get("isolation_forest_anomaly", {})
            if isolation_data and isinstance(isolation_data, dict):
                # Tìm confidence trong isolation_data
                # Có thể ở các key: "confidence", "adjusted_confidence", "do_tin_cay"
                isolation_confidence = (
                    isolation_data.get("adjusted_confidence") or
                    isolation_data.get("confidence") or
                    isolation_data.get("do_tin_cay")
                )
                
                # Nếu là string, parse nó
                if isinstance(isolation_confidence, str):
                    # Có thể là "85%" hoặc "0.85"
                    isolation_confidence = isolation_confidence.replace("%", "")
                    try:
                        isolation_confidence = float(isolation_confidence)
                        if isolation_confidence > 1.0:
                            isolation_confidence = isolation_confidence / 100.0
                    except (ValueError, TypeError):
                        isolation_confidence = None
            
            # 2. Lấy confidence từ Prophet Forecast
            prophet_data = aggregated_data.get("prophet_forecast", {})
            if prophet_data and isinstance(prophet_data, dict):
                # Tìm confidence trong prophet_data
                # Có thể ở: "confidence_metrics", "confidence", "do_tin_cay"
                confidence_metrics = prophet_data.get("confidence_metrics", {})
                if confidence_metrics and isinstance(confidence_metrics, dict):
                    prophet_confidence = (
                        confidence_metrics.get("overall_confidence") or
                        confidence_metrics.get("confidence") or
                        confidence_metrics.get("score")
                    )
                
                # Nếu không có trong confidence_metrics, tìm ở root level
                if prophet_confidence is None:
                    # Thử lấy từ "do_tin_cay" (có thể là dict với "phan_tram")
                    do_tin_cay = prophet_data.get("do_tin_cay")
                    if isinstance(do_tin_cay, dict):
                        # Nếu là dict, lấy "phan_tram"
                        prophet_confidence = do_tin_cay.get("phan_tram")
                    elif do_tin_cay is not None:
                        prophet_confidence = do_tin_cay
                    else:
                        # Thử các field khác
                        prophet_confidence = prophet_data.get("confidence")
                
                # Normalize nếu cần
                if isinstance(prophet_confidence, str):
                    prophet_confidence = prophet_confidence.replace("%", "")
                    try:
                        prophet_confidence = float(prophet_confidence)
                        if prophet_confidence > 1.0:
                            prophet_confidence = prophet_confidence / 100.0
                    except (ValueError, TypeError):
                        prophet_confidence = None
                elif isinstance(prophet_confidence, (int, float)):
                    # Nếu đã là số, normalize về 0-1 nếu > 1
                    if prophet_confidence > 1.0:
                        prophet_confidence = prophet_confidence / 100.0
            
            # 3. Tính ML confidence score
            # Nếu có cả 2: weighted average (Isolation 60%, Prophet 40%)
            # Nếu chỉ có 1: dùng giá trị đó
            # Nếu không có: return 0.0 hoặc 0.5 (default)
            
            if isolation_confidence is not None and prophet_confidence is not None:
                ml_confidence = (isolation_confidence * 0.6) + (prophet_confidence * 0.4)
            elif isolation_confidence is not None:
                ml_confidence = isolation_confidence
            elif prophet_confidence is not None:
                ml_confidence = prophet_confidence
            else:
                # Không có confidence nào → return 0.5 (trung bình) hoặc 0.0 (thấp)
                ml_confidence = 0.5
            
            # Đảm bảo trong khoảng 0-1
            ml_confidence = max(0.0, min(1.0, ml_confidence))
            
            logger.info(
                f"ML Confidence Score calculated: {ml_confidence:.2f} "
                f"(Isolation: {isolation_confidence}, Prophet: {prophet_confidence})"
            )
            
            return ml_confidence
            
        except Exception as e:
            logger.error(f"Error calculating ML confidence score: {e}", exc_info=True)
            return 0.5  # Default: trung bình
    
    def calculate_ai_quality_score(
        self,
        analysis_text: str,
        aggregated_data: Dict[str, Any]
    ) -> float:
        """
        Tính điểm chất lượng phản hồi AI
        
        Args:
            analysis_text: Text phân tích từ AI
            aggregated_data: Dictionary chứa dữ liệu thực tế
        
        Returns:
            float: Điểm từ 0.0 đến 1.0
        
        Công thức:
        - Metrics Coverage (30%): Số metrics được đề cập / tổng số metrics quan trọng
        - Anomalies Coverage (30%): Số anomalies được liệt kê / tổng số anomalies
        - Fact Accuracy (20%): Tỷ lệ số liệu chính xác
        - Logic Consistency (20%): Recommendations có logic không
        """
        try:
            # 1. Parse analysis text để extract thông tin
            parsed_info = self._parse_ai_analysis(analysis_text)
            
            # 2. So sánh với raw_data
            comparison_result = self._compare_analysis_with_data(
                parsed_info, aggregated_data, analysis_text
            )
            
            # 3. Tính các thành phần score
            metrics_coverage = comparison_result.get("metrics_coverage", 0.0)
            anomalies_coverage = comparison_result.get("anomalies_coverage", 0.0)
            fact_accuracy = comparison_result.get("fact_accuracy", 0.0)
            logic_consistency = comparison_result.get("logic_consistency", 0.0)
            
            # 4. Tính tổng điểm
            ai_quality_score = (
                metrics_coverage * 0.3 +
                anomalies_coverage * 0.3 +
                fact_accuracy * 0.2 +
                logic_consistency * 0.2
            )
            
            # Đảm bảo trong khoảng 0-1
            ai_quality_score = max(0.0, min(1.0, ai_quality_score))
            
            logger.info(
                f"AI Quality Score calculated: {ai_quality_score:.2f} "
                f"(Metrics Coverage: {metrics_coverage:.2f}, "
                f"Anomalies Coverage: {anomalies_coverage:.2f}, "
                f"Fact Accuracy: {fact_accuracy:.2f}, "
                f"Logic Consistency: {logic_consistency:.2f})"
            )
            
            return ai_quality_score
            
        except Exception as e:
            logger.error(f"Error calculating AI quality score: {e}", exc_info=True)
            return 0.5  # Default: trung bình
    
    def calculate_historical_accuracy_score(
        self,
        branch_id: int,
        aggregated_data: Optional[Dict[str, Any]] = None,
        limit: int = 20
    ) -> float:
        """
        Tính Historical Accuracy Score từ dữ liệu forecasts đã lưu trong database
        
        So sánh forecasts đã tạo trước đó với actual values để tính độ chính xác
        
        Args:
            branch_id: ID chi nhánh
            aggregated_data: Dữ liệu hiện tại (để lấy target_metric nếu cần)
            limit: Số lượng forecasts gần nhất để tính (mặc định 20)
        
        Returns:
            float: Historical Accuracy Score (0.0-1.0)
            - 0.0-1.0: Độ chính xác trung bình của forecasts
            - 0.75: Default nếu không có đủ dữ liệu
        """
        try:
            # Import DatabaseConnection từ TOOL2
            from src.infrastructure.database.connection import DatabaseConnection
            import json
            from datetime import datetime, timedelta
            
            # Kết nối database analytics_db
            db = DatabaseConnection(database_name='analytics_db')
            db.connect()
            
            try:
                # Lấy target_metric từ aggregated_data hoặc dùng mặc định
                target_metric = "order_count"  # Mặc định
                if aggregated_data:
                    prophet_forecast = aggregated_data.get("prophet_forecast", {})
                    if prophet_forecast:
                        target_metric = prophet_forecast.get("chi_tieu_code", "order_count")
                
                # Query forecasts đã lưu (có forecast_start_date trong quá khứ)
                # Chỉ lấy forecasts có MAPE đã được tính (đã validate)
                query = """
                    SELECT 
                        id, forecast_date, forecast_start_date, forecast_end_date,
                        target_metric, algorithm, forecast_values, mape
                    FROM forecast_results
                    WHERE branch_id = %s
                        AND target_metric = %s
                        AND algorithm = 'PROPHET'
                        AND forecast_start_date <= CURDATE()
                        AND mape IS NOT NULL
                    ORDER BY forecast_date DESC
                    LIMIT %s
                """
                
                results = db.execute_query(query, (branch_id, target_metric, limit))
                
                if not results or len(results) < 5:
                    # Nếu không đủ dữ liệu (ít hơn 5 forecasts), dùng default
                    logger.info(
                        f"Historical accuracy: Not enough data for branch {branch_id} "
                        f"(found {len(results) if results else 0} forecasts, need at least 5)"
                    )
                    return 0.75
                
                # Tính accuracy từ MAPE
                # MAPE (Mean Absolute Percentage Error) càng thấp thì accuracy càng cao
                # Accuracy = 1 - (MAPE / 100), nhưng giới hạn trong khoảng 0-1
                accuracies = []
                for forecast in results:
                    mape = forecast.get("mape")
                    if mape is not None and mape >= 0:
                        # Chuyển MAPE (%) thành accuracy score
                        # MAPE 0% = accuracy 1.0, MAPE 100% = accuracy 0.0
                        accuracy = max(0.0, min(1.0, 1.0 - (mape / 100.0)))
                        accuracies.append(accuracy)
                
                if not accuracies:
                    logger.warning(f"Historical accuracy: No valid MAPE values found for branch {branch_id}")
                    return 0.75
                
                # Tính trung bình accuracy
                avg_accuracy = sum(accuracies) / len(accuracies)
                
                logger.info(
                    f"Historical accuracy calculated for branch {branch_id}: "
                    f"{avg_accuracy:.4f} (from {len(accuracies)} forecasts, "
                    f"MAPE range: {min([f.get('mape', 0) for f in results if f.get('mape')]):.2f}% - "
                    f"{max([f.get('mape', 0) for f in results if f.get('mape')]):.2f}%)"
                )
                
                return round(avg_accuracy, 4)
                
            finally:
                db.disconnect()
                
        except ImportError as e:
            logger.warning(f"Historical accuracy: Cannot import TOOL2 modules: {e}. Using default 0.75")
            return 0.75
        except Exception as e:
            logger.warning(f"Historical accuracy: Error calculating for branch {branch_id}: {e}. Using default 0.75")
            return 0.75
    
    def calculate_overall_confidence(
        self,
        data_quality_score: float,
        ml_confidence_score: float,
        ai_quality_score: float,
        historical_accuracy_score: Optional[float] = None,
        branch_id: Optional[int] = None,
        aggregated_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Tính Overall Confidence Score từ tất cả các scores
        
        Args:
            data_quality_score: Điểm chất lượng dữ liệu (0.0-1.0)
            ml_confidence_score: Điểm tin cậy ML (0.0-1.0)
            ai_quality_score: Điểm chất lượng AI response (0.0-1.0)
            historical_accuracy_score: Điểm chính xác lịch sử (0.0-1.0), nếu None thì tự tính hoặc dùng default 0.75
            branch_id: ID chi nhánh (để tính historical accuracy nếu cần)
            aggregated_data: Dữ liệu tổng hợp (để tính historical accuracy nếu cần)
        
        Returns:
            Dict chứa overall score, breakdown, level, và warnings
        """
        try:
            # Nếu không có historical_accuracy, tự tính từ database hoặc dùng default
            if historical_accuracy_score is None:
                if branch_id is not None:
                    # Tự tính từ database
                    historical_accuracy_score = self.calculate_historical_accuracy_score(
                        branch_id, aggregated_data
                    )
                else:
                    # Dùng default nếu không có branch_id
                    historical_accuracy_score = 0.75
            
            # Đảm bảo tất cả scores trong khoảng 0-1
            data_quality_score = max(0.0, min(1.0, data_quality_score))
            ml_confidence_score = max(0.0, min(1.0, ml_confidence_score))
            ai_quality_score = max(0.0, min(1.0, ai_quality_score))
            historical_accuracy_score = max(0.0, min(1.0, historical_accuracy_score))
            
            # Tính Overall Confidence Score
            # Trọng số: Data Quality 25%, ML Confidence 25%, AI Quality 30%, Historical 20%
            overall_score = (
                data_quality_score * 0.25 +
                ml_confidence_score * 0.25 +
                ai_quality_score * 0.30 +
                historical_accuracy_score * 0.20
            )
            
            # Đảm bảo trong khoảng 0-1
            overall_score = max(0.0, min(1.0, overall_score))
            
            # Xác định confidence level
            if overall_score >= 0.8:
                level = "HIGH"
            elif overall_score >= 0.6:
                level = "MEDIUM"
            else:
                level = "LOW"
            
            # Tạo warnings nếu có scores thấp
            warnings = []
            if data_quality_score < 0.6:
                warnings.append({
                    "type": "data_quality",
                    "message": f"Chất lượng dữ liệu đầu vào thấp ({data_quality_score*100:.1f}%). Có thể ảnh hưởng đến độ chính xác của báo cáo.",
                    "severity": "medium"
                })
            
            if ml_confidence_score < 0.6:
                warnings.append({
                    "type": "ml_confidence",
                    "message": f"Độ tin cậy ML predictions thấp ({ml_confidence_score*100:.1f}%). Các dự đoán bất thường và forecast có thể không chính xác.",
                    "severity": "medium"
                })
            
            if ai_quality_score < 0.6:
                warnings.append({
                    "type": "ai_quality",
                    "message": f"Chất lượng phản hồi AI thấp ({ai_quality_score*100:.1f}%). Báo cáo có thể thiếu sót hoặc không chính xác.",
                    "severity": "high"
                })
            
            if historical_accuracy_score < 0.6:
                warnings.append({
                    "type": "historical_accuracy",
                    "message": f"Độ chính xác lịch sử thấp ({historical_accuracy_score*100:.1f}%). Dự báo có thể không đáng tin cậy.",
                    "severity": "low"
                })
            
            # Tạo breakdown
            breakdown = {
                "data_quality": round(data_quality_score, 4),
                "ml_confidence": round(ml_confidence_score, 4),
                "ai_quality": round(ai_quality_score, 4),
                "historical_accuracy": round(historical_accuracy_score, 4)
            }
            
            result = {
                "overall": round(overall_score, 4),
                "breakdown": breakdown,
                "level": level,
                "warnings": warnings
            }
            
            logger.info(
                f"Overall Confidence Score calculated: {overall_score:.4f} ({level}) - "
                f"Data Quality: {data_quality_score:.2f}, "
                f"ML Confidence: {ml_confidence_score:.2f}, "
                f"AI Quality: {ai_quality_score:.2f}, "
                f"Historical: {historical_accuracy_score:.2f}"
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error calculating overall confidence: {e}", exc_info=True)
            # Return default structure nếu có lỗi
            return {
                "overall": 0.5,
                "breakdown": {
                    "data_quality": 0.5,
                    "ml_confidence": 0.5,
                    "ai_quality": 0.5,
                    "historical_accuracy": 0.75
                },
                "level": "MEDIUM",
                "warnings": [{
                    "type": "calculation_error",
                    "message": "Có lỗi khi tính overall confidence score",
                    "severity": "medium"
                }]
            }
    
    def _parse_ai_analysis(self, analysis_text: str) -> Dict[str, Any]:
        """
        Parse AI analysis text để extract:
        - Metrics được đề cập
        - Anomalies được liệt kê
        - Recommendations
        - Số liệu cụ thể
        """
        parsed = {
            "metrics_mentioned": set(),
            "anomalies_mentioned": [],
            "recommendations": [],
            "numbers_extracted": []
        }
        
        if not analysis_text:
            return parsed
        
        text_lower = analysis_text.lower()
        
        # 1. Tìm các metrics được đề cập
        metric_keywords = {
            "doanh thu": "totalRevenue",
            "revenue": "totalRevenue",
            "số đơn": "orderCount",
            "order": "orderCount",
            "đơn hàng": "orderCount",
            "khách hàng": "customerCount",
            "customer": "customerCount",
            "khách hàng mới": "newCustomers",
            "khách hàng quay lại": "repeatCustomers",
            "sản phẩm": "uniqueProductsSold",
            "product": "uniqueProductsSold",
            "đánh giá": "avgReviewScore",
            "review": "avgReviewScore",
            "tồn kho": "inventory",
            "inventory": "inventory",
            "chi phí": "materialCost",
            "cost": "materialCost"
        }
        
        for keyword, metric_code in metric_keywords.items():
            if keyword in text_lower:
                parsed["metrics_mentioned"].add(metric_code)
        
        # 2. Extract số liệu (số, phần trăm)
        # Tìm các pattern như: "257000", "25.2%", "3 đơn hàng"
        number_patterns = [
            r'\d+\.?\d*\s*(?:triệu|nghìn|k|m)?',  # Số với đơn vị
            r'\d+\.?\d*%',  # Phần trăm
            r'\d+\.?\d*',  # Số thập phân
        ]
        
        for pattern in number_patterns:
            matches = re.findall(pattern, analysis_text)
            parsed["numbers_extracted"].extend(matches)
        
        # 3. Tìm anomalies được đề cập
        # Tìm các pattern như: "tăng", "giảm", "bất thường", "anomaly"
        anomaly_keywords = [
            "bất thường", "anomaly", "tăng", "giảm", 
            "thay đổi", "biến động", "khác thường"
        ]
        
        for keyword in anomaly_keywords:
            if keyword in text_lower:
                # Tìm context xung quanh keyword
                idx = text_lower.find(keyword)
                if idx >= 0:
                    context = analysis_text[max(0, idx-50):min(len(analysis_text), idx+50)]
                    parsed["anomalies_mentioned"].append({
                        "keyword": keyword,
                        "context": context
                    })
        
        # 4. Extract recommendations (phần 4 hoặc 5 trong analysis)
        lines = analysis_text.split('\n')
        in_recommendations = False
        
        for line in lines:
            line_lower = line.lower().strip()
            # Tìm phần khuyến nghị
            if any(keyword in line_lower for keyword in ['4.', '5.', 'khuyến nghị', 'đề xuất', 'cải thiện']):
                in_recommendations = True
            
            if in_recommendations:
                if line.strip() and not line.strip().startswith('#'):
                    # Loại bỏ markdown formatting
                    clean_line = re.sub(r'[#*\-]', '', line).strip()
                    if len(clean_line) > 20:  # Chỉ lấy dòng có nội dung
                        parsed["recommendations"].append(clean_line)
        
        return parsed
    
    def _extract_number_with_context(self, text: str, keywords: List[str], tolerance_percent: float = 0.1, tolerance_absolute: Optional[float] = None) -> Optional[float]:
        """
        Extract số từ text dựa trên keywords gần đó
        Ví dụ: "doanh thu 257,000 đồng" → tìm "doanh thu" và extract số gần đó
        
        Args:
            text: Text cần extract
            keywords: List keywords để tìm (ví dụ: ["doanh thu", "revenue"])
            tolerance_percent: Sai số cho phép (phần trăm)
            tolerance_absolute: Sai số cho phép (tuyệt đối)
        
        Returns:
            Số được extract hoặc None nếu không tìm thấy
        """
        text_lower = text.lower()
        for keyword in keywords:
            idx = text_lower.find(keyword)
            if idx >= 0:
                # Lấy context xung quanh keyword (50 ký tự trước và sau)
                context_start = max(0, idx - 50)
                context_end = min(len(text), idx + len(keyword) + 50)
                context = text[context_start:context_end]
                
                # Tìm số trong context (có thể có dấu phẩy, chấm)
                # Pattern: số có thể có dấu phẩy phân cách hàng nghìn
                number_patterns = [
                    r'(\d{1,3}(?:[.,]\d{3})*(?:\.\d+)?)',  # 257,000 hoặc 257.000
                    r'(\d+\.?\d*)',  # 257000 hoặc 257.5
                ]
                
                for pattern in number_patterns:
                    matches = re.findall(pattern, context)
                    for match in matches:
                        try:
                            # Loại bỏ dấu phẩy phân cách hàng nghìn
                            num_str = match.replace(',', '')
                            # Nếu có dấu chấm thập phân, giữ lại
                            if '.' in num_str and num_str.count('.') == 1:
                                num = float(num_str)
                            else:
                                # Nếu có nhiều dấu chấm hoặc dấu phẩy, loại bỏ hết trừ dấu chấm cuối
                                num_str_clean = num_str.replace(',', '')
                                num = float(num_str_clean)
                            return num
                        except ValueError:
                            continue
        return None
    
    def _compare_analysis_with_data(
        self,
        parsed_info: Dict[str, Any],
        aggregated_data: Dict[str, Any],
        analysis_text: str
    ) -> Dict[str, Any]:
        """
        So sánh parsed analysis với raw_data để tính:
        - Metrics coverage
        - Anomalies coverage
        - Fact accuracy
        - Logic consistency
        """
        result = {
            "metrics_coverage": 0.0,
            "anomalies_coverage": 0.0,
            "fact_accuracy": 0.0,
            "logic_consistency": 0.0
        }
        
        # 1. Tính Metrics Coverage
        important_metrics = {
            "totalRevenue", "orderCount", "customerCount",
            "avgReviewScore", "uniqueProductsSold"
        }
        
        metrics_mentioned = parsed_info.get("metrics_mentioned", set())
        if important_metrics:
            result["metrics_coverage"] = len(metrics_mentioned & important_metrics) / len(important_metrics)
        
        # 2. Tính Anomalies Coverage
        isolation_data = aggregated_data.get("isolation_forest_anomaly", {})
        actual_anomalies = []
        
        if isolation_data and isinstance(isolation_data, dict):
            chi_tieu_bat_thuong = isolation_data.get("chi_tieu_bat_thuong", [])
            if isinstance(chi_tieu_bat_thuong, list):
                actual_anomalies = [item.get("metric", "") for item in chi_tieu_bat_thuong if isinstance(item, dict)]
        
        anomalies_mentioned = parsed_info.get("anomalies_mentioned", [])
        if actual_anomalies:
            # Đếm số anomalies được đề cập trong analysis
            mentioned_count = 0
            for actual_anomaly in actual_anomalies:
                # Kiểm tra xem anomaly này có được đề cập không
                for mentioned in anomalies_mentioned:
                    if isinstance(mentioned, dict):
                        context = mentioned.get("context", "").lower()
                        if actual_anomaly.lower() in context or any(
                            word in context for word in actual_anomaly.lower().split()
                        ):
                            mentioned_count += 1
                            break
            
            result["anomalies_coverage"] = mentioned_count / len(actual_anomalies) if actual_anomalies else 0.0
        else:
            # Không có anomalies thực tế
            # Nếu analysis không đề cập đến anomalies → coverage = 1.0
            if not anomalies_mentioned:
                result["anomalies_coverage"] = 1.0
            else:
                result["anomalies_coverage"] = 0.5  # Đề cập anomalies nhưng không có thực tế
        
        # 3. Tính Fact Accuracy - So sánh số liệu AI với dữ liệu thực tế
        revenue_data = aggregated_data.get("revenue_metrics", {})
        customer_data = aggregated_data.get("customer_metrics", {})
        review_data = aggregated_data.get("review_metrics", {})
        product_data = aggregated_data.get("product_metrics", {})
        
        accuracy_checks = 0
        accurate_checks = 0
        
        # 1. Kiểm tra Revenue (doanh thu)
        if "totalRevenue" in parsed_info.get("metrics_mentioned", set()):
            actual_revenue = revenue_data.get("totalRevenue", 0)
            if actual_revenue and actual_revenue > 0:
                accuracy_checks += 1
                # Tìm revenue trong analysis với context "doanh thu", "revenue"
                revenue_keywords = ["doanh thu", "revenue", "tổng cộng", "tổng doanh thu"]
                ai_revenue = self._extract_number_with_context(
                    analysis_text, revenue_keywords, tolerance_percent=0.1
                )
                
                if ai_revenue is not None:
                    # Cho phép sai số 10% hoặc 10,000 (tùy cái nào lớn hơn)
                    tolerance = max(actual_revenue * 0.1, 10000)
                    if abs(ai_revenue - actual_revenue) <= tolerance:
                        accurate_checks += 1
                        logger.debug(f"Revenue match: AI={ai_revenue}, Actual={actual_revenue}")
        
        # 2. Kiểm tra Order Count (số đơn hàng)
        if "orderCount" in parsed_info.get("metrics_mentioned", set()):
            actual_orders = revenue_data.get("orderCount", 0)
            if actual_orders and actual_orders > 0:
                accuracy_checks += 1
                order_keywords = ["đơn hàng", "order", "số đơn", "orders"]
                ai_orders = self._extract_number_with_context(
                    analysis_text, order_keywords, tolerance_absolute=2
                )
                
                if ai_orders is not None:
                    # Cho phép sai số 2 đơn hoặc 10% (tùy cái nào lớn hơn)
                    tolerance = max(2, actual_orders * 0.1)
                    if abs(ai_orders - actual_orders) <= tolerance:
                        accurate_checks += 1
                        logger.debug(f"Order count match: AI={ai_orders}, Actual={actual_orders}")
        
        # 3. Kiểm tra Average Order Value (giá trị đơn trung bình)
        if "avgOrderValue" in parsed_info.get("metrics_mentioned", set()) or "avg_order_value" in str(parsed_info.get("metrics_mentioned", set())):
            actual_aov = revenue_data.get("avgOrderValue", 0)
            if actual_aov and actual_aov > 0:
                accuracy_checks += 1
                aov_keywords = ["giá trị đơn", "đơn trung bình", "average order", "avg order value"]
                ai_aov = self._extract_number_with_context(
                    analysis_text, aov_keywords, tolerance_percent=0.1
                )
                
                if ai_aov is not None:
                    tolerance = max(actual_aov * 0.1, 5000)
                    if abs(ai_aov - actual_aov) <= tolerance:
                        accurate_checks += 1
                        logger.debug(f"Avg Order Value match: AI={ai_aov}, Actual={actual_aov}")
        
        # 4. Kiểm tra Customer Count (số khách hàng)
        if "customerCount" in parsed_info.get("metrics_mentioned", set()):
            actual_customers = customer_data.get("customerCount", 0)
            if actual_customers and actual_customers > 0:
                accuracy_checks += 1
                customer_keywords = ["khách hàng", "customer", "số khách", "customers"]
                ai_customers = self._extract_number_with_context(
                    analysis_text, customer_keywords, tolerance_absolute=2
                )
                
                if ai_customers is not None:
                    tolerance = max(2, actual_customers * 0.1)
                    if abs(ai_customers - actual_customers) <= tolerance:
                        accurate_checks += 1
                        logger.debug(f"Customer count match: AI={ai_customers}, Actual={actual_customers}")
        
        # 5. Kiểm tra Review Score (điểm đánh giá)
        if "avgReviewScore" in parsed_info.get("metrics_mentioned", set()):
            actual_score = review_data.get("avgReviewScore", 0)
            if actual_score and actual_score > 0:
                accuracy_checks += 1
                review_keywords = ["điểm đánh giá", "review score", "đánh giá trung bình", "rating"]
                ai_score = self._extract_number_with_context(
                    analysis_text, review_keywords, tolerance_absolute=0.5
                )
                
                if ai_score is not None:
                    # Cho phép sai số 0.5 điểm
                    if abs(ai_score - actual_score) <= 0.5:
                        accurate_checks += 1
                        logger.debug(f"Review score match: AI={ai_score}, Actual={actual_score}")
        
        # 6. Kiểm tra Products Sold (số sản phẩm)
        if "uniqueProductsSold" in parsed_info.get("metrics_mentioned", set()):
            actual_products = product_data.get("uniqueProductsSold", 0)
            if actual_products and actual_products > 0:
                accuracy_checks += 1
                product_keywords = ["sản phẩm", "product", "số sản phẩm", "products sold"]
                ai_products = self._extract_number_with_context(
                    analysis_text, product_keywords, tolerance_absolute=2
                )
                
                if ai_products is not None:
                    tolerance = max(2, actual_products * 0.1)
                    if abs(ai_products - actual_products) <= tolerance:
                        accurate_checks += 1
                        logger.debug(f"Products sold match: AI={ai_products}, Actual={actual_products}")
        
        result["fact_accuracy"] = accurate_checks / accuracy_checks if accuracy_checks > 0 else 0.5
        
        # 4. Tính Logic Consistency (đơn giản hóa)
        # Kiểm tra recommendations có hợp lý không
        recommendations = parsed_info.get("recommendations", [])
        if recommendations:
            # Đếm số recommendations có từ khóa hợp lý
            valid_keywords = [
                "tăng cường", "quản lý", "nâng cao", "tối ưu",
                "cải thiện", "theo dõi", "điều chỉnh"
            ]
            valid_recommendations = sum(
                1 for rec in recommendations
                if any(keyword in rec.lower() for keyword in valid_keywords)
            )
            result["logic_consistency"] = valid_recommendations / len(recommendations) if recommendations else 0.5
        else:
            result["logic_consistency"] = 0.5  # Không có recommendations
        
        return result

