# Giải Thích Test: `test_api_endpoints.py`

## 🎯 Mục Đích File

File này test **API endpoints** trả về confidence scores đúng format:
- Test các endpoint `/api/ai/agent/analyze`, `/api/ai/collect-data`
- Kiểm tra response có chứa confidence scores không
- Kiểm tra cấu trúc của confidence object

**Lưu ý quan trọng:**
- Hầu hết test bị **skip** vì cần dependencies phức tạp (API keys, database, external services)
- Chỉ có 1 test thực sự chạy: `test_confidence_response_structure` (không cần gọi API thật)

---

## 📝 Giải Thích Từng Test

### **Test 1: `test_analyze_endpoint_returns_confidence`** (dòng 14-32)

```python
def test_analyze_endpoint_returns_confidence(self):
    """
    Test /api/ai/agent/analyze trả về confidence scores
    """
    pytest.skip("API endpoint tests require full setup...")
```

**Mục đích:**
- Test endpoint `/api/ai/agent/analyze` có trả về confidence scores không
- Endpoint này là API chính để phân tích dữ liệu với AI

**Tại sao bị skip?**
- Cần đầy đủ dependencies:
  - API keys (OpenAI, etc.)
  - Database connection
  - External services (order-service, catalog-service)
  - LLM (AI model) được cấu hình

**Code để test (đã comment):**
```python
# Khi có đầy đủ dependencies, có thể uncomment và chạy:
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
response = client.get("/api/ai/agent/analyze", 
                     params={"branch_id": 1, "date": date.today().isoformat()})

if response.status_code == 200:
    data = response.json()
    assert "ai_quality_score" in data or "overall_confidence" in data
```

**Endpoint thực tế:**
```http
POST /api/ai/agent/analyze
{
    "branch_id": 1,
    "date": "2025-01-15"
}

Response:
{
    "success": true,
    "branch_id": 1,
    "date": "2025-01-15",
    "analysis": "...",
    "ai_quality_score": 0.82,           # ✅ Phải có
    "overall_confidence": {...}          # ✅ Phải có
}
```

---

### **Test 2: `test_analyze_endpoint_confidence_structure`** (dòng 34-40)

```python
def test_analyze_endpoint_confidence_structure(self):
    """
    Test structure của confidence trong API response
    """
    pytest.skip("API endpoint tests require full setup...")
```

**Mục đích:**
- Test cấu trúc của `overall_confidence` trong API response
- Kiểm tra có đủ các keys: `overall`, `breakdown`, `level`, `warnings`

**Tại sao bị skip?**
- Giống test 1, cần đầy đủ dependencies

**Sẽ kiểm tra gì (nếu chạy):**
```python
response = client.post("/api/ai/agent/analyze", json={...})
data = response.json()

overall_confidence = data["overall_confidence"]
assert "overall" in overall_confidence
assert "breakdown" in overall_confidence
assert "level" in overall_confidence
assert "warnings" in overall_confidence
```

---

### **Test 3: `test_collect_data_endpoint_returns_scores`** (dòng 42-48)

```python
def test_collect_data_endpoint_returns_scores(self):
    """
    Test /api/ai/collect-data trả về confidence scores
    """
    pytest.skip("API endpoint tests require full setup...")
```

**Mục đích:**
- Test endpoint `/api/ai/collect-data` có trả về confidence scores không
- Endpoint này chỉ thu thập dữ liệu, không xử lý với AI

**Endpoint thực tế:**
```http
GET /api/ai/collect-data?branch_id=1&date=2025-01-15

Response:
{
    "branch_id": 1,
    "date": "2025-01-15",
    "revenue_metrics": {...},
    "customer_metrics": {...},
    "data_quality_score": 0.85,         # ✅ Phải có
    "ml_confidence_score": 0.78         # ✅ Phải có
}
```

**Tại sao bị skip?**
- Cần external services (order-service, catalog-service) để thu thập dữ liệu

---

### **Test 4: `test_confidence_response_structure`** (dòng 50-84) ✅ CHẠY

