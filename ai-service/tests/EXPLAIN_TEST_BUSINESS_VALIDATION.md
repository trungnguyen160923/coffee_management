# Giải Thích Test: `test_business_validation.py`

## 🎯 Mục đích file

Đây là bộ **Business Validation Tests (UAT)** nhằm trả lời câu hỏi: *“Báo cáo AI có chính xác, đầy đủ và hữu ích cho nhà quản lý hay không?”*

- Định nghĩa một `BusinessValidationScorer` với checklist 5 tiêu chí (Accuracy, Completeness, Actionability, Clarity, Business Relevance).
- Cung cấp hàng loạt hàm chấm điểm chi tiết cho từng câu hỏi.
- Viết test đảm bảo score hoạt động đúng, có đủ coverage và trả về kết quả hợp lệ.
- Có test tích hợp nhỏ dùng `AIAgentService` để tạo báo cáo thật (mock LLM), sau đó chạy scorer.

> Đây là nền tảng để Business Validation hoạt động trong production (được gọi sau khi AI tạo báo cáo).

---

## Cấu trúc chính của file

1. `BusinessValidationScorer`
   - `evaluation_questions`: checklist 5 category với trọng số và các câu hỏi.
   - `evaluate_report()`: hàm chính tính điểm tổng và rating.
   - ~20 hàm `_score_*` để chấm từng câu hỏi (regex check, keyword check, so sánh data…)
2. `TestBusinessValidation`
   - `test_single_branch_report_validation`: test end-to-end với `AIAgentService`.
   - `test_evaluation_questions_coverage`: đảm bảo tất cả câu hỏi có hàm scoring.
   - `test_scorer_with_sample_data`: chạy scorer với dữ liệu mẫu đơn giản.

---

## Phần 1: `BusinessValidationScorer`

### Checklist 5 tiêu chí (Categories)

| Category | Tên | Trọng số | Câu hỏi chính |
|---|---|---|---|
| `factual_accuracy` | Độ chính xác dữ liệu | 25% | Số liệu có khớp? Có nhắc chỉ số quan trọng? Phân tích dựa data? |
| `completeness` | Độ đầy đủ thông tin | 20% | Có đủ phần (overview, strengths/weakness, forecast…)? Có nhắc anomalies? Đủ khía cạnh (doanh thu, khách hàng…)? |
| `actionability` | Tính khả thi | 20% | Khuyến nghị cụ thể không? ≥ 3 khuyến nghị? Có liên kết với vấn đề? |
| `clarity` | Độ rõ ràng | 15% | Có cấu trúc, ngôn ngữ dễ hiểu? Tránh thuật ngữ ML không? |
| `business_relevance` | Liên quan nghiệp vụ | 20% | Có insight hữu ích? Forecast có timeframe & số liệu? Xác định ưu tiên? |

Mỗi câu hỏi gắn với một hàm `_score_*` chuyên biệt. Hàm nhận `analysis_text`, `summary`, `recommendations`, `raw_data` để chấm điểm 0–1 và trả về `details`.

### `evaluate_report()`

Quy trình:
1. Lấy `analysis`, `summary`, `recommendations` từ `ai_report`.
2. Duyệt từng category → gọi hết các câu hỏi → tính điểm trung bình → nhân trọng số.
3. Tổng hợp điểm, normalize về 0–1, lưu chi tiết trong `evaluation_results`.
4. Gán rating & recommendation theo thang:
   - ≥0.8: `XUẤT SẮC`
   - 0.7–0.79: `TỐT`
   - 0.6–0.69: `KHÁ`
   - 0.5–0.59: `TRUNG BÌNH`
   - <0.5: `YẾU`

### Ví dụ hàm scoring tiêu biểu

- `_score_factual_accuracy`: so khớp số liệu trong analysis với `raw_data` (doanh thu, đơn hàng…); dùng regex tìm các định dạng (1,000,000 VNĐ, 1 triệu, …).
- `_score_sections_completeness`: kiểm tra text có chứa các từ khóa “tổng quan”, “điểm mạnh”, “dự đoán”, “khuyến nghị”… hay không.
- `_score_recommendations_actionability`: xem mỗi recommendation có từ khóa hành động và chi tiết cụ thể không.
- `_score_forecast_usefulness`: xem AI có nói rõ dự đoán, kèm số liệu và thời gian không.

