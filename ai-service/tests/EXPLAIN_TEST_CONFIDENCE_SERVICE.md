# Giải Thích Test: `test_confidence_service.py`

## Mục tiêu tổng quan

File này chứa toàn bộ **unit tests** cho `ConfidenceService`, đảm bảo các hàm tính điểm tin cậy hoạt động đúng trong mọi tình huống:

1. `calculate_data_quality_score`
2. `calculate_ml_confidence_score`
3. `calculate_ai_quality_score`
4. `calculate_overall_confidence`
5. `calculate_historical_accuracy_score`

Mỗi nhóm test tập trung vào một hàm, kiểm tra đầy đủ các kịch bản: dữ liệu đủ/thiếu, lỗi API, ML có/không, analysis đúng/sai, mức confidence cao/trung bình/thấp, xử lý default, v.v.

---

## 1. `TestDataQualityScore`

```18:144:tests/test_confidence_service.py
class TestDataQualityScore:
    def test_full_data_high_score(...):
    def test_missing_data_low_score(...):
    def test_partial_data_medium_score(...):
    def test_old_data_lower_freshness(...):
    def test_api_error_handling(...):
```

### Hàm kiểm tra
`calculate_data_quality_score(aggregated_data, target_date)`

### Các kịch bản
- **Đủ dữ liệu → điểm cao**  
  -> cung cấp cả 6 nhóm metrics + 2 ML → score >= 0.7.
- **Thiếu hết dữ liệu → điểm thấp**  
  -> các dict trống → score < 0.5.
- **Có một phần dữ liệu → score trung bình**  
  -> chỉ có revenue/customer → score khoảng 0.3–0.7.
- **Dữ liệu cũ (target_date lùi 5 ngày)**  
  -> _freshness_ giảm, score thấp hơn.
- **Có error trong response**  
  -> ví dụ `{"error": "API failed"}` → score giảm nhưng hàm không crash.

=> Đảm bảo hàm tính 3 thành phần (API success, completeness, freshness) chính xác và resilient.

---

## 2. `TestMLConfidenceScore`

```146:229:tests/test_confidence_service.py
class TestMLConfidenceScore:
    def test_both_ml_sources_available(...):
    def test_only_isolation_forest(...):
    def test_only_prophet_forecast(...):
    def test_no_ml_data_default(...):
    def test_confidence_string_format(...):
```

### Hàm kiểm tra
`calculate_ml_confidence_score(aggregated_data)`

### Các kịch bản
- **Có cả Isolation Forest & Prophet** → score cao (>=0.7).
- **Chỉ có 1 nguồn ML** → vẫn tính được score > 0.
- **Không có dữ liệu ML** → trả về default 0.5.
- **`confidence` là string “85%”** → parser convertir sang 0-1.

=> Đảm bảo hàm trích confidence từ nhiều format, kết hợp 2 mô hình ML, fallback đúng.

---

## 3. `TestAIQualityScore`

```232:361:tests/test_confidence_service.py
class TestAIQualityScore:
    def test_accurate_analysis_high_score(...):
    def test_inaccurate_analysis_low_score(...):
    def test_missing_anomalies_low_coverage(...):
    def test_empty_analysis(...):
```

### Hàm kiểm tra
`calculate_ai_quality_score(analysis_text, aggregated_data)`

### Các kịch bản
- **Analysis chính xác, đầy đủ** → score cao (≥0.3 trong test, thực tế có thể cao hơn).
- **Analysis sai số liệu** → score thấp do fact accuracy thấp.
- **Bỏ sót anomalies** → coverage thấp.
- **Analysis rỗng** → score ≤ 0.5 (default hoặc 0).

=> Đảm bảo các thành phần metrics coverage / anomalies coverage / fact accuracy / logic consistency hoạt động.

---

## 4. `TestOverallConfidence`

```363:458:tests/test_confidence_service.py
class TestOverallConfidence:
    def test_high_confidence_all_scores_high(...):
    def test_medium_confidence_mixed_scores(...):
    def test_low_confidence_low_scores(...):
    def test_warnings_generation(...):
    def test_breakdown_structure(...):
    def test_default_historical_accuracy(...):
```

### Hàm kiểm tra
`calculate_overall_confidence(data_quality_score, ml_confidence_score, ai_quality_score, historical_accuracy_score)`

### Các kịch bản
- **Tất cả scores cao** → overall >=0.8, level = “HIGH”.
- **Scores trung bình** → overall ~0.6-0.75, level = “MEDIUM”.
- **Scores thấp** → overall <0.6, level = “LOW”, có warnings.
- **Warnings generation** → confirm khi score thấp, warnings chứa loại `data_quality`.
- **Breakdown structure** → `result["breakdown"]` có đủ 4 key và đúng giá trị.
- **Historical accuracy None** → dùng default 0.75.

=> Đảm bảo hàm tổng hợp 4 scores thành overall + breakdown + warnings + level chuẩn.

---

## 5. `TestHistoricalAccuracyScore`

```460:497:tests/test_confidence_service.py
class TestHistoricalAccuracyScore:
    def test_historical_accuracy_with_branch_id(...):
    def test_historical_accuracy_no_data_default(...):
```

### Hàm kiểm tra
`calculate_historical_accuracy_score(branch_id, aggregated_data)`

### Kịch bản
- **Có branch_id hợp lệ** → hàm cố lấy dữ liệu từ DB (hoặc return default nếu không có). Test xác nhận không crash và trả về 0–1.
- **Branch không có dữ liệu** → trả về default 0.75.

=> Đảm bảo hàm kết nối DB (hoặc fallback) đúng cách.

---

## Cách chạy

```bash
pytest tests/test_confidence_service.py -v
```

Nếu chỉ muốn test một nhóm:

```bash
pytest tests/test_confidence_service.py::TestDataQualityScore::test_full_data_high_score -v
```

---

## Tổng kết

- File này kiểm tra tất cả điểm số thành phần của hệ thống Confidence Scoring.
- Mỗi test đảm bảo hàm xử lý đủ & thiếu dữ liệu, xử lý lỗi, tính toán chính xác, và trả về output giàu thông tin (`overall`, `level`, `warnings`, `breakdown`).
- Kết hợp với các integration tests khác giúp đảm bảo toàn bộ pipeline confidence hoạt động chuẩn trước khi đưa vào production.

