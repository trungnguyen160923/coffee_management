"""
Test nhanh để kiểm tra hàm _extract_recommendations có trích xuất đúng không
"""
import pytest
from app.services.ai_agent_service import AIAgentService


def test_extract_recommendations_with_markdown():
    """Test trích xuất recommendations từ format markdown thực tế"""
    service = AIAgentService()
    
    # Analysis text từ response thực tế
    analysis_text = """### 1. Tóm tắt tình hình hoạt động
Chi nhánh 1 trong ngày 9 tháng 11 năm 2025 ghi nhận doanh thu tổng cộng 257.000 VNĐ từ 3 đơn hàng, với giá trị đơn hàng trung bình là 128.500 VNĐ.

### 2. Điểm mạnh và điểm yếu
**Điểm mạnh:**
- Doanh thu tốt với giá trị đơn hàng trung bình cao.

### 3. Các vấn đề cần chú ý
Có dữ liệu bất thường được phát hiện với các chỉ tiêu sau:
- **Số lượng đơn hàng**: TĂNG 20.1%, mức độ nghiêm trọng: THẤP

### 4. Dự đoán tương lai
Dự báo trong 7 ngày tới cho số lượng đơn hàng sẽ dao động từ 219 đến 225 đơn hàng mỗi ngày.

### 5. Khuyến nghị cụ thể để cải thiện
- **Tăng cường chương trình khách hàng thân thiết**: Để cải thiện tỷ lệ khách hàng quay lại, nên triển khai các chương trình khuyến mãi hoặc ưu đãi cho khách hàng đã từng mua hàng.
- **Chiến dịch marketing**: Tăng cường quảng bá sản phẩm và dịch vụ qua các kênh truyền thông xã hội để thu hút thêm khách hàng mới.
- **Cải thiện trải nghiệm khách hàng**: Đánh giá và cải thiện quy trình phục vụ để nâng cao sự hài lòng của khách hàng, từ đó khuyến khích họ quay lại.
- **Theo dõi và phân tích dữ liệu thường xuyên**: Để phát hiện sớm các bất thường và điều chỉnh chiến lược kinh doanh kịp thời."""
    
    recommendations = service._extract_recommendations(analysis_text)
    
    print("\n" + "="*80)
    print("KẾT QUẢ TRÍCH XUẤT RECOMMENDATIONS:")
    print("="*80)
    print(f"Số lượng recommendations: {len(recommendations)}")
    for i, rec in enumerate(recommendations, 1):
        print(f"{i}. {rec}")
    print("="*80)
    
    # Kiểm tra kết quả
    assert len(recommendations) >= 3, f"Phải có ít nhất 3 recommendations, nhưng chỉ có {len(recommendations)}"
    
    # Kiểm tra các recommendations cụ thể
    rec_text = " ".join(recommendations).lower()
    assert "tăng cường" in rec_text or "chương trình khách hàng" in rec_text, "Thiếu recommendation về khách hàng thân thiết"
    assert "marketing" in rec_text or "quảng bá" in rec_text, "Thiếu recommendation về marketing"
    assert "trải nghiệm khách hàng" in rec_text or "cải thiện" in rec_text, "Thiếu recommendation về trải nghiệm"
    
    print("\n✅ Test PASSED - Recommendations được trích xuất đúng!")


def test_extract_recommendations_with_numbered_format():
    """Test trích xuất recommendations từ format số thứ tự (4. hoặc 5.)"""
    service = AIAgentService()
    
    analysis_text = """1. Tóm tắt tình hình hoạt động
Chi nhánh hoạt động tốt.

2. Điểm mạnh
- Doanh thu cao

3. Vấn đề
- Không có vấn đề

4. Dự đoán
- Doanh thu sẽ tăng

5. Khuyến nghị cụ thể để cải thiện
- Tăng cường quản lý chất lượng sản phẩm
- Theo dõi xu hướng khách hàng
- Tối ưu hóa quản lý tồn kho"""
    
    recommendations = service._extract_recommendations(analysis_text)
    
    assert len(recommendations) >= 3, f"Phải có ít nhất 3 recommendations"
    assert any("quản lý chất lượng" in rec.lower() for rec in recommendations)
    assert any("xu hướng khách hàng" in rec.lower() for rec in recommendations)
    
    print(f"\n✅ Test PASSED - Trích xuất được {len(recommendations)} recommendations từ format số thứ tự")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])

