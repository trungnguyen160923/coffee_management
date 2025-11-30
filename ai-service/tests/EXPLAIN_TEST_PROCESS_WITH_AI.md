# Giải Thích Test: `test_process_with_ai_includes_confidence`

## 🎯 Mục Đích Test

Test này kiểm tra xem khi **xử lý dữ liệu với AI** (`process_with_ai`), hệ thống có **tự động tính và thêm 2 điểm confidence** vào kết quả hay không:
- `ai_quality_score`: Điểm chất lượng phản hồi AI (0.0 - 1.0)
- `overall_confidence`: Điểm tin cậy tổng thể (gồm `overall`, `breakdown`, `level`)

**Khác với test trước:**
- Test trước: Kiểm tra khi **thu thập dữ liệu** → tính `data_quality_score` và `ml_confidence_score`
- Test này: Kiểm tra khi **AI xử lý dữ liệu** → tính `ai_quality_score` và `overall_confidence`

---

## 📝 Giải Thích Từng Phần

### **Bước 1: Kiểm tra LLM có sẵn không** (dòng 59-61)

```python
if not self.service.llm:
    pytest.skip("LLM not configured")
```

**Tại sao cần kiểm tra?**
- Test này cần LLM (AI model) để chạy
- Nếu không có LLM → bỏ qua test (skip), không fail

**LLM là gì?**
- LLM = Large Language Model (ví dụ: GPT-4, Claude)
- Dùng để AI phân tích dữ liệu và tạo báo cáo

---

### **Bước 2: Mock LLM response** (dòng 63-69)

```python
mock_analysis = """
Tóm tắt tình hình:
- Doanh thu: 1,000,000 VNĐ
- Số đơn hàng: 50 đơn
- Số khách hàng: 100 người
"""
```

**Mục đích:** Tạo phản hồi giả từ AI (thay vì gọi AI thật - chậm và tốn tiền)

**Ví dụ:**
- Khi code gọi LLM để phân tích dữ liệu
- Thay vì gọi AI thật, nó sẽ nhận `mock_analysis` này

---

### **Bước 3: Thay thế LLM bằng Mock** (dòng 71-77)

```python
mock_llm = Mock()
mock_llm.invoke = Mock(return_value=Mock(content=mock_analysis))

original_llm = self.service.llm  # Lưu LLM gốc
self.service.llm = mock_llm       # Thay bằng mock
```

**Giải thích:**
- `Mock()`: Tạo object giả
- `mock_llm.invoke`: Khi code gọi `llm.invoke()`, nó sẽ trả về `mock_analysis`
- Lưu LLM gốc để sau này khôi phục lại

**Tại sao cần lưu và khôi phục?**
- Tránh ảnh hưởng đến các test khác
- Đảm bảo test độc lập với nhau

---

### **Bước 4: Chuẩn bị dữ liệu đầu vào** (dòng 81-99)

```python
aggregated_data = {
    "branch_id": 1,
    "date": "2025-01-15",
    "revenue_metrics": {"totalRevenue": 1000000, "orderCount": 50},
    "customer_metrics": {"customerCount": 100},
    "product_metrics": {},
    "review_metrics": {},
    "inventory_metrics": {},
    "material_cost_metrics": {},
    "isolation_forest_anomaly": {},
    "prophet_forecast": {},
    "data_quality_score": 0.85,      # ✅ Đã có từ bước collect
    "ml_confidence_score": 0.78       # ✅ Đã có từ bước collect
}
```

**Đây là dữ liệu đã được thu thập:**
- Có đầy đủ metrics từ các API
- Có 2 điểm confidence từ bước trước (`data_quality_score`, `ml_confidence_score`)
- Sẽ được đưa vào AI để phân tích

---

### **Bước 5: Gọi hàm thật** (dòng 101-103)

```python
result = await self.service.process_with_ai(
    aggregated_data=aggregated_data
)
```

**Hàm này làm gì?**
1. Gửi `aggregated_data` cho AI (LLM) để phân tích
2. AI tạo báo cáo text (nhưng bị mock, nên dùng `mock_analysis`)
3. **Tự động tính** `ai_quality_score` (đánh giá chất lượng báo cáo AI)
4. **Tự động tính** `overall_confidence` (tổng hợp tất cả confidence scores)
5. Trả về kết quả

**Kết quả mong đợi:**
```python
result = {
    "analysis": "Tóm tắt tình hình: ...",  # Text từ AI
    "summary": {...},
    "recommendations": [...],
    "ai_quality_score": 0.82,              # ✅ Phải có
    "overall_confidence": {                 # ✅ Phải có
        "overall": 0.80,
        "breakdown": {...},
        "level": "HIGH"
    }
}
```

---

### **Bước 6: Kiểm tra AI Quality Score** (dòng 105-107)

```python
assert "ai_quality_score" in result
assert 0.0 <= result["ai_quality_score"] <= 1.0
```

**Ý nghĩa:**
- `assert "ai_quality_score" in result`: Kiểm tra kết quả có chứa `ai_quality_score` không
- `assert 0.0 <= ... <= 1.0`: Kiểm tra giá trị hợp lệ (0% đến 100%)

**AI Quality Score là gì?**
- Đánh giá chất lượng báo cáo AI tạo ra
- Dựa trên:
  - **Metrics Coverage (30%)**: AI có đề cập đủ metrics không?
  - **Anomalies Coverage (30%)**: AI có phát hiện đủ bất thường không?
  - **Fact Accuracy (20%)**: Số liệu AI đưa ra có chính xác không?
  - **Logic Consistency (20%)**: Khuyến nghị có logic không?