Những hàm này mô phỏng checklist UAT của đội business.

---

## Phần 2: `TestBusinessValidation`

### `setup_method`
```python
def setup_method(self):
    self.scorer = BusinessValidationScorer()
    self.ai_service = AIAgentService()
    self.today = date.today()
```
- Chuẩn bị scorer + service để dùng trong test.

### 1. `test_single_branch_report_validation`

**Mục tiêu:** chạy `AIAgentService.process_with_ai()` với dữ liệu mock để tạo báo cáo thật, sau đó dùng `BusinessValidationScorer` chấm điểm.

Các bước:
1. Skip nếu không có LLM (`self.ai_service.llm`).
2. Tạo `aggregated_data` mock (đủ metrics, anomalies, forecast…).
3. Mock LLM bằng `unittest.mock` để trả về analysis text cố định.
4. Gọi `process_with_ai()` → nhận `ai_result`.
5. Assert `ai_result.success == True`, có `analysis`.
6. Gọi `evaluation = self.scorer.evaluate_report(ai_result, aggregated_data)`.
7. Assert evaluation có `overall_score`, `categories`, `rating`, vv.
8. In log chi tiết (điểm từng category/câu hỏi) – hữu ích khi chạy `pytest -s`.
9. Đảm bảo điểm nằm trong [0,1].

Ý nghĩa: đảm bảo integration giữa AI report và scorer hoạt động tốt, scorer không bị crash và trả về kết quả hợp lệ.

### 2. `test_evaluation_questions_coverage`

**Mục tiêu:** đảm bảo mọi câu hỏi trong checklist đều có hàm scoring hợp lệ.

Logic:
```python
for category in scorer.evaluation_questions.values():
    for question in category["questions"]:
        assert callable(question["scoring"])
        assert question["scoring"].__name__.startswith("_score_")
```

Giúp tránh việc thêm câu hỏi mới mà quên viết hàm `_score_*`.

### 3. `test_scorer_with_sample_data`

**Mục tiêu:** chạy scorer với bộ sample nhỏ (không cần AI service) để đảm bảo output cấu trúc đúng.

Flow:
1. Tạo `ai_report` sample (analysis có 5 mục, recommendations 3 dòng).
2. Tạo `raw_data` sample.
3. Gọi `scorer.evaluate_report(ai_report, raw_data)`.
4. Assert có `overall_score`, `categories`, `rating`, `recommendation`.
5. Đảm bảo có đủ 5 categories và điểm trong [0,1].

---

## Khi nào nên chạy các test này?

- Trong pipeline CI/CD: đảm bảo bất kỳ thay đổi nào ở scorer hoặc AI report vẫn giữ chuẩn UAT.
- Khi cập nhật checklist hoặc trọng số: chạy lại để đảm bảo logic không bị break.
- Khi debug Business Validation: dùng test để xem score chi tiết (không cần chạy full API).

### Lệnh chạy
```bash
# Chạy riêng file
pytest tests/test_business_validation.py -v -s

# Chạy riêng test integration với AI service
pytest tests/test_business_validation.py::TestBusinessValidation::test_single_branch_report_validation -v -s
```

---

## Tổng kết

- `BusinessValidationScorer` = trái tim của UAT scoring, gồm checklist 5 tiêu chí, mỗi tiêu chí có nhiều câu hỏi + hàm đánh giá cụ thể.
- `TestBusinessValidation` đảm bảo:
  1. Scorer hoạt động với AI report thật (mock LLM).
  2. Checklist không bị thiếu hàm scoring.
  3. Scorer trả về cấu trúc chuẩn với sample data.

Nhờ đó, hệ thống có thể tự động đánh giá chất lượng báo cáo AI trước khi gửi cho nhà quản lý, đảm bảo **chính xác – đầy đủ – hữu ích** như kỳ vọng nghiệp vụ.

