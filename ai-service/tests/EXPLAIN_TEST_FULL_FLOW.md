# Giải Thích Test: `test_full_flow_with_confidence`

## 🎯 Mục Đích Test

Test này kiểm tra **TOÀN BỘ FLOW** từ đầu đến cuối:
1. **Thu thập dữ liệu** → Tính `data_quality_score`, `ml_confidence_score`
2. **AI xử lý dữ liệu** → Tính `ai_quality_score`, `overall_confidence`
3. **Kiểm tra cấu trúc** → Đảm bảo `overall_confidence` có đủ thông tin

**Khác với 2 test trước:**
- Test 1: Chỉ test bước **collect data**
- Test 2: Chỉ test bước **process with AI**
- **Test này**: Test **CẢ 2 BƯỚC** liên tiếp + kiểm tra chi tiết breakdown

---

## 📝 Giải Thích Từng Phần

### **Bước 1: Kiểm tra và Mock LLM** (dòng 121-129)

```python
if not self.service.llm:
    pytest.skip("LLM not configured")

mock_llm = Mock()
mock_llm.invoke = Mock(return_value=Mock(content="Analysis text here"))
original_llm = self.service.llm
self.service.llm = mock_llm
```

**Giống test trước:**
- Kiểm tra LLM có sẵn không
- Mock LLM để không gọi AI thật
- Lưu LLM gốc để khôi phục sau

---

### **Bước 2: Mock tất cả API và ML models** (dòng 132-150)

```python
with patch.object(self.service.order_client, 'get_revenue_metrics', ...) as mock_revenue, \
     patch.object(self.service.order_client, 'get_customer_metrics', ...) as mock_customer, \
     # ... 6 API khác ...
     patch.object(self.service, 'get_isolation_forest_json') as mock_isolation, \
     patch.object(self.service, 'get_prophet_forecast_json') as mock_prophet:
    
    # Setup dữ liệu giả
    mock_revenue.return_value = {"totalRevenue": 1000000, "orderCount": 50}
    mock_customer.return_value = {"customerCount": 100}
    # ... các mock khác ...
```

**Giống test đầu tiên:**
- Mock 6 API calls (revenue, customer, product, review, inventory, material)
- Mock 2 ML models (isolation forest, prophet forecast)
- Định nghĩa dữ liệu giả cho tất cả

**Tại sao cần mock tất cả?**
- Vì test này chạy **toàn bộ flow** từ đầu
- Bước 1 (collect data) cần gọi các API này
- Nếu không mock → sẽ gọi API thật (chậm, có thể lỗi)

---

### **Bước 3: Collect Data (Thu thập dữ liệu)** (dòng 152-159)

```python
# 1. Collect data
aggregated_data = await self.service.collect_three_json_data(
    branch_id=1,
    target_date=self.today
)

assert "data_quality_score" in aggregated_data
assert "ml_confidence_score" in aggregated_data
```

**Đây là bước đầu tiên trong flow:**
1. Gọi `collect_three_json_data()` với `branch_id=1` và `target_date`
2. Hàm này sẽ:
   - Gọi 6 API (bị mock, nên dùng dữ liệu giả)
   - Gọi 2 ML models (bị mock, nên dùng dữ liệu giả)
   - **Tự động tính** `data_quality_score` và `ml_confidence_score`
   - Trả về `aggregated_data`

**Kiểm tra:**
- `aggregated_data` phải có `data_quality_score`
- `aggregated_data` phải có `ml_confidence_score`

**Kết quả mong đợi:**
```python
aggregated_data = {
    "branch_id": 1,
    "date": "2025-01-15",
    "revenue_metrics": {"totalRevenue": 1000000, "orderCount": 50},
    "customer_metrics": {"customerCount": 100},
    # ... các metrics khác ...
    "data_quality_score": 0.85,      # ✅ Phải có
    "ml_confidence_score": 0.78        # ✅ Phải có
}
```

---

### **Bước 4: Process with AI (AI xử lý dữ liệu)** (dòng 161-167)

```python
# 2. Process with AI
ai_result = await self.service.process_with_ai(
    aggregated_data=aggregated_data
)

assert "ai_quality_score" in ai_result
assert "overall_confidence" in ai_result
```

**Đây là bước thứ hai trong flow:**
1. Gọi `process_with_ai()` với `aggregated_data` (đã có confidence scores từ bước 1)
2. Hàm này sẽ:
   - Gửi dữ liệu cho AI (LLM) để phân tích (bị mock, nên dùng "Analysis text here")
   - AI tạo báo cáo text
   - **Tự động tính** `ai_quality_score` (đánh giá chất lượng báo cáo AI)
   - **Tự động tính** `overall_confidence` (tổng hợp tất cả confidence scores)
   - Trả về `ai_result`