**Ví dụ:**
- `ai_quality_score = 0.85` → Báo cáo AI chất lượng tốt (85%)
- `ai_quality_score = 0.30` → Báo cáo AI chất lượng kém (30%)

---

### **Bước 7: Kiểm tra Overall Confidence** (dòng 109-113)

```python
assert "overall_confidence" in result
assert "overall" in result["overall_confidence"]
assert "breakdown" in result["overall_confidence"]
assert "level" in result["overall_confidence"]
```

**Ý nghĩa:**
- Kiểm tra `overall_confidence` có cấu trúc đúng không
- Phải có 3 keys: `overall`, `breakdown`, `level`

**Overall Confidence là gì?**
- Điểm tin cậy tổng thể của toàn bộ báo cáo
- Tổng hợp từ 4 điểm:
  1. `data_quality_score` (chất lượng dữ liệu đầu vào)
  2. `ml_confidence_score` (tin cậy mô hình ML)
  3. `ai_quality_score` (chất lượng báo cáo AI)
  4. `historical_accuracy_score` (độ chính xác lịch sử)

**Cấu trúc mong đợi:**
```python
overall_confidence = {
    "overall": 0.80,           # ✅ Điểm tổng thể (0.0 - 1.0)
    "breakdown": {              # ✅ Chi tiết từng điểm
        "data_quality": 0.85,
        "ml_confidence": 0.78,
        "ai_quality": 0.82,
        "historical_accuracy": 0.75
    },
    "level": "HIGH"            # ✅ Mức độ: HIGH, MEDIUM, LOW
}
```

**Level có nghĩa gì?**
- `HIGH` (≥ 0.75): Báo cáo rất đáng tin cậy
- `MEDIUM` (0.5 - 0.75): Báo cáo đáng tin cậy ở mức trung bình
- `LOW` (< 0.5): Báo cáo ít đáng tin cậy

---

### **Bước 8: Khôi phục LLM gốc** (dòng 114-116)

```python
finally:
    # Restore original LLM
    self.service.llm = original_llm
```

**Tại sao cần `finally`?**
- `finally` luôn chạy, dù test pass hay fail
- Đảm bảo LLM gốc được khôi phục
- Tránh ảnh hưởng đến các test khác

**Ví dụ:**
- Nếu test fail ở dòng 106 → `finally` vẫn chạy → khôi phục LLM
- Nếu test pass → `finally` vẫn chạy → khôi phục LLM

---

## 🔍 Tóm Tắt

**Test này đảm bảo:**
1. Khi AI xử lý dữ liệu, hệ thống **tự động tính** `ai_quality_score`
2. Hệ thống **tự động tính** `overall_confidence` (gồm `overall`, `breakdown`, `level`)
3. Cả 2 đều được **thêm vào** kết quả trả về
4. Giá trị của chúng **hợp lệ** (0.0 - 1.0 cho `ai_quality_score`, cấu trúc đúng cho `overall_confidence`)

**Tại sao quan trọng?**
- `ai_quality_score` giúp biết **báo cáo AI có chất lượng** không
- `overall_confidence` giúp biết **toàn bộ báo cáo có đáng tin** không
- Nếu thiếu → người dùng không biết độ tin cậy của báo cáo
- Nếu cấu trúc sai → frontend không hiển thị được

---

## 💡 So Sánh với Test Trước

| Test Trước | Test Này |
|------------|----------|
| `test_collect_data_includes_confidence_scores` | `test_process_with_ai_includes_confidence` |
| Kiểm tra khi **thu thập dữ liệu** | Kiểm tra khi **AI xử lý dữ liệu** |
| Tính `data_quality_score` | Tính `ai_quality_score` |
| Tính `ml_confidence_score` | Tính `overall_confidence` |
| Mock các API calls | Mock LLM (AI) |
| Input: `branch_id`, `target_date` | Input: `aggregated_data` (đã có confidence scores) |

**Flow thực tế:**
```
1. collect_three_json_data() 
   → Tính data_quality_score, ml_confidence_score
   
2. process_with_ai(aggregated_data)
   → Tính ai_quality_score, overall_confidence
   → Tổng hợp tất cả confidence scores
```

---

## 🎬 Ví Dụ Kết Quả Mong Đợi

```python
result = {
    "analysis": "Tóm tắt tình hình:\n- Doanh thu: 1,000,000 VNĐ\n...",
    "summary": {
        "totalRevenue": 1000000,
        "orderCount": 50,
        "customerCount": 100
    },
    "recommendations": [
        "Tăng cường marketing để thu hút thêm khách hàng",
        "Tối ưu hóa chi phí nguyên liệu"
    ],
    "ai_quality_score": 0.82,        # ✅ Có tồn tại, 0.0 <= 0.82 <= 1.0
    "overall_confidence": {          # ✅ Có tồn tại
        "overall": 0.80,             # ✅ Có tồn tại
        "breakdown": {                # ✅ Có tồn tại
            "data_quality": 0.85,
            "ml_confidence": 0.78,
            "ai_quality": 0.82,
            "historical_accuracy": 0.75
        },
        "level": "HIGH"              # ✅ Có tồn tại, và là "HIGH", "MEDIUM", hoặc "LOW"
    }
}
```

