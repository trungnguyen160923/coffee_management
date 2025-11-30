"""
Integration test để kiểm thử Business Validation đã được tích hợp vào hệ thống
Chạy test này để xem logging và kết quả đánh giá
"""
import pytest
import asyncio
from datetime import date
from app.services.ai_agent_service import AIAgentService


@pytest.mark.asyncio
async def test_business_validation_integration_single_branch():
    """
    Test tích hợp Business Validation với single branch report
    Kiểm tra xem logging có hiển thị đầy đủ không
    """
    service = AIAgentService()
    
    # Skip nếu không có LLM
    if not service.llm:
        pytest.skip("LLM not configured - cannot test business validation integration")
    
    # Test với branch_id và date cụ thể
    branch_id = 1
    target_date = date.today()
    
    print("\n" + "="*80)
    print(f"TESTING BUSINESS VALIDATION INTEGRATION - Branch {branch_id}, Date: {target_date}")
    print("="*80)
    print("Đang thu thập dữ liệu và tạo báo cáo AI...")
    print("(Xem log để thấy kết quả Business Validation)")
    print("="*80 + "\n")
    
    try:
        # 1. Collect data
        aggregated_data = await service.collect_three_json_data(
            branch_id=branch_id,
            target_date=target_date
        )
        
        print(f"✓ Dữ liệu đã được thu thập")
        print(f"  - Data Quality Score: {aggregated_data.get('data_quality_score', 0):.2%}")
        print(f"  - ML Confidence Score: {aggregated_data.get('ml_confidence_score', 0):.2%}\n")
        
        # 2. Process with AI (sẽ tự động chạy Business Validation)
        ai_result = await service.process_with_ai(
            aggregated_data=aggregated_data
        )
        
        # 3. Kiểm tra kết quả
        assert ai_result.get("success") == True, "AI processing should succeed"
        assert "analysis" in ai_result, "Should have analysis"
        
        # 4. Kiểm tra business validation có trong response không
        business_validation = ai_result.get("business_validation")
        
        if business_validation:
            print("\n" + "="*80)
            print("KẾT QUẢ BUSINESS VALIDATION (từ response):")
            print("="*80)
            print(f"Tổng điểm: {business_validation.get('overall_score', 0):.2%}")
            print(f"Đánh giá: {business_validation.get('rating', 'N/A')}")
            print(f"Khuyến nghị: {business_validation.get('recommendation', 'N/A')}")
            print("\nChi tiết theo category:")
            
            for cat_id, cat_info in business_validation.get("categories", {}).items():
                print(f"  {cat_info['name']}: {cat_info['score']:.2%}")
            
            print("="*80)
            
            # Assert điểm hợp lệ
            assert 0.0 <= business_validation.get("overall_score", 0) <= 1.0
            assert "rating" in business_validation
            assert business_validation["rating"] in ["XUẤT SẮC", "TỐT", "KHÁ", "TRUNG BÌNH", "YẾU"]
        else:
            print("\n⚠️  Business Validation không có trong response (có thể scorer không available)")
            print("   Kiểm tra log để xem có lỗi không")
        
        print("\n✅ Test hoàn thành! Kiểm tra log ở trên để xem chi tiết Business Validation.")
        
    except Exception as e:
        print(f"\n❌ Lỗi trong quá trình test: {e}")
        raise


@pytest.mark.asyncio
async def test_business_validation_integration_all_branches():
    """
    Test tích hợp Business Validation với all branches report
    """
    service = AIAgentService()
    
    # Skip nếu không có LLM
    if not service.llm:
        pytest.skip("LLM not configured - cannot test business validation integration")
    
    target_date = date.today()
    
    print("\n" + "="*80)
    print(f"TESTING BUSINESS VALIDATION INTEGRATION - ALL BRANCHES, Date: {target_date}")
    print("="*80)
    print("Đang thu thập dữ liệu và tạo báo cáo AI cho tất cả chi nhánh...")
    print("(Xem log để thấy kết quả Business Validation)")
    print("="*80 + "\n")
    
    try:
        # 1. Collect all branches data
        aggregated_data = await service.collect_all_branches_data(
            target_date=target_date
        )
        
        print(f"✓ Dữ liệu tất cả chi nhánh đã được thu thập\n")
        
        # 2. Process with AI (sẽ tự động chạy Business Validation)
        ai_result = await service.process_all_branches_with_ai(
            aggregated_data=aggregated_data
        )
        
        # 3. Kiểm tra kết quả
        assert ai_result.get("success") == True, "AI processing should succeed"
        assert "analysis" in ai_result, "Should have analysis"
        
        # 4. Kiểm tra business validation
        business_validation = ai_result.get("business_validation")
        
        if business_validation:
            print("\n" + "="*80)
            print("KẾT QUẢ BUSINESS VALIDATION - ALL BRANCHES (từ response):")
            print("="*80)
            print(f"Tổng điểm: {business_validation.get('overall_score', 0):.2%}")
            print(f"Đánh giá: {business_validation.get('rating', 'N/A')}")
            print("="*80)
        else:
            print("\n⚠️  Business Validation không có trong response")
        
        print("\n✅ Test hoàn thành!")
        
    except Exception as e:
        print(f"\n❌ Lỗi trong quá trình test: {e}")
        raise


if __name__ == "__main__":
    # Chạy test với output chi tiết
    pytest.main([__file__, "-v", "-s", "--log-cli-level=INFO"])