**Kiểm tra:**
- `ai_result` phải có `ai_quality_score`
- `ai_result` phải có `overall_confidence`

**Kết quả mong đợi:**
```python
ai_result = {
    "analysis": "Analysis text here",
    "summary": {...},
    "recommendations": [...],
    "ai_quality_score": 0.82,         # ✅ Phải có
    "overall_confidence": {...}        # ✅ Phải có
}
```

---

### **Bước 5: Kiểm tra cấu trúc Overall Confidence** (dòng 169-174)

```python
# 3. Verify overall confidence structure
overall = ai_result["overall_confidence"]
assert "overall" in overall
assert "breakdown" in overall
assert "level" in overall
assert overall["level"] in ["HIGH", "MEDIUM", "LOW"]
```

**Kiểm tra cấu trúc cơ bản:**
- `overall_confidence` phải có key `overall` (điểm tổng thể)
- `overall_confidence` phải có key `breakdown` (chi tiết từng điểm)
- `overall_confidence` phải có key `level` (mức độ: HIGH/MEDIUM/LOW)
- `level` phải là một trong 3 giá trị: "HIGH", "MEDIUM", "LOW"

**Cấu trúc mong đợi:**
```python
overall_confidence = {
    "overall": 0.80,           # ✅ Điểm tổng thể (0.0 - 1.0)
    "breakdown": {...},        # ✅ Chi tiết (sẽ kiểm tra ở bước sau)
    "level": "HIGH"            # ✅ Mức độ: HIGH, MEDIUM, hoặc LOW
}
```

**Level có nghĩa gì?**
- `HIGH` (≥ 0.75): Báo cáo rất đáng tin cậy
- `MEDIUM` (0.5 - 0.75): Báo cáo đáng tin cậy ở mức trung bình
- `LOW` (< 0.5): Báo cáo ít đáng tin cậy

---

### **Bước 6: Kiểm tra Breakdown có đủ 4 scores** (dòng 176-181)

```python
# 4. Verify breakdown có đủ 4 scores
breakdown = overall["breakdown"]
assert "data_quality" in breakdown
assert "ml_confidence" in breakdown
assert "ai_quality" in breakdown
assert "historical_accuracy" in breakdown
```

**Đây là phần quan trọng nhất!**

**Breakdown là gì?**
- `breakdown` = chi tiết từng điểm confidence
- Giúp người dùng biết điểm nào cao, điểm nào thấp

**Phải có đủ 4 scores:**
1. `data_quality`: Chất lượng dữ liệu đầu vào (từ bước collect)
2. `ml_confidence`: Tin cậy mô hình ML (từ bước collect)
3. `ai_quality`: Chất lượng báo cáo AI (từ bước process with AI)
4. `historical_accuracy`: Độ chính xác lịch sử (tự động tính từ database)

**Cấu trúc breakdown mong đợi:**
```python
breakdown = {
    "data_quality": 0.85,           # ✅ Từ aggregated_data["data_quality_score"]
    "ml_confidence": 0.78,           # ✅ Từ aggregated_data["ml_confidence_score"]
    "ai_quality": 0.82,              # ✅ Từ ai_result["ai_quality_score"]
    "historical_accuracy": 0.75       # ✅ Tự động tính từ database (hoặc default 0.75)
}
```

**Tại sao cần 4 scores?**
- `data_quality`: Dữ liệu đầu vào có tốt không?
- `ml_confidence`: Mô hình ML có tin cậy không?
- `ai_quality`: Báo cáo AI có chất lượng không?
- `historical_accuracy`: Dự đoán trước đây có chính xác không?

**Overall score được tính từ 4 scores này:**
```python
overall = (
    data_quality * 0.3 +
    ml_confidence * 0.25 +
    ai_quality * 0.25 +
    historical_accuracy * 0.2
)
```

---

### **Bước 7: Khôi phục LLM** (dòng 182-184)

```python
finally:
    # Restore original LLM
    self.service.llm = original_llm
```

**Giống test trước:**
- Dùng `finally` để luôn khôi phục LLM gốc
- Đảm bảo test độc lập với các test khác

---

## 🔍 Tóm Tắt Flow

