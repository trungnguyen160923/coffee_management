"""
Integration tests for AI Agent Service với Confidence Scoring
Test toàn bộ flow từ collect data → AI processing → confidence calculation
"""
import pytest
from datetime import date
from unittest.mock import Mock, patch, AsyncMock
from app.services.ai_agent_service import AIAgentService
from app.services.confidence_service import ConfidenceService


class TestAIAgentConfidenceIntegration:
    """Test tích hợp confidence scoring vào AI Agent Service"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.service = AIAgentService()
        self.today = date.today()
    
    @pytest.mark.asyncio
    async def test_collect_data_includes_confidence_scores(self):
        """Test collect_three_json_data có tính confidence scores"""
        # Mock DB row + ML calls
        fake_row = Mock()
        fake_row.branch_id = 1
        fake_row.report_date = self.today
        fake_row.total_revenue = 1000000
        fake_row.order_count = 50
        fake_row.avg_order_value = 20000
        fake_row.customer_count = 100
        fake_row.new_customers = 20
        fake_row.repeat_customers = 80
        fake_row.unique_products_sold = 30
        fake_row.product_diversity_score = 0.8
        fake_row.top_selling_product_id = 10
        fake_row.avg_review_score = 4.5
        fake_row.material_cost = 200000
        fake_row.low_stock_products = 2
        fake_row.out_of_stock_products = 1
        fake_row.peak_hour = 10
        fake_row.day_of_week = 4
        fake_row.is_weekend = False
        fake_row.avg_preparation_time_seconds = None
        fake_row.staff_efficiency_score = None
        fake_row.waste_percentage = None
        fake_row.created_at = None

        with patch.object(self.service, '_get_daily_branch_metrics_row', return_value=fake_row) as _mock_row, \
             patch.object(self.service, 'get_isolation_forest_json') as mock_isolation, \
             patch.object(self.service, 'get_prophet_forecast_json') as mock_prophet:
            
            mock_isolation.return_value = {"co_bat_thuong": False, "confidence": 0.85}
            mock_prophet.return_value = {"do_tin_cay": {"phan_tram": 88}}
            
            # Call collect_three_json_data
            result = await self.service.collect_three_json_data(
                branch_id=1,
                target_date=self.today
            )
            
            # Verify confidence scores được tính và thêm vào
            assert "data_quality_score" in result
            assert "ml_confidence_score" in result
            
            assert 0.0 <= result["data_quality_score"] <= 1.0
            assert 0.0 <= result["ml_confidence_score"] <= 1.0
    
    @pytest.mark.asyncio
    async def test_process_with_ai_includes_confidence(self):
        """Test process_with_ai có tính AI quality và overall confidence"""
        # Skip test nếu không có LLM
        if not self.service.llm:
            pytest.skip("LLM not configured")
        
        # Mock LLM response
        mock_analysis = """
        Tóm tắt tình hình:
        - Doanh thu: 1,000,000 VNĐ
        - Số đơn hàng: 50 đơn
        - Số khách hàng: 100 người
        """
        
        # Mock LLM object bằng cách thay thế toàn bộ object
        mock_llm = Mock()
        mock_llm.invoke = Mock(return_value=Mock(content=mock_analysis))
        
        # Lưu LLM gốc và thay thế
        original_llm = self.service.llm
        self.service.llm = mock_llm
        
        try:
            
            aggregated_data = {
                "branch_id": 1,
                "report_date": self.today.isoformat(),
                "daily_branch_metrics": {
                    "branch_id": 1,
                    "report_date": self.today.isoformat(),
                    "total_revenue": 1000000,
                    "order_count": 50,
                    "avg_order_value": 20000,
                    "customer_count": 100,
                    "repeat_customers": 80,
                    "new_customers": 20,
                    "unique_products_sold": 30,
                    "product_diversity_score": 0.8,
                    "avg_review_score": 4.5,
                    "material_cost": 200000,
                    "low_stock_products": 2,
                    "out_of_stock_products": 1,
                    "peak_hour": 10
                },
                "derived_kpis": {
                    "profit": 800000,
                    "profit_margin": 0.8,
                    "customer_retention_rate": 0.8
                },
                "isolation_forest_anomaly": {},
                "prophet_forecast": {},
                "data_quality_score": 0.85,
                "ml_confidence_score": 0.78
            }
            
            result = await self.service.process_with_ai(
                aggregated_data=aggregated_data
            )
            
            # Verify có AI quality score
            assert "ai_quality_score" in result
            assert 0.0 <= result["ai_quality_score"] <= 1.0
            
            # Verify có overall confidence
            assert "overall_confidence" in result
            assert "overall" in result["overall_confidence"]
            assert "breakdown" in result["overall_confidence"]
            assert "level" in result["overall_confidence"]
        finally:
            # Restore original LLM
            self.service.llm = original_llm
    
    @pytest.mark.asyncio
    async def test_full_flow_with_confidence(self):
        """Test toàn bộ flow từ collect → AI → confidence"""
        # Skip test nếu không có LLM
        if not self.service.llm:
            pytest.skip("LLM not configured")
        
        # Mock LLM object
        mock_llm = Mock()
        mock_llm.invoke = Mock(return_value=Mock(content="Analysis text here"))
        original_llm = self.service.llm
        self.service.llm = mock_llm
        
        try:
            # Mock tất cả dependencies
            fake_row = Mock()
            fake_row.branch_id = 1
            fake_row.report_date = self.today
            fake_row.total_revenue = 1000000
            fake_row.order_count = 50
            fake_row.avg_order_value = 20000
            fake_row.customer_count = 100
            fake_row.new_customers = 20
            fake_row.repeat_customers = 80
            fake_row.unique_products_sold = 30
            fake_row.product_diversity_score = 0.8
            fake_row.top_selling_product_id = 10
            fake_row.avg_review_score = 4.5
            fake_row.material_cost = 200000
            fake_row.low_stock_products = 2
            fake_row.out_of_stock_products = 1
            fake_row.peak_hour = 10
            fake_row.day_of_week = 4
            fake_row.is_weekend = False
            fake_row.avg_preparation_time_seconds = None
            fake_row.staff_efficiency_score = None
            fake_row.waste_percentage = None
            fake_row.created_at = None

            with patch.object(self.service, '_get_daily_branch_metrics_row', return_value=fake_row) as _mock_row, \
                 patch.object(self.service, 'get_isolation_forest_json') as mock_isolation, \
                 patch.object(self.service, 'get_prophet_forecast_json') as mock_prophet:
                
                mock_isolation.return_value = {"confidence": 0.85}
                mock_prophet.return_value = {"do_tin_cay": {"phan_tram": 88}}
                
                # 1. Collect data
                aggregated_data = await self.service.collect_three_json_data(
                    branch_id=1,
                    target_date=self.today
                )
                
                assert "data_quality_score" in aggregated_data
                assert "ml_confidence_score" in aggregated_data
                
                # 2. Process with AI
                ai_result = await self.service.process_with_ai(
                    aggregated_data=aggregated_data
                )
                
                assert "ai_quality_score" in ai_result
                assert "overall_confidence" in ai_result
                
                # 3. Verify overall confidence structure
                overall = ai_result["overall_confidence"]
                assert "overall" in overall
                assert "breakdown" in overall
                assert "level" in overall
                assert overall["level"] in ["HIGH", "MEDIUM", "LOW"]
                
                # 4. Verify breakdown có đủ 4 scores
                breakdown = overall["breakdown"]
                assert "data_quality" in breakdown
                assert "ml_confidence" in breakdown
                assert "ai_quality" in breakdown
                assert "historical_accuracy" in breakdown
        finally:
            # Restore original LLM
            self.service.llm = original_llm
    
    @pytest.mark.asyncio
    async def test_error_handling_in_confidence_calculation(self):
        """Test xử lý lỗi khi tính confidence"""
        # Test khi confidence service throw exception
        with patch.object(self.service.confidence_service, 'calculate_data_quality_score', side_effect=Exception("Error")) as mock_error:
            aggregated_data = {
                "revenue_metrics": {"totalRevenue": 1000000}
            }
            
            # Should not crash, should use default values
            with patch.object(self.service, '_get_daily_branch_metrics_row', return_value=None):
                result = await self.service.collect_three_json_data(
                    branch_id=1,
                    target_date=self.today
                )
            
            # Verify có default values
            assert "data_quality_score" in result
            assert result["data_quality_score"] == 0.0  # Default on error


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

