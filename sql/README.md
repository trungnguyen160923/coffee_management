# Database Setup Guide

Thư mục này chứa các file SQL để khởi tạo databases cho hệ thống.

## 📁 Các file SQL

- `auth_db.sql` - Database cho authentication service
- `profile_db.sql` - Database cho profile service (staff, customer, manager profiles)
- `order_db.sql` - Database cho order service (orders, reservations, branches)
- `catalog_db.sql` - Database cho catalog service (products, ingredients, recipes, stocks)
- `notification_db.sql` - Database cho notification service
- `analytics_db.sql` - Database cho analytics (optional)
- `seed_data.sql` - **Dữ liệu mẫu** (admin, managers, branches, products, ingredients, etc.) - Chạy sau khi đã import các file trên

---

## 🚀 Cách cài đặt

### Cách 1: Sử dụng script tự động (Khuyến nghị)

#### Trên Linux/Mac:

```bash
# Đảm bảo MySQL container đang chạy
docker compose -f docker-compose.prod.yml up -d mysql

# Set password
export MYSQL_ROOT_PASSWORD=your_password

# Chạy script
chmod +x scripts/init-databases.sh
./scripts/init-databases.sh
```

#### Trên Windows (PowerShell):

```powershell
# Đảm bảo MySQL container đang chạy
docker compose -f docker-compose.prod.yml up -d mysql

# Set password
$env:MYSQL_ROOT_PASSWORD = "your_password"

# Chạy script
.\scripts\init-databases.ps1
```

### Cách 2: Chạy thủ công từng file

```bash
# SSH vào VPS hoặc trên máy local
# Đảm bảo MySQL container đang chạy
docker compose -f docker-compose.prod.yml up -d mysql

# Chờ MySQL sẵn sàng (khoảng 30 giây)
sleep 30

# Import từng database
docker exec -i coffee-mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" < sql/auth_db.sql
docker exec -i coffee-mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" < sql/profile_db.sql
docker exec -i coffee-mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" < sql/order_db.sql
docker exec -i coffee-mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" < sql/catalog_db.sql
docker exec -i coffee-mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" < sql/notification_db.sql

# Optional: analytics_db
docker exec -i coffee-mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" < sql/analytics_db.sql

# Import dữ liệu mẫu (sau khi đã import tất cả databases)
docker exec -i coffee-mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" < sql/seed_data.sql
```

---

## 📋 Quy trình trong Deployment

### Lần đầu deploy (Fresh install)

1. **Start MySQL container:**
   ```bash
   docker compose -f docker-compose.prod.yml up -d mysql
   ```

2. **Chờ MySQL sẵn sàng:**
   ```bash
   # Kiểm tra health
   docker compose -f docker-compose.prod.yml ps mysql
   ```

3. **Initialize databases:**
   ```bash
   export MYSQL_ROOT_PASSWORD=your_password
   ./scripts/init-databases.sh
   ```

4. **Import dữ liệu mẫu (tùy chọn, khuyến nghị cho development):**
   ```bash
   docker exec -i coffee-mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" < sql/seed_data.sql
   ```

5. **Start all services:**
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

### Deploy lại (Database đã có)

- **Không cần** chạy lại SQL files
- Databases đã tồn tại, chỉ cần:
  - Pull images mới
  - Restart containers
  - Chạy migrations nếu có (dùng `scripts/run-migration.sh`)

---

## ⚠️ Lưu ý quan trọng

### 1. Thứ tự import

Script `init-databases.sh` sẽ import theo thứ tự:
1. `auth_db.sql` - Phải import trước (có bảng roles, users)
2. `profile_db.sql` - Phụ thuộc vào auth_db
3. `order_db.sql` - Độc lập
4. `catalog_db.sql` - Độc lập
5. `notification_db.sql` - Độc lập

### 2. Database đã tồn tại

- Script sẽ hỏi có muốn DROP và recreate không
- **Cẩn thận**: DROP sẽ xóa toàn bộ dữ liệu!
- Nếu database đã có dữ liệu, chỉ chạy migrations thay vì recreate

### 3. Timezone

- Tất cả databases đã được cấu hình timezone Việt Nam (UTC+7)
- MySQL server cũng đã được cấu hình trong `mysql-conf/my.cnf`

### 4. Character Set

