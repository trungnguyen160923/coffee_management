# Script Tạo Tài Liệu Database

Script này tự động tạo file Word mô tả các bảng trong `auth_db` và `profile_db`.

## Yêu cầu

- Python 3.6+
- Thư viện `python-docx`

## Cài đặt

```bash
pip install -r scripts/requirements_db_doc.txt
```

Hoặc:

```bash
pip install python-docx
```

## Sử dụng

Chạy script từ thư mục gốc của project:

```bash
python scripts/generate_db_documentation.py
```

Hoặc trên Windows:

```bash
python scripts\generate_db_documentation.py
```

## Kết quả

File Word sẽ được tạo tại: `docs/database_documentation.docx`

File này bao gồm:
- Danh sách tất cả các bảng trong `auth_db`
- Danh sách tất cả các bảng trong `profile_db`
- Với mỗi bảng:
  - Tên bảng
  - Danh sách các cột (tên, kiểu dữ liệu, ràng buộc)
  - Khóa chính (Primary Keys)
  - Khóa ngoại (Foreign Keys)
  - Chỉ mục (Indexes)

## Cấu trúc

Script sẽ đọc các file SQL từ:
- `sql/auth_db.sql`
- `sql/profile_db.sql`

Và tạo file Word tại:
- `docs/database_documentation.docx`