```python
def test_confidence_response_structure(self):
    """
    Test structure của confidence response (không cần gọi API thực)
    Verify structure của confidence object
    """
    from app.services.confidence_service import ConfidenceService
    
    service = ConfidenceService()
    
    # Test structure của overall_confidence
    result = service.calculate_overall_confidence(
        data_quality_score=0.85,
        ml_confidence_score=0.78,
        ai_quality_score=0.82,
        historical_accuracy_score=0.75
    )
    
    # Verify structure
    assert "overall" in result
    assert "breakdown" in result
    assert "level" in result
    assert "warnings" in result
    
    # Verify breakdown structure
    breakdown = result["breakdown"]
    assert "data_quality" in breakdown
    assert "ml_confidence" in breakdown
    assert "ai_quality" in breakdown
    assert "historical_accuracy" in breakdown
    
    # Verify level
    assert result["level"] in ["HIGH", "MEDIUM", "LOW"]
    
    # Verify warnings là list
    assert isinstance(result["warnings"], list)
```

**Đây là test DUY NHẤT chạy thực sự!**

**Mục đích:**
- Test cấu trúc của `overall_confidence` object
- **Không cần gọi API thật** → Chỉ gọi service trực tiếp
- Kiểm tra cấu trúc dữ liệu đúng format

**Các bước:**

1. **Tạo service và gọi hàm** (dòng 55-65)
   ```python
   service = ConfidenceService()
   result = service.calculate_overall_confidence(...)
   ```
   - Tạo `ConfidenceService` instance
   - Gọi `calculate_overall_confidence()` với 4 scores
   - Nhận về `result` (dictionary)

2. **Kiểm tra cấu trúc cơ bản** (dòng 67-71)
   ```python
   assert "overall" in result        # ✅ Điểm tổng thể
   assert "breakdown" in result      # ✅ Chi tiết từng điểm
   assert "level" in result          # ✅ Mức độ: HIGH/MEDIUM/LOW
   assert "warnings" in result       # ✅ Danh sách cảnh báo
   ```
   - Kiểm tra có đủ 4 keys cơ bản

3. **Kiểm tra breakdown structure** (dòng 73-78)
   ```python
   breakdown = result["breakdown"]
   assert "data_quality" in breakdown
   assert "ml_confidence" in breakdown
   assert "ai_quality" in breakdown
   assert "historical_accuracy" in breakdown
   ```
   - Kiểm tra `breakdown` có đủ 4 scores

4. **Kiểm tra level hợp lệ** (dòng 80-81)
   ```python
   assert result["level"] in ["HIGH", "MEDIUM", "LOW"]
   ```
   - `level` phải là một trong 3 giá trị

5. **Kiểm tra warnings là list** (dòng 83-84)
   ```python
   assert isinstance(result["warnings"], list)
   ```
   - `warnings` phải là list (có thể rỗng)

**Kết quả mong đợi:**
```python
result = {
    "overall": 0.80,                 # ✅ Điểm tổng thể
    "breakdown": {                   # ✅ Chi tiết
        "data_quality": 0.85,         # ✅
        "ml_confidence": 0.78,       # ✅
        "ai_quality": 0.82,          # ✅
        "historical_accuracy": 0.75  # ✅
    },
    "level": "HIGH",                 # ✅ HIGH, MEDIUM, hoặc LOW
    "warnings": []                   # ✅ List (có thể rỗng hoặc có warnings)
}
```

---

## 🔍 Tại Sao Hầu Hết Test Bị Skip?

### **Lý do:**

1. **Cần API keys:**
   - OpenAI API key (để gọi LLM)
   - Các API keys khác

2. **Cần Database:**
   - MySQL/MariaDB connection
   - Database đã setup với schema đúng

3. **Cần External Services:**
   - `order-service` (để lấy revenue, customer metrics...)
   - `catalog-service` (để lấy inventory, material cost...)
   - Các service này phải đang chạy

4. **Cần LLM:**
   - AI model (GPT-4, Claude...) phải được cấu hình
   - Có thể tốn tiền khi gọi API thật

### **Giải pháp:**

**Option 1: Mock tất cả (Như test integration)**
```python
# Mock API calls, LLM, database
with patch.object(...) as mock_api, \
     patch.object(...) as mock_llm:
    # Test API endpoint
```

