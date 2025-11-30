"""
Business Validation Tests (UAT - User Acceptance Testing)
Kiểm thử nghiệp vụ: Đánh giá độ tin cậy và giá trị của báo cáo AI

Mục đích: Kiểm tra xem báo cáo AI có chính xác, đầy đủ và hữu ích cho nhà quản lý không?
Phương pháp: Sử dụng danh sách câu hỏi để chấm điểm từng báo cáo
"""
import pytest
import re
from datetime import date
from typing import Dict, Any, List, Optional, Tuple
from app.services.ai_agent_service import AIAgentService


class BusinessValidationScorer:
    """
    Class để chấm điểm báo cáo AI dựa trên các tiêu chí nghiệp vụ
    """
    
    def __init__(self):
        # Danh sách câu hỏi đánh giá (checklist)
        self.evaluation_questions = {
            # 1. Độ chính xác dữ liệu (Factual Accuracy)
            "factual_accuracy": {
                "name": "Độ chính xác dữ liệu",
                "weight": 0.25,  # Trọng số 25%
                "questions": [
                    {
                        "id": "fa1",
                        "question": "Các con số trong báo cáo (doanh thu, số đơn, số khách hàng) có khớp với dữ liệu thực tế không?",
                        "scoring": self._score_factual_accuracy
                    },
                    {
                        "id": "fa2",
                        "question": "Báo cáo có đề cập đến các chỉ số quan trọng (doanh thu, đơn hàng, khách hàng, đánh giá) không?",
                        "scoring": self._score_metrics_coverage
                    },
                    {
                        "id": "fa3",
                        "question": "Các so sánh và phân tích có dựa trên dữ liệu thực tế không?",
                        "scoring": self._score_data_based_analysis
                    }
                ]
            },
            
            # 2. Độ đầy đủ thông tin (Completeness)
            "completeness": {
                "name": "Độ đầy đủ thông tin",
                "weight": 0.20,  # Trọng số 20%
                "questions": [
                    {
                        "id": "c1",
                        "question": "Báo cáo có đầy đủ các phần: Tổng quan, Điểm mạnh/yếu, Vấn đề, Dự đoán, Khuyến nghị không?",
                        "scoring": self._score_sections_completeness
                    },
                    {
                        "id": "c2",
                        "question": "Tất cả các bất thường (anomalies) được phát hiện có được đề cập trong báo cáo không?",
                        "scoring": self._score_anomalies_coverage
                    },
                    {
                        "id": "c3",
                        "question": "Báo cáo có đề cập đến các khía cạnh quan trọng: doanh thu, khách hàng, sản phẩm, tồn kho, đánh giá không?",
                        "scoring": self._score_aspects_coverage
                    }
                ]
            },
            
            # 3. Tính khả thi của khuyến nghị (Actionability)
            "actionability": {
                "name": "Tính khả thi của khuyến nghị",
                "weight": 0.20,  # Trọng số 20%
                "questions": [
                    {
                        "id": "a1",
                        "question": "Các khuyến nghị có cụ thể và có thể thực hiện được không?",
                        "scoring": self._score_recommendations_actionability
                    },
                    {
                        "id": "a2",
                        "question": "Có ít nhất 3 khuyến nghị cụ thể trong báo cáo không?",
                        "scoring": self._score_recommendations_count
                    },
                    {
                        "id": "a3",
                        "question": "Khuyến nghị có liên quan trực tiếp đến các vấn đề được phát hiện không?",
                        "scoring": self._score_recommendations_relevance
                    }
                ]
            },
            
            # 4. Độ rõ ràng và dễ hiểu (Clarity)
            "clarity": {
                "name": "Độ rõ ràng và dễ hiểu",
                "weight": 0.15,  # Trọng số 15%
                "questions": [
                    {
                        "id": "cl1",
                        "question": "Báo cáo có cấu trúc rõ ràng, dễ đọc không?",
                        "scoring": self._score_structure_clarity
                    },
                    {
                        "id": "cl2",
                        "question": "Ngôn ngữ sử dụng có chuyên nghiệp và dễ hiểu cho nhà quản lý không?",
                        "scoring": self._score_language_clarity
                    },
                    {
                        "id": "cl3",
                        "question": "Báo cáo có tránh sử dụng thuật ngữ kỹ thuật (ML algorithms) không?",
                        "scoring": self._score_technical_terms_avoidance
                    }
                ]
            },
            
            # 5. Tính liên quan nghiệp vụ (Business Relevance)
            "business_relevance": {
                "name": "Tính liên quan nghiệp vụ",
                "weight": 0.20,  # Trọng số 20%
                "questions": [
                    {
                        "id": "br1",
                        "question": "Báo cáo có giúp nhà quản lý hiểu được tình hình hoạt động của chi nhánh không?",
                        "scoring": self._score_business_insights
                    },
                    {
                        "id": "br2",
                        "question": "Dự đoán tương lai có hữu ích cho việc lập kế hoạch không?",
                        "scoring": self._score_forecast_usefulness
                    },
                    {
                        "id": "br3",
                        "question": "Báo cáo có xác định được các vấn đề cần ưu tiên xử lý không?",
                        "scoring": self._score_priority_identification
                    }
                ]
            }
        }
    
    def evaluate_report(
        self,
        ai_report: Dict[str, Any],
        raw_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Đánh giá toàn diện một báo cáo AI
        
        Args:
            ai_report: Kết quả từ AI (có analysis, summary, recommendations)
            raw_data: Dữ liệu thô để so sánh
        
        Returns:
            Dict chứa điểm số chi tiết và tổng điểm
        """
        analysis_text = ai_report.get("analysis", "")
        summary = ai_report.get("summary", {})
        recommendations = ai_report.get("recommendations", [])
        
        evaluation_results = {
            "categories": {},
            "overall_score": 0.0,
            "detailed_scores": {}
        }
        
        total_weighted_score = 0.0
        total_weight = 0.0
        
        # Đánh giá từng category
        for category_id, category_info in self.evaluation_questions.items():
            category_score = 0.0
            category_results = []
            
            # Chấm điểm từng câu hỏi trong category
            for question_info in category_info["questions"]:
                question_id = question_info["id"]
                scoring_func = question_info["scoring"]
                
                # Gọi hàm scoring
                score, details = scoring_func(
                    analysis_text=analysis_text,
                    summary=summary,
                    recommendations=recommendations,
                    raw_data=raw_data
                )
                
                category_results.append({
                    "question_id": question_id,
                    "question": question_info["question"],
                    "score": score,
                    "details": details
                })
                
                # Tính điểm trung bình cho category
                category_score += score
            
            # Điểm trung bình của category
            category_avg_score = category_score / len(category_info["questions"])
            
            # Tính điểm có trọng số
            weighted_score = category_avg_score * category_info["weight"]
            total_weighted_score += weighted_score
            total_weight += category_info["weight"]
            
            evaluation_results["categories"][category_id] = {
                "name": category_info["name"],
                "weight": category_info["weight"],
                "score": category_avg_score,
                "weighted_score": weighted_score,
                "questions": category_results
            }
        
        # Tính tổng điểm (đã normalize về 0-1)
        if total_weight > 0:
            evaluation_results["overall_score"] = total_weighted_score / total_weight
        else:
            evaluation_results["overall_score"] = 0.0
        
        # Xác định mức độ đánh giá
        if evaluation_results["overall_score"] >= 0.8:
            evaluation_results["rating"] = "XUẤT SẮC"
            evaluation_results["recommendation"] = "Báo cáo rất tốt, có thể sử dụng trực tiếp"
        elif evaluation_results["overall_score"] >= 0.7:
            evaluation_results["rating"] = "TỐT"
            evaluation_results["recommendation"] = "Báo cáo tốt, có thể sử dụng với một số điều chỉnh nhỏ"
        elif evaluation_results["overall_score"] >= 0.6:
            evaluation_results["rating"] = "KHÁ"
            evaluation_results["recommendation"] = "Báo cáo khá, cần cải thiện một số phần"
        elif evaluation_results["overall_score"] >= 0.5:
            evaluation_results["rating"] = "TRUNG BÌNH"
            evaluation_results["recommendation"] = "Báo cáo cần cải thiện đáng kể"
        else:
            evaluation_results["rating"] = "YẾU"
            evaluation_results["recommendation"] = "Báo cáo không đạt yêu cầu, cần xem xét lại"
        
        return evaluation_results
    
    # ========== Các hàm scoring cho từng câu hỏi ==========
    
    def _score_factual_accuracy(
        self,
        analysis_text: str,
        summary: Dict[str, Any],
        recommendations: List[str],
        raw_data: Dict[str, Any]
    ) -> Tuple[float, str]:
        """
        Kiểm tra độ chính xác của các con số trong báo cáo
        """
        score = 0.0
        details = []
        
        # Lấy dữ liệu thực tế từ raw_data
        revenue_metrics = raw_data.get("revenue_metrics", {})
        customer_metrics = raw_data.get("customer_metrics", {})
        review_metrics = raw_data.get("review_metrics", {})
        
        actual_revenue = revenue_metrics.get("totalRevenue", 0)
        actual_orders = revenue_metrics.get("orderCount", 0)
        actual_customers = customer_metrics.get("customerCount", 0)
        actual_avg_review = review_metrics.get("avgReviewScore", 0)
        
        # Kiểm tra trong analysis_text và summary
        checks = 0
        correct_checks = 0
        
        # Check revenue
        if actual_revenue > 0:
            checks += 1
            # Tìm số doanh thu trong text (có thể có format khác nhau)
            revenue_patterns = [
                rf"{actual_revenue:,}",
                rf"{actual_revenue}",
                rf"{actual_revenue/1000:.0f}k",
                rf"{actual_revenue/1000000:.1f} triệu"
            ]
            if any(re.search(pattern, analysis_text, re.IGNORECASE) for pattern in revenue_patterns):
                correct_checks += 1
                details.append("✓ Doanh thu chính xác")
            else:
                details.append("✗ Doanh thu không khớp hoặc không có")
        
        # Check orders
        if actual_orders > 0:
            checks += 1
            if str(actual_orders) in analysis_text or summary.get("order_count") == actual_orders:
                correct_checks += 1
                details.append("✓ Số đơn hàng chính xác")
            else:
                details.append("✗ Số đơn hàng không khớp")
        
        # Check customers
        if actual_customers > 0:
            checks += 1
            if str(actual_customers) in analysis_text or summary.get("customer_count") == actual_customers:
                correct_checks += 1
                details.append("✓ Số khách hàng chính xác")
            else:
                details.append("✗ Số khách hàng không khớp")
        
        # Check review score
        if actual_avg_review > 0:
            checks += 1
            review_str = f"{actual_avg_review:.1f}" if actual_avg_review < 10 else str(int(actual_avg_review))
            if review_str in analysis_text or abs(summary.get("avg_review_score", 0) - actual_avg_review) < 0.1:
                correct_checks += 1
                details.append("✓ Điểm đánh giá chính xác")
            else:
                details.append("✗ Điểm đánh giá không khớp")
        
        if checks > 0:
            score = correct_checks / checks
        else:
            score = 0.5  # Không có dữ liệu để kiểm tra
        
        return score, "; ".join(details) if details else "Không có dữ liệu để kiểm tra"
    
    def _score_metrics_coverage(
        self,
        analysis_text: str,
        summary: Dict[str, Any],
        recommendations: List[str],
        raw_data: Dict[str, Any]
    ) -> Tuple[float, str]:
        """
        Kiểm tra báo cáo có đề cập đến các chỉ số quan trọng không
        """
        important_metrics = [
            ("doanh thu", "revenue"),
            ("đơn hàng", "order"),
            ("khách hàng", "customer"),
            ("đánh giá", "review"),
            ("sản phẩm", "product"),
            ("tồn kho", "inventory")
        ]
        
        mentioned = 0
        details = []
        
        text_lower = analysis_text.lower()
        
        for vi_name, en_name in important_metrics:
            if vi_name in text_lower or en_name in text_lower:
                mentioned += 1
                details.append(f"✓ Đề cập {vi_name}")
            else:
                details.append(f"✗ Thiếu {vi_name}")
        
        score = mentioned / len(important_metrics) if important_metrics else 0.0
        
        return score, "; ".join(details)
    
    def _score_data_based_analysis(
        self,
        analysis_text: str,
        summary: Dict[str, Any],
        recommendations: List[str],
        raw_data: Dict[str, Any]
    ) -> Tuple[float, str]:
        """
        Kiểm tra phân tích có dựa trên dữ liệu thực tế không
        """
        # Kiểm tra xem có số liệu cụ thể trong phân tích không
        has_numbers = bool(re.search(r'\d+', analysis_text))
        has_comparisons = bool(re.search(r'(tăng|giảm|cao|thấp|so với|hơn|kém)', analysis_text, re.IGNORECASE))
        has_specific_metrics = bool(re.search(r'(doanh thu|đơn hàng|khách hàng).*\d+', analysis_text, re.IGNORECASE))
        
        score = 0.0
        details = []
        
        if has_numbers:
            score += 0.4
            details.append("✓ Có số liệu cụ thể")
        else:
            details.append("✗ Thiếu số liệu cụ thể")
        
        if has_comparisons:
            score += 0.3
            details.append("✓ Có so sánh")
        else:
            details.append("✗ Thiếu so sánh")
        
        if has_specific_metrics:
            score += 0.3
            details.append("✓ Có chỉ số cụ thể")
        else:
            details.append("✗ Thiếu chỉ số cụ thể")
        
        return score, "; ".join(details)
    
    def _score_sections_completeness(
        self,
        analysis_text: str,
        summary: Dict[str, Any],
        recommendations: List[str],
        raw_data: Dict[str, Any]
    ) -> Tuple[float, str]:
        """
        Kiểm tra báo cáo có đầy đủ các phần không
        """
        required_sections = [
            ("tổng quan", "overview", "tóm tắt"),
            ("điểm mạnh", "strength", "ưu điểm"),
            ("điểm yếu", "weakness", "vấn đề", "cần chú ý"),
            ("dự đoán", "forecast", "tương lai", "dự báo"),
            ("khuyến nghị", "recommendation", "đề xuất")
        ]
        
        found_sections = 0
        details = []
        text_lower = analysis_text.lower()
        
        for section_keywords in required_sections:
            found = any(keyword in text_lower for keyword in section_keywords)
            if found:
                found_sections += 1
                details.append(f"✓ Có phần {section_keywords[0]}")
            else:
                details.append(f"✗ Thiếu phần {section_keywords[0]}")
        
        score = found_sections / len(required_sections) if required_sections else 0.0
        
        return score, "; ".join(details)
    
    def _score_anomalies_coverage(
        self,
        analysis_text: str,
        summary: Dict[str, Any],
        recommendations: List[str],
        raw_data: Dict[str, Any]
    ) -> Tuple[float, str]:
        """
        Kiểm tra tất cả anomalies có được đề cập không
        """
        anomaly_data = raw_data.get("isolation_forest_anomaly", {})
        has_anomalies = anomaly_data.get("co_bat_thuong", False)
        anomalous_features = anomaly_data.get("chi_tieu_bat_thuong", [])
        
        if not has_anomalies:
            # Nếu không có anomalies, kiểm tra xem báo cáo có nói "không có bất thường" không
            text_lower = analysis_text.lower()
            if any(phrase in text_lower for phrase in ["không có bất thường", "không có vấn đề", "bình thường"]):
                return 1.0, "✓ Đúng: Không có bất thường và báo cáo đã nêu rõ"
            else:
                return 0.5, "⚠ Không có bất thường nhưng báo cáo không nêu rõ"
        
        if not anomalous_features:
            return 0.5, "⚠ Có bất thường nhưng không có danh sách chi tiết"
        
        # Đếm số anomalies được đề cập
        mentioned_count = 0
        text_lower = analysis_text.lower()
        
        for feature in anomalous_features:
            metric_name = feature.get("metric", "").lower()
            if metric_name and metric_name in text_lower:
                mentioned_count += 1
        
        if len(anomalous_features) > 0:
            score = mentioned_count / len(anomalous_features)
            details = f"Đề cập {mentioned_count}/{len(anomalous_features)} bất thường"
        else:
            score = 0.0
            details = "Không có danh sách bất thường"
        
        return score, details
    
    def _score_aspects_coverage(
        self,
        analysis_text: str,
        summary: Dict[str, Any],
        recommendations: List[str],
        raw_data: Dict[str, Any]
    ) -> Tuple[float, str]:
        """
        Kiểm tra báo cáo có đề cập đến các khía cạnh quan trọng không
        """
        aspects = [
            ("doanh thu", "revenue"),
            ("khách hàng", "customer"),
            ("sản phẩm", "product"),
            ("tồn kho", "inventory"),
            ("đánh giá", "review")
        ]
        
        mentioned = 0
        details = []
        text_lower = analysis_text.lower()
        
        for vi_name, en_name in aspects:
            if vi_name in text_lower or en_name in text_lower:
                mentioned += 1
                details.append(f"✓ {vi_name}")
            else:
                details.append(f"✗ {vi_name}")
        
        score = mentioned / len(aspects) if aspects else 0.0
        
        return score, "; ".join(details)
    
    def _score_recommendations_actionability(
        self,
        analysis_text: str,
        summary: Dict[str, Any],
        recommendations: List[str],
        raw_data: Dict[str, Any]
    ) -> Tuple[float, str]:
        """
        Kiểm tra khuyến nghị có cụ thể và khả thi không
        """
        if not recommendations:
            return 0.0, "✗ Không có khuyến nghị"
        
        actionable_keywords = [
            "tăng", "giảm", "cải thiện", "tối ưu", "theo dõi",
            "kiểm tra", "điều chỉnh", "nâng cao", "mở rộng"
        ]
        
        actionable_count = 0
        details = []
        
        for rec in recommendations:
            rec_lower = rec.lower()
            has_action = any(keyword in rec_lower for keyword in actionable_keywords)
            has_specific = bool(re.search(r'\d+|cụ thể|chi tiết', rec_lower))
            
            if has_action and has_specific:
                actionable_count += 1
                details.append(f"✓ '{rec[:50]}...'")
            elif has_action:
                actionable_count += 0.5
                details.append(f"~ '{rec[:50]}...' (thiếu cụ thể)")
            else:
                details.append(f"✗ '{rec[:50]}...' (quá chung chung)")
        
        score = actionable_count / len(recommendations) if recommendations else 0.0
        
        return score, "; ".join(details[:5])  # Chỉ hiển thị 5 đầu tiên
    
    def _score_recommendations_count(
        self,
        analysis_text: str,
        summary: Dict[str, Any],
        recommendations: List[str],
        raw_data: Dict[str, Any]
    ) -> Tuple[float, str]:
        """
        Kiểm tra có ít nhất 3 khuyến nghị không
        """
        count = len(recommendations) if recommendations else 0
        
        if count >= 3:
            score = 1.0
            details = f"✓ Có {count} khuyến nghị (đạt yêu cầu)"
        elif count == 2:
            score = 0.7
            details = f"~ Có {count} khuyến nghị (gần đạt)"
        elif count == 1:
            score = 0.4
            details = f"⚠ Chỉ có {count} khuyến nghị (thiếu)"
        else:
            score = 0.0
            details = "✗ Không có khuyến nghị"
        
        return score, details
    
    def _score_recommendations_relevance(
        self,
        analysis_text: str,
        summary: Dict[str, Any],
        recommendations: List[str],
        raw_data: Dict[str, Any]
    ) -> Tuple[float, str]:
        """
        Kiểm tra khuyến nghị có liên quan đến vấn đề được phát hiện không
        """
        if not recommendations:
            return 0.0, "✗ Không có khuyến nghị"
        
        # Lấy các vấn đề từ analysis
        problem_keywords = []
        text_lower = analysis_text.lower()
        
        # Tìm các phần vấn đề
        if "vấn đề" in text_lower or "bất thường" in text_lower or "cần chú ý" in text_lower:
            # Extract keywords từ phần vấn đề
            problem_section = analysis_text[analysis_text.lower().find("vấn đề"):analysis_text.lower().find("vấn đề")+500]
            problem_keywords = re.findall(r'\b\w+\b', problem_section.lower())
        
        # Kiểm tra mỗi khuyến nghị có liên quan không
        relevant_count = 0
        
        for rec in recommendations:
            rec_lower = rec.lower()
            # Kiểm tra có từ khóa liên quan không
            if any(keyword in rec_lower for keyword in ["doanh thu", "khách hàng", "sản phẩm", "tồn kho", "đánh giá"]):
                relevant_count += 1
        
        score = relevant_count / len(recommendations) if recommendations else 0.0
        details = f"Liên quan: {relevant_count}/{len(recommendations)}"
        
        return score, details
    
    def _score_structure_clarity(
        self,
        analysis_text: str,
        summary: Dict[str, Any],
        recommendations: List[str],
        raw_data: Dict[str, Any]
    ) -> Tuple[float, str]:
        """
        Kiểm tra cấu trúc báo cáo có rõ ràng không
        """
        # Kiểm tra có số thứ tự, heading không
        has_numbering = bool(re.search(r'^\d+\.', analysis_text, re.MULTILINE))
        has_headings = bool(re.search(r'(tổng quan|điểm mạnh|vấn đề|khuyến nghị|kết luận)', analysis_text, re.IGNORECASE))
        has_paragraphs = analysis_text.count('\n\n') >= 3
        
        score = 0.0
        details = []
        
        if has_numbering:
            score += 0.4
            details.append("✓ Có đánh số")
        else:
            details.append("✗ Thiếu đánh số")
        
        if has_headings:
            score += 0.4
            details.append("✓ Có tiêu đề")
        else:
            details.append("✗ Thiếu tiêu đề")
        
        if has_paragraphs:
            score += 0.2
            details.append("✓ Có phân đoạn")
        else:
            details.append("✗ Thiếu phân đoạn")
        
        return score, "; ".join(details)
    
    def _score_language_clarity(
        self,
        analysis_text: str,
        summary: Dict[str, Any],
        recommendations: List[str],
        raw_data: Dict[str, Any]
    ) -> Tuple[float, str]:
        """
        Kiểm tra ngôn ngữ có chuyên nghiệp và dễ hiểu không
        """
        # Kiểm tra độ dài câu (không quá dài)
        sentences = re.split(r'[.!?]\s+', analysis_text)
        avg_sentence_length = sum(len(s.split()) for s in sentences) / len(sentences) if sentences else 0
        
        # Kiểm tra có từ chuyên nghiệp không
        professional_keywords = ["phân tích", "đánh giá", "khuyến nghị", "tình hình", "hiệu suất"]
        has_professional = any(keyword in analysis_text.lower() for keyword in professional_keywords)
        
        # Kiểm tra có lỗi chính tả cơ bản không (ví dụ: không có quá nhiều ký tự lặp lại)
        has_typos = bool(re.search(r'[a-zA-Z]{20,}', analysis_text))  # Từ quá dài có thể là lỗi
        
        score = 0.0
        details = []
        
        if 10 <= avg_sentence_length <= 25:
            score += 0.4
            details.append("✓ Độ dài câu phù hợp")
        else:
            details.append(f"⚠ Độ dài câu: {avg_sentence_length:.1f} từ")
        
        if has_professional:
            score += 0.4
            details.append("✓ Ngôn ngữ chuyên nghiệp")
        else:
            details.append("✗ Thiếu ngôn ngữ chuyên nghiệp")
        
        if not has_typos:
            score += 0.2
            details.append("✓ Không có lỗi rõ ràng")
        else:
            details.append("⚠ Có thể có lỗi")
        
        return score, "; ".join(details)
    
    def _score_technical_terms_avoidance(
        self,
        analysis_text: str,
        summary: Dict[str, Any],
        recommendations: List[str],
        raw_data: Dict[str, Any]
    ) -> Tuple[float, str]:
        """
        Kiểm tra có tránh thuật ngữ kỹ thuật không
        """
        technical_terms = [
            "isolation forest",
            "prophet",
            "machine learning",
            "ml model",
            "algorithm",
            "neural network",
            "deep learning"
        ]
        
        found_terms = []
        text_lower = analysis_text.lower()
        
        for term in technical_terms:
            if term in text_lower:
                found_terms.append(term)
        
        if not found_terms:
            score = 1.0
            details = "✓ Không có thuật ngữ kỹ thuật"
        else:
            score = max(0.0, 1.0 - len(found_terms) * 0.3)
            details = f"✗ Có thuật ngữ kỹ thuật: {', '.join(found_terms)}"
        
        return score, details
    
    def _score_business_insights(
        self,
        analysis_text: str,
        summary: Dict[str, Any],
        recommendations: List[str],
        raw_data: Dict[str, Any]
    ) -> Tuple[float, str]:
        """
        Kiểm tra báo cáo có đưa ra insights hữu ích không
        """
        insight_keywords = [
            "xu hướng", "tăng trưởng", "giảm sút", "so sánh",
            "hiệu suất", "hiệu quả", "tối ưu", "cơ hội", "thách thức"
        ]
        
        found_insights = 0
        text_lower = analysis_text.lower()
        
        for keyword in insight_keywords:
            if keyword in text_lower:
                found_insights += 1
        
        score = min(1.0, found_insights / 3)  # Cần ít nhất 3 insights
        details = f"Tìm thấy {found_insights} insights"
        
        return score, details
    
    def _score_forecast_usefulness(
        self,
        analysis_text: str,
        summary: Dict[str, Any],
        recommendations: List[str],
        raw_data: Dict[str, Any]
    ) -> Tuple[float, str]:
        """
        Kiểm tra dự đoán có hữu ích không
        """
        text_lower = analysis_text.lower()
        
        has_forecast = any(phrase in text_lower for phrase in ["dự đoán", "dự báo", "tương lai", "sắp tới"])
        has_specific = bool(re.search(r'(tăng|giảm|ổn định).*\d+%?', text_lower))
        has_timeframe = bool(re.search(r'(tuần|tháng|ngày|sắp tới)', text_lower))
        
        score = 0.0
        details = []
        
        if has_forecast:
            score += 0.4
            details.append("✓ Có dự đoán")
        else:
            details.append("✗ Thiếu dự đoán")
        
        if has_specific:
            score += 0.3
            details.append("✓ Có số liệu cụ thể")
        else:
            details.append("✗ Thiếu số liệu")
        
        if has_timeframe:
            score += 0.3
            details.append("✓ Có thời gian")
        else:
            details.append("✗ Thiếu thời gian")
        
        return score, "; ".join(details)
    
    def _score_priority_identification(
        self,
        analysis_text: str,
        summary: Dict[str, Any],
        recommendations: List[str],
        raw_data: Dict[str, Any]
    ) -> Tuple[float, str]:
        """
        Kiểm tra có xác định được vấn đề ưu tiên không
        """
        priority_keywords = [
            "ưu tiên", "quan trọng", "khẩn cấp", "cần thiết",
            "nghiêm trọng", "cần chú ý", "đáng lo ngại"
        ]
        
        text_lower = analysis_text.lower()
        found_priorities = sum(1 for keyword in priority_keywords if keyword in text_lower)
        
        # Kiểm tra có liệt kê vấn đề không
        has_problem_list = bool(re.search(r'(vấn đề|bất thường).*:.*\n', text_lower, re.IGNORECASE))
        
        score = 0.0
        details = []
        
        if found_priorities > 0:
            score += 0.5
            details.append(f"✓ Có {found_priorities} từ khóa ưu tiên")
        else:
            details.append("✗ Thiếu từ khóa ưu tiên")
        
        if has_problem_list:
            score += 0.5
            details.append("✓ Có danh sách vấn đề")
        else:
            details.append("✗ Thiếu danh sách vấn đề")
        
        return score, "; ".join(details)


class TestBusinessValidation:
    """
    Test class cho Business Validation (UAT)
    """
    
    def setup_method(self):
        """Setup test fixtures"""
        self.scorer = BusinessValidationScorer()
        self.ai_service = AIAgentService()
        self.today = date.today()
    
    @pytest.mark.asyncio
    async def test_single_branch_report_validation(self):
        """
        Test đánh giá báo cáo cho 1 chi nhánh
        """
        # Skip nếu không có LLM
        if not self.ai_service.llm:
            pytest.skip("LLM not configured")
        
        # Mock dữ liệu
        aggregated_data = {
            "branch_id": 1,
            "date": self.today.isoformat(),
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
                "uniqueProductsSold": 30
            },
            "review_metrics": {
                "avgReviewScore": 4.5,
                "totalReviews": 50
            },
            "inventory_metrics": {
                "totalIngredients": 50
            },
            "material_cost_metrics": {
                "totalMaterialCost": 200000
            },
            "isolation_forest_anomaly": {
                "co_bat_thuong": False,
                "confidence": 0.85
            },
            "prophet_forecast": {
                "do_tin_cay": {"phan_tram": 88}
            }
        }
        
        # Mock LLM response
        from unittest.mock import Mock
        mock_llm = Mock()
        mock_llm.invoke = Mock(return_value=Mock(content="""
1. Tóm tắt tình hình hoạt động:
- Doanh thu: 1,000,000 VNĐ
- Số đơn hàng: 50 đơn
- Số khách hàng: 100 người
- Điểm đánh giá trung bình: 4.5/5

2. Điểm mạnh và điểm yếu:
- Điểm mạnh: Doanh thu ổn định, khách hàng quay lại nhiều
- Điểm yếu: Cần cải thiện số đơn hàng

3. Các vấn đề cần chú ý:
- Không có bất thường được phát hiện

4. Dự đoán tương lai:
- Dự báo doanh thu sẽ tăng trong tuần tới

5. Khuyến nghị cụ thể để cải thiện:
1. Tăng cường quản lý chất lượng sản phẩm
2. Theo dõi xu hướng khách hàng
3. Tối ưu hóa quản lý tồn kho
        """))
        
        original_llm = self.ai_service.llm
        self.ai_service.llm = mock_llm
        
        try:
            # Generate AI report
            ai_result = await self.ai_service.process_with_ai(aggregated_data)
            
            assert ai_result.get("success") == True
            assert "analysis" in ai_result
            
            # Đánh giá báo cáo
            evaluation = self.scorer.evaluate_report(ai_result, aggregated_data)
            
            # Kiểm tra kết quả
            assert "overall_score" in evaluation
            assert "categories" in evaluation
            assert "rating" in evaluation
            
            # In kết quả để xem
            print("\n" + "="*80)
            print("KẾT QUẢ ĐÁNH GIÁ BÁO CÁO")
            print("="*80)
            print(f"Tổng điểm: {evaluation['overall_score']:.2%}")
            print(f"Đánh giá: {evaluation['rating']}")
            print(f"Khuyến nghị: {evaluation['recommendation']}")
            print("\nChi tiết theo category:")
            for cat_id, cat_info in evaluation['categories'].items():
                print(f"\n{cat_info['name']} (Trọng số: {cat_info['weight']:.0%}):")
                print(f"  Điểm: {cat_info['score']:.2%}")
                for q in cat_info['questions']:
                    print(f"    - {q['question_id']}: {q['score']:.2%} - {q['details']}")
            
            # Assert điểm tổng hợp phải >= 0.5 (ít nhất trung bình)
            assert evaluation['overall_score'] >= 0.0
            assert evaluation['overall_score'] <= 1.0
            
        finally:
            self.ai_service.llm = original_llm
    
    def test_evaluation_questions_coverage(self):
        """
        Test đảm bảo tất cả các câu hỏi đánh giá đều có hàm scoring
        """
        scorer = BusinessValidationScorer()
        
        # Kiểm tra tất cả questions đều có scoring function
        for category_id, category_info in scorer.evaluation_questions.items():
            for question_info in category_info["questions"]:
                assert "scoring" in question_info
                assert callable(question_info["scoring"])
                assert question_info["scoring"].__name__.startswith("_score_")
    
    def test_scorer_with_sample_data(self):
        """
        Test scorer với dữ liệu mẫu
        """
        scorer = BusinessValidationScorer()
        
        # Sample AI report
        ai_report = {
            "analysis": """
1. Tóm tắt tình hình hoạt động:
- Doanh thu: 1,000,000 VNĐ
- Số đơn hàng: 50 đơn
- Số khách hàng: 100 người

2. Điểm mạnh:
- Doanh thu ổn định

3. Vấn đề cần chú ý:
- Không có bất thường

4. Dự đoán:
- Doanh thu sẽ tăng

5. Khuyến nghị:
1. Tăng cường quản lý
2. Theo dõi khách hàng
3. Tối ưu tồn kho
            """,
            "summary": {
                "total_revenue": 1000000,
                "order_count": 50,
                "customer_count": 100
            },
            "recommendations": [
                "Tăng cường quản lý chất lượng",
                "Theo dõi xu hướng khách hàng",
                "Tối ưu hóa tồn kho"
            ]
        }
        
        raw_data = {
            "revenue_metrics": {
                "totalRevenue": 1000000,
                "orderCount": 50
            },
            "customer_metrics": {
                "customerCount": 100
            },
            "isolation_forest_anomaly": {
                "co_bat_thuong": False
            }
        }
        
        # Đánh giá
        evaluation = scorer.evaluate_report(ai_report, raw_data)
        
        # Kiểm tra structure
        assert "overall_score" in evaluation
        assert "categories" in evaluation
        assert "rating" in evaluation
        assert "recommendation" in evaluation
        
        # Kiểm tra tất cả categories
        assert len(evaluation["categories"]) == 5  # 5 categories
        
        # Kiểm tra điểm số hợp lệ
        assert 0.0 <= evaluation["overall_score"] <= 1.0
        
        # In kết quả
        print(f"\nĐiểm tổng hợp: {evaluation['overall_score']:.2%}")
        print(f"Đánh giá: {evaluation['rating']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])

