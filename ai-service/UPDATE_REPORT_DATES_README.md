# Hướng dẫn cập nhật report_date trong daily_branch_metrics

## Mô tả
Script này dùng để dịch chuyển các ngày `report_date` trong bảng `daily_branch_metrics` cho nhiều chi nhánh.

### Chi nhánh 2:
- **Range ngày cũ**: 2025-02-08 đến 2025-11-19
- **Range ngày mới**: 2025-03-22 đến 2025-12-31
- **Số ngày dịch chuyển**: +42 ngày

### Chi nhánh 10:
- **Range ngày cũ**: 2023-09-30 đến 2025-12-13
- **Range ngày mới**: 2023-10-18 đến 2025-12-31
- **Số ngày dịch chuyển**: +18 ngày

## Cách sử dụng

### 1. Chạy ở chế độ dry-run (xem trước, không cập nhật)

**Chi nhánh 2:**
```bash
cd ai-service
python update_report_dates.py --branch-id 2
```

**Chi nhánh 10:**
```bash
python update_report_dates.py --branch-id 10
```

### 2. Thực hiện cập nhật thực tế

**Chi nhánh 2:**
```bash
python update_report_dates.py --branch-id 2 --execute
```

**Chi nhánh 10:**
```bash
python update_report_dates.py --branch-id 10 --execute
```

### 3. Tùy chỉnh range (cho chi nhánh khác)

Nếu muốn cập nhật cho chi nhánh khác, cần chỉ định đầy đủ tham số:
```bash
python update_report_dates.py \
  --branch-id 5 \
  --start-date 2024-01-01 \
  --end-date 2024-12-31 \
  --new-end-date 2025-12-31 \
  --execute
```

## Lưu ý

⚠️ **QUAN TRỌNG**: 
- Mặc định script chạy ở chế độ **dry-run** (chỉ xem, không cập nhật)
- Phải thêm flag `--execute` để thực sự cập nhật database
- Script sẽ tự động commit transaction sau khi cập nhật thành công
- Nếu có lỗi, transaction sẽ được rollback

## Ví dụ output

### Dry-run mode (Chi nhánh 2):
```
2025-12-20 10:00:00 - INFO - Số ngày dịch chuyển: 42 ngày
2025-12-20 10:00:00 - INFO - Ngày cuối cũ: 2025-11-19 -> Ngày cuối mới: 2025-12-31
2025-12-20 10:00:00 - INFO - Tìm thấy 285 records cần cập nhật cho branch_id=2
2025-12-20 10:00:00 - INFO - === DRY RUN MODE ===
2025-12-20 10:00:00 - INFO - Chưa thực hiện cập nhật. Để thực hiện cập nhật, chạy với --execute
```

### Dry-run mode (Chi nhánh 10):
```
2025-12-20 10:00:00 - INFO - Số ngày dịch chuyển: 18 ngày
2025-12-20 10:00:00 - INFO - Ngày cuối cũ: 2025-12-13 -> Ngày cuối mới: 2025-12-31
2025-12-20 10:00:00 - INFO - Tìm thấy XXX records cần cập nhật cho branch_id=10
2025-12-20 10:00:00 - INFO - === DRY RUN MODE ===
2025-12-20 10:00:00 - INFO - Chưa thực hiện cập nhật. Để thực hiện cập nhật, chạy với --execute
```

### Execute mode:
```
2025-12-20 10:00:00 - INFO - Số ngày dịch chuyển: 18 ngày
2025-12-20 10:00:00 - INFO - Tìm thấy XXX records cần cập nhật cho branch_id=10
2025-12-20 10:00:00 - INFO - === BẮT ĐẦU CẬP NHẬT ===
2025-12-20 10:00:05 - INFO - Bước 1: Dịch chuyển tạm thời lên 10000 ngày...
2025-12-20 10:00:05 - INFO -   Đã dịch chuyển tạm thời XXX records
2025-12-20 10:00:05 - INFO - Bước 2: Dịch chuyển về giá trị cuối cùng (-9982 ngày)...
2025-12-20 10:00:10 - INFO - Đã cập nhật thành công XXX records!
2025-12-20 10:00:10 - INFO - === KẾT QUẢ SAU CẬP NHẬT ===
2025-12-20 10:00:10 - INFO - Số records trong range mới: XXX
2025-12-20 10:00:10 - INFO - Ngày nhỏ nhất: 2023-10-18
2025-12-20 10:00:10 - INFO - Ngày lớn nhất: 2025-12-31
```

## Yêu cầu

- Python 3.8+
- Các dependencies từ `requirements.txt` đã được cài đặt
- Database connection được cấu hình trong `.env` hoặc environment variables