**Option 2: Test với TestClient (Như code comment)**
```python
from fastapi.testclient import TestClient
client = TestClient(app)
response = client.post("/api/ai/agent/analyze", json={...})
```

**Option 3: Skip (Hiện tại)**
- Đơn giản nhất
- Tránh lỗi khi không có dependencies
- Có thể uncomment khi cần

---

## 💡 So Sánh với Test Khác

| | Test Integration | Test API Endpoints |
|---|---|---|
| **Test gì?** | Test service methods | Test API endpoints |
| **Cần gì?** | Mock dependencies | Dependencies thật hoặc mock |
| **Chạy được không?** | ✅ Luôn chạy được | ⚠️ Hầu hết bị skip |
| **Test structure?** | ✅ Có (test_full_flow) | ✅ Có (test_confidence_response_structure) |

**Tại sao cần cả 2?**
- **Test Integration**: Test logic bên trong (service methods)
- **Test API Endpoints**: Test API layer (HTTP requests/responses)

---

## 🎯 Test 4: Chi Tiết Hơn

### **Cấu trúc Overall Confidence:**

```python
{
    "overall": 0.80,                    # Điểm tổng thể (0.0 - 1.0)
    "breakdown": {                      # Chi tiết từng điểm
        "data_quality": 0.85,          # Chất lượng dữ liệu
        "ml_confidence": 0.78,         # Tin cậy ML
        "ai_quality": 0.82,            # Chất lượng AI
        "historical_accuracy": 0.75    # Độ chính xác lịch sử
    },
    "level": "HIGH",                   # Mức độ: HIGH/MEDIUM/LOW
    "warnings": [                      # Danh sách cảnh báo
        {
            "type": "data_quality",
            "message": "Data quality score is below threshold",
            "severity": "medium"
        }
    ]
}
```

### **Level có nghĩa gì?**

- `HIGH` (≥ 0.75): Báo cáo rất đáng tin cậy
- `MEDIUM` (0.5 - 0.75): Báo cáo đáng tin cậy ở mức trung bình
- `LOW` (< 0.5): Báo cáo ít đáng tin cậy

### **Warnings là gì?**

- Danh sách cảnh báo khi có vấn đề
- Ví dụ:
  - Data quality thấp
  - ML confidence thấp
  - AI quality thấp
  - Có lỗi khi tính toán

---

## 📊 Tóm Tắt

**File này có:**
- ✅ 4 test functions
- ⚠️ 3 test bị skip (cần dependencies)
- ✅ 1 test chạy thực sự (`test_confidence_response_structure`)

**Test chạy thực sự kiểm tra:**
1. ✅ Cấu trúc `overall_confidence` có đủ keys: `overall`, `breakdown`, `level`, `warnings`
2. ✅ `breakdown` có đủ 4 scores: `data_quality`, `ml_confidence`, `ai_quality`, `historical_accuracy`
3. ✅ `level` hợp lệ: "HIGH", "MEDIUM", hoặc "LOW"
4. ✅ `warnings` là list

**Lợi ích:**
- Đảm bảo API response có cấu trúc đúng
- Frontend có thể parse và hiển thị confidence scores
- Không cần dependencies phức tạp (chỉ test structure)

---

## 🚀 Cách Chạy Test

```bash
# Chạy tất cả test (sẽ skip 3 test)
pytest ai-service/tests/test_api_endpoints.py -v

# Chỉ chạy test confidence structure
pytest ai-service/tests/test_api_endpoints.py::TestAIAgentAPIEndpoints::test_confidence_response_structure -v

# Chạy và hiển thị test bị skip
pytest ai-service/tests/test_api_endpoints.py -v -rs
```

---

## 💡 Khi Nào Cần Uncomment Các Test Bị Skip?

1. **Khi có đầy đủ dependencies:**
   - API keys
   - Database setup
   - External services đang chạy

2. **Khi muốn test end-to-end:**
   - Test từ API request → response
   - Test với dữ liệu thật

3. **Khi deploy lên staging/production:**
   - Cần test với môi trường thật
   - Đảm bảo API hoạt động đúng

**Lưu ý:**
- Có thể tốn tiền (nếu gọi AI API thật)
- Có thể chậm (nếu gọi external services)
- Nên dùng test database, không dùng production database

