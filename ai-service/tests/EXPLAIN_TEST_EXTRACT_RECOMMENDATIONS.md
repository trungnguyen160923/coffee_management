# Giải Thích Test: `test_extract_recommendations.py`

## Mục tiêu file

Đây là bộ test nhỏ kiểm tra hàm private `AIAgentService._extract_recommendations`, đảm bảo hàm có thể bóc tách danh sách khuyến nghị từ phần “Khuyến nghị cụ thể” trong báo cáo AI, dù báo cáo dùng Markdown hay format đánh số.

Hàm `_extract_recommendations` được sử dụng trong quá trình xử lý AI để:
- Lấy danh sách khuyến nghị dạng text gọn gàng
- Lưu vào response/API/DB (để frontend hiển thị riêng)
- Đảm bảo Business Validation có dữ liệu chính xác

---

## Test 1: `test_extract_recommendations_with_markdown()`

```8:53:tests/test_extract_recommendations.py
def test_extract_recommendations_with_markdown():
    service = AIAgentService()
    analysis_text = \"\"\"### 1. Tóm tắt...\"\"\"
    recommendations = service._extract_recommendations(analysis_text)
    ...
```

### Kịch bản
- Sử dụng **analysis thực tế** trả về bởi AI (Format Markdown với các heading `###` và list `-`).
- Phần khuyến nghị có dạng:
  ```
  ### 5. Khuyến nghị cụ thể để cải thiện
  - **Tăng cường ...**
  - **Chiến dịch marketing ...**
  - ...
  ```

### Kiểm tra
1. In ra số lượng khuyến nghị tìm được (để debug nhanh khi chạy `pytest -s`).
2. `assert len(recommendations) >= 3`: phải trích được ít nhất 3 dòng.
3. Đảm bảo nội dung:
   - Có câu về khách hàng thân thiết
   - Có câu về marketing
   - Có câu về trải nghiệm khách hàng
   (bằng cách gộp text và tìm substring)

### Ý nghĩa
- Xác nhận `_extract_recommendations` xử lý được format Markdown giàu nội dung, giữ lại phần text quan trọng phía sau dấu `-`.
- Đảm bảo không bỏ sót khuyến nghị nào trong response thực tế.

---

## Test 2: `test_extract_recommendations_with_numbered_format()`

```55:83:tests/test_extract_recommendations.py
def test_extract_recommendations_with_numbered_format():
    service = AIAgentService()
    analysis_text = \"\"\"1. Tóm tắt...\"\"\"
    recommendations = service._extract_recommendations(analysis_text)
```

### Kịch bản
- Analysis dạng **đánh số** (1., 2., 3., 4., 5.) thay vì Markdown `###`.
- Phần khuyến nghị:
  ```
  5. Khuyến nghị cụ thể để cải thiện
  - Tăng cường quản lý chất lượng sản phẩm
  - ...
  ```

### Kiểm tra
1. `assert len(recommendations) >= 3`: phải lấy được đầy đủ list.
2. Kiểm tra nội dung có chứa các cụm từ chính (“quản lý chất lượng”, “xu hướng khách hàng”).

### Ý nghĩa
- Đảm bảo `_extract_recommendations` linh hoạt, không phụ thuộc vào định dạng heading Markdown.
- Hữu ích vì nhiều model hoặc prompt khác nhau có thể trả về format “1. ... 2. ...” thay vì `###`.

---

## Cách chạy test

```bash
pytest tests/test_extract_recommendations.py -v -s
```

- Tùy chọn `-s` để xem output in ra list khuyến nghị → dễ debug prompt/regex nếu hàm không bắt được.

---

## Tóm tắt

- Test dùng hai dạng analysis_text (Markdown + numbered) để chắc chắn `_extract_recommendations` xử lý được các biến thể phổ biến.
- Kiểm tra cả số lượng lẫn nội dung khuyến nghị, giúp đảm bảo output đủ phong phú để hiển thị cho người dùng cuối và phục vụ các bước kiểm định sau (Business Validation).