- Tất cả databases dùng `utf8mb4` và `utf8mb4_unicode_ci`
- Hỗ trợ đầy đủ tiếng Việt và emoji

---

## 🌱 Seed Data (Dữ liệu mẫu)

File `seed_data.sql` chứa dữ liệu mẫu để test hệ thống, bao gồm:

### Nội dung seed data:
- ✅ **1 Admin account**: `admin@coffee.com` / `admin123`
- ✅ **2 Manager accounts**: `manager1@coffee.com`, `manager2@coffee.com` / `admin123`
- ✅ **2 Branches** với manager tương ứng và bàn mẫu
- ✅ **5 Categories**: Coffee, Tea, Snacks, Desserts, Beverages
- ✅ **4 Sizes**: S, M, L, XL
- ✅ **4 Suppliers** với thông tin liên hệ
- ✅ **20 Ingredients** (cà phê, sữa, đường, trà, siro, etc.)
- ✅ **12 Products** với product details (giá theo size)
- ✅ **4 Recipes** với recipe items (công thức chi tiết)
- ✅ **Stock** cho cả 2 branches

### Cách chạy seed data:

```bash
# Đảm bảo đã import tất cả databases trước
# Sau đó chạy:
docker exec -i coffee-mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" < sql/seed_data.sql
```

### Lưu ý:
- ⚠️ Seed data sẽ **INSERT** dữ liệu, nếu đã có dữ liệu trùng có thể bị lỗi
- ✅ File sử dụng `ON DUPLICATE KEY UPDATE` để tránh lỗi khi chạy lại
- ✅ Có thể chạy lại nhiều lần an toàn
- ✅ Chỉ nên chạy trong môi trường **development/testing**

### Thông tin đăng nhập mẫu:
- **Admin**: `admin@coffee.com` / `admin123`
- **Manager 1** (Branch 1): `manager1@coffee.com` / `admin123`
- **Manager 2** (Branch 2): `manager2@coffee.com` / `admin123`

---

## 🔄 Migrations

Sau khi databases đã được khởi tạo, nếu có thay đổi schema:

### Chạy migration:

```bash
# Ví dụ: Migration cho profile_db
./scripts/run-migration.sh \
  profile-service/migrations/remove_role_id_from_shift_assignments.sql \
  profile_db
```

**Lưu ý**: 
- Migration files nằm trong thư mục `profile-service/migrations/`
- Script sẽ tự động backup trước khi chạy migration

---

## 🧪 Kiểm tra sau khi import

```bash
# Kiểm tra databases đã được tạo
docker exec coffee-mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "SHOW DATABASES;"

# Kiểm tra tables trong một database
docker exec coffee-mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "USE auth_db; SHOW TABLES;"

# Kiểm tra số lượng records
docker exec coffee-mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "USE auth_db; SELECT COUNT(*) FROM users;"
```

---

## 🐛 Troubleshooting

### Vấn đề: MySQL container chưa sẵn sàng

**Lỗi**: `MySQL is not ready after 30 attempts`

**Giải pháp**:
```bash
# Kiểm tra container
docker ps | grep coffee-mysql

# Kiểm tra logs
docker compose -f docker-compose.prod.yml logs mysql

# Đợi thêm và thử lại
sleep 60
./scripts/init-databases.sh
```

### Vấn đề: Permission denied

**Lỗi**: `Permission denied` khi chạy script

**Giải pháp**:
```bash
chmod +x scripts/init-databases.sh
```

### Vấn đề: SQL file không tìm thấy

**Lỗi**: `SQL file not found`

**Giải pháp**:
```bash
# Kiểm tra file có tồn tại không
ls -la sql/

# Đảm bảo đang ở đúng thư mục
cd /opt/coffee-management
```

### Vấn đề: Import bị lỗi

**Lỗi**: Syntax error hoặc constraint violation

**Giải pháp**:
1. Kiểm tra MySQL logs: `docker compose logs mysql`
2. Kiểm tra SQL file có lỗi syntax không
3. Đảm bảo MySQL version tương thích (MySQL 8.0)

---

## 📚 Tài liệu tham khảo

- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Docker MySQL Image](https://hub.docker.com/_/mysql)

---

**Ngày tạo**: 2024-01-15
**Phiên bản**: 1.0