```
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 1: Collect Data                                       │
│  ────────────────────────────────────────────────────────   │
│  1. Gọi 6 API (revenue, customer, product, ...)            │
│  2. Gọi 2 ML models (isolation forest, prophet)            │
│  3. Tính data_quality_score                                 │
│  4. Tính ml_confidence_score                                 │
│  → aggregated_data = {                                      │
│       ...,                                                  │
│       "data_quality_score": 0.85,                           │
│       "ml_confidence_score": 0.78                           │
│     }                                                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 2: Process with AI                                   │
│  ────────────────────────────────────────────────────────   │
│  1. Gửi aggregated_data cho AI (LLM)                       │
│  2. AI tạo báo cáo text                                     │
│  3. Tính ai_quality_score                                   │
│  4. Tính overall_confidence (tổng hợp 4 scores)            │
│  → ai_result = {                                            │
│       "analysis": "...",                                    │
│       "ai_quality_score": 0.82,                             │
│       "overall_confidence": {                               │
│         "overall": 0.80,                                    │
│         "breakdown": {                                      │
│           "data_quality": 0.85,                             │
│           "ml_confidence": 0.78,                             │
│           "ai_quality": 0.82,                               │
│           "historical_accuracy": 0.75                        │
│         },                                                  │
│         "level": "HIGH"                                     │
│       }                                                     │
│     }                                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Test này đảm bảo gì?

1. ✅ **Flow hoàn chỉnh hoạt động**: Từ collect → AI → confidence
2. ✅ **Confidence scores được tính đúng**: Có đủ 4 scores trong breakdown
3. ✅ **Cấu trúc dữ liệu đúng**: `overall_confidence` có đủ `overall`, `breakdown`, `level`
4. ✅ **Level hợp lệ**: Chỉ có "HIGH", "MEDIUM", hoặc "LOW"
5. ✅ **Breakdown đầy đủ**: Có đủ 4 scores: `data_quality`, `ml_confidence`, `ai_quality`, `historical_accuracy`

---

## 💡 So Sánh với 2 Test Trước

| | Test 1 | Test 2 | Test 3 (Này) |
|---|---|---|---|
| **Tên** | `test_collect_data_includes_confidence_scores` | `test_process_with_ai_includes_confidence` | `test_full_flow_with_confidence` |
| **Test gì?** | Chỉ bước collect | Chỉ bước process with AI | **Cả 2 bước** |
| **Mock gì?** | API calls | LLM | **Cả API và LLM** |
| **Kiểm tra gì?** | `data_quality_score`, `ml_confidence_score` | `ai_quality_score`, `overall_confidence` cơ bản | **Tất cả + breakdown chi tiết** |
| **Kiểm tra breakdown?** | ❌ Không | ❌ Không | ✅ **Có, kiểm tra đủ 4 scores** |

**Tại sao cần test này?**
- Test 1 và Test 2 chỉ test từng bước riêng lẻ
- Test này test **toàn bộ flow** → đảm bảo các bước kết nối với nhau đúng
- Kiểm tra breakdown chi tiết → đảm bảo người dùng có đủ thông tin

---

## 🎬 Ví Dụ Kết Quả Mong Đợi

```python
# Sau bước 1 (collect data)
aggregated_data = {
    "branch_id": 1,
    "date": "2025-01-15",
    "revenue_metrics": {"totalRevenue": 1000000, "orderCount": 50},
    "customer_metrics": {"customerCount": 100},
    "product_metrics": {"uniqueProductsSold": 30},
    "review_metrics": {"avgReviewScore": 4.5},
    "inventory_metrics": {"totalIngredients": 50},
    "material_cost_metrics": {"totalMaterialCost": 200000},
    "isolation_forest_anomaly": {"confidence": 0.85},
    "prophet_forecast": {"do_tin_cay": {"phan_tram": 88}},
    "data_quality_score": 0.85,      # ✅
    "ml_confidence_score": 0.78       # ✅
}

# Sau bước 2 (process with AI)
ai_result = {
    "analysis": "Analysis text here",
    "summary": {...},
    "recommendations": [...],
    "ai_quality_score": 0.82,         # ✅
    "overall_confidence": {           # ✅
        "overall": 0.80,              # ✅
        "breakdown": {                # ✅
            "data_quality": 0.85,      # ✅
            "ml_confidence": 0.78,    # ✅
            "ai_quality": 0.82,       # ✅
            "historical_accuracy": 0.75 # ✅
        },
        "level": "HIGH"               # ✅
    }
}
```

---

## ⚠️ Lưu Ý

1. **Test này cần LLM**: Nếu không có LLM → skip test
2. **Test này mock tất cả**: Không gọi API thật, không gọi AI thật
3. **Test này chạy toàn bộ flow**: Từ đầu đến cuối, không chỉ một phần
4. **Test này kiểm tra breakdown**: Đảm bảo có đủ 4 scores trong breakdown

