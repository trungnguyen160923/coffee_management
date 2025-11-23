# Tests cho Confidence Scoring System

## Cấu trúc Tests

```
tests/
├── __init__.py
├── conftest.py              # Pytest fixtures chung
├── test_confidence_service.py      # Unit tests cho ConfidenceService
├── test_ai_agent_integration.py    # Integration tests cho AI Agent Service
└── test_api_endpoints.py           # API endpoint tests
```

## Chạy Tests

### Chạy tất cả tests:
```bash
cd ai-service
pytest
```

### Chạy tests với verbose output:
```bash
pytest -v
```

### Chạy tests cụ thể:
```bash
# Chỉ unit tests
pytest tests/test_confidence_service.py

# Chỉ integration tests
pytest tests/test_ai_agent_integration.py

# Chỉ API tests
pytest tests/test_api_endpoints.py
```

### Chạy tests với coverage:
```bash
pytest --cov=app.services.confidence_service --cov-report=html
```

## Test Coverage

### Unit Tests (`test_confidence_service.py`)

1. **TestDataQualityScore**
   - ✅ Test với dữ liệu đầy đủ → score cao
   - ✅ Test với dữ liệu thiếu → score thấp
   - ✅ Test với dữ liệu một phần → score trung bình
   - ✅ Test với dữ liệu cũ → freshness thấp
   - ✅ Test xử lý API error

2. **TestMLConfidenceScore**
   - ✅ Test khi có cả Isolation Forest và Prophet
   - ✅ Test khi chỉ có Isolation Forest
   - ✅ Test khi chỉ có Prophet Forecast
   - ✅ Test khi không có ML data → default
   - ✅ Test parse confidence từ string format

3. **TestAIQualityScore**
   - ✅ Test với analysis chính xác → score cao
   - ✅ Test với analysis không chính xác → score thấp
   - ✅ Test khi bỏ sót anomalies → coverage thấp
   - ✅ Test với analysis rỗng

4. **TestOverallConfidence**
   - ✅ Test overall confidence cao
   - ✅ Test overall confidence trung bình
   - ✅ Test overall confidence thấp
   - ✅ Test tạo warnings
   - ✅ Test breakdown structure
   - ✅ Test default historical accuracy

5. **TestHistoricalAccuracyScore**
   - ✅ Test tính historical accuracy với branch_id
   - ✅ Test return default khi không có data

### Integration Tests (`test_ai_agent_integration.py`)

1. **TestAIAgentConfidenceIntegration**
   - ✅ Test collect_data includes confidence scores
   - ✅ Test process_with_ai includes confidence
   - ✅ Test full flow với confidence
   - ✅ Test error handling trong confidence calculation

### API Tests (`test_api_endpoints.py`)

1. **TestAIAgentAPIEndpoints**
   - ✅ Test analyze endpoint trả về confidence
   - ✅ Test confidence structure trong API response
   - ✅ Test collect_data endpoint trả về scores

## Fixtures

Các fixtures được định nghĩa trong `conftest.py`:

- `sample_aggregated_data`: Sample data đầy đủ cho testing
- `sample_ai_analysis`: Sample AI analysis text
- `confidence_service`: ConfidenceService instance

## Lưu ý

1. **Database Tests**: Một số tests cần database connection. Có thể:
   - Mock database calls
   - Dùng test database
   - Skip tests nếu không có DB

2. **API Tests**: Cần mock hoặc test database để chạy API tests

3. **Async Tests**: Sử dụng `pytest-asyncio` cho async tests

## Kết quả mong đợi

Tất cả tests phải pass để đảm bảo:
- Confidence scores được tính đúng
- Error handling hoạt động đúng
- API trả về đúng format
- Integration giữa các services hoạt động đúng

