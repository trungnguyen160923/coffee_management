# Giải Thích Test: `test_business_validation_integration.py`

## 🎯 Mục đích tổng quan

File này chứa **integration tests** để kiểm tra Business Validation (UAT scorer) đã được tích hợp trọn vẹn vào `AIAgentService`. Mục tiêu:
- Thu thập dữ liệu thực (hoặc mock) qua `collect_three_json_data` / `collect_all_branches_data`
- Chạy AI (`process_with_ai`, `process_all_branches_with_ai`) – tự động kèm Business Validation
- In ra log chi tiết, đảm bảo response chứa kết quả UAT với điểm số/rating hợp lệ

> ⚠️ Tests yêu cầu LLM đã được cấu hình (`service.llm`). Nếu không có, mỗi test sẽ `pytest.skip(...)` để tránh lỗi.

---

## Test 1: `test_business_validation_integration_single_branch`

### Flow từng bước

1. **Khởi tạo service**
   ```python
   service = AIAgentService()
   if not service.llm:
       pytest.skip(...)
   ```
   - Đảm bảo service dùng cùng logic như production (thu thập data, gọi AI, chạy Business Validation).

2. **Thiết lập branch/date & in banner**
   - `branch_id = 1`, `target_date = date.today()`
   - In thông tin test để dễ theo dõi log khi chạy `pytest -s`.

3. **Collect data**
   ```python
   aggregated_data = await service.collect_three_json_data(branch_id, target_date)
   ```
   - Gọi luồng thu thập dữ liệu thực (6 API + 2 ML models).
   - Sau khi collect, test in ra `data_quality_score` & `ml_confidence_score`.

4. **Process with AI (kích hoạt Business Validation)**
   ```python
   ai_result = await service.process_with_ai(aggregated_data=aggregated_data)
   ```
   - Hàm này sẽ:
     - Gọi LLM tạo báo cáo
     - Tính `ai_quality_score`, `overall_confidence`
     - **Quan trọng**: tự động chạy Business Validation scorer và nhúng vào `ai_result["business_validation"]`

5. **Assertions chính**
   ```python
   assert ai_result.get("success") is True
   assert "analysis" in ai_result
   ```

6. **Kiểm tra business validation**
   ```python
   business_validation = ai_result.get("business_validation")
   ```
   - Nếu có dữ liệu:
     - In điểm tổng, rating, recommendation, từng category score
     - Assert:
       ```python
       assert 0.0 <= overall_score <= 1.0
       assert rating in ["XUẤT SẮC", "TỐT", "KHÁ", "TRUNG BÌNH", "YẾU"]
       ```
   - Nếu thiếu:
     - In cảnh báo để dev kiểm tra log (có thể scorer chưa được enable hoặc gặp lỗi).

7. **Kết thúc**
   - In thông báo thành công.
   - Bắt exception để hiển thị lỗi nếu có.

### Khi nào nên chạy?
```bash
pytest tests/test_business_validation_integration.py::test_business_validation_integration_single_branch -v -s
```
- Dùng khi muốn xem log chi tiết Business Validation cho **một chi nhánh cụ thể**.
- Hữu ích ở môi trường staging hoặc local khi đã cấu hình đủ dependencies (LLM, DB, services).

---

## Test 2: `test_business_validation_integration_all_branches`

### Mục đích
- Tương tự test đầu, nhưng cho **toàn bộ chi nhánh** (quy mô lớn hơn).
- Dùng chức năng `collect_all_branches_data` và `process_all_branches_with_ai`.

### Flow rút gọn

1. **Setup service + skip nếu thiếu LLM**
2. **In banner (ALL BRANCHES)**
3. **Collect data cho tất cả chi nhánh**
   ```python
   aggregated_data = await service.collect_all_branches_data(target_date)
   ```
4. **Process with AI (multi-branch)**
   ```python
   ai_result = await service.process_all_branches_with_ai(aggregated_data=aggregated_data)
   ```
5. **Assertions**
   ```python
   assert ai_result.get("success") is True
   assert "analysis" in ai_result
   ```
6. **Kiểm tra business validation**
   - Nếu có, in tổng điểm & rating chung.
   - Nếu không, in cảnh báo (cần kiểm tra log/scorer).

### Khi nào nên chạy?
```bash
pytest tests/test_business_validation_integration.py::test_business_validation_integration_all_branches -v -s
```
- Dùng để kiểm tra Business Validation trong **báo cáo tổng hợp** (ví dụ dashboard cho admin).
- Thường mất thời gian hơn vì phải thu thập dữ liệu cho mọi chi nhánh.

---

## Những điểm cần ghi nhớ

- **Yêu cầu LLM**: Vì tests dùng `AIAgentService` thật, phải cấu hình LLM (`service.llm`). Nếu không, tests sẽ skip.
- **Phụ thuộc external services**: `collect_three_json_data` và `collect_all_branches_data` gọi order-service & catalog-service thật (hoặc mock nếu đã cấu hình). Nên chạy ở môi trường đã đầy đủ backend services hoặc chuẩn bị mocks tương ứng.
- **Mục đích chính**: Không phải assert logic chi tiết, mà để quan sát log, xác nhận Business Validation đã trigger và trả về dữ liệu hợp lệ.
- **Logging đậm đặc**: Các `print` và log giúp QA/dev xem:
  - Điểm tổng (overall score)
  - Rating (XUẤT SẮC/TỐT/…)
  - Khuyến nghị gợi ý
  - Điểm từng category, qua đó biết điểm nào thấp.

---

## TL;DR

- `test_business_validation_integration_single_branch`
  - Flow: Collect data → Process AI → Business Validation → In log chi tiết
  - Assertions: `success == True`, có `analysis`, `business_validation` hợp lệ (khi có)
  - Dùng để debug/tuning cho **1 chi nhánh**

- `test_business_validation_integration_all_branches`
  - Flow tương tự nhưng mở rộng cho **tất cả chi nhánh**
  - Đảm bảo business validation chạy được ở quy mô lớn

Chạy các test với `-s` để thấy log:
```bash
pytest tests/test_business_validation_integration.py -v -s --log-cli-level=INFO
```
Khi pass, bạn sẽ thấy log Business Validation đầy đủ (điểm, rating, categories) ngay trên console.

