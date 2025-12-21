# Danh Sách Tất Cả Các Chức Năng Theo Vai Trò

## 📋 Tổng Quan

Dự án **N.S Coffee Management System** hỗ trợ 4 vai trò chính:
- **CUSTOMER** (Khách hàng) - Sử dụng web-app
- **ADMIN** (Chủ sở hữu) - Sử dụng fe_coffee_manager
- **MANAGER** (Quản lý chi nhánh) - Sử dụng fe_coffee_manager
- **STAFF** (Nhân viên) - Sử dụng fe_coffee_manager

---

## 👤 CUSTOMER (Khách hàng)

### Trang Công Khai (Không cần đăng nhập)
1. **Trang Chủ** (`/coffee`)
   - Xem thông tin về quán cà phê
   - Tìm chi nhánh gần nhất

2. **Menu** (`/coffee/menu`)
   - Xem danh sách sản phẩm
   - Lọc theo danh mục
   - Tìm kiếm sản phẩm

3. **Chi Tiết Sản Phẩm** (`/coffee/products/:id`)
   - Xem thông tin chi tiết sản phẩm
   - Chọn size, số lượng
   - Thêm vào giỏ hàng

4. **Dịch Vụ** (`/coffee/services`)
   - Xem các dịch vụ của quán

5. **Giới Thiệu** (`/coffee/about`)
   - Thông tin về quán cà phê

6. **Liên Hệ** (`/coffee/contact`)
   - Thông tin liên hệ

7. **Theo Dõi Đơn Hàng** (`/track-order/:orderId`)
   - Theo dõi trạng thái đơn hàng (công khai)

8. **Theo Dõi Đặt Bàn** (`/track-reservation/:reservationId`)
   - Theo dõi trạng thái đặt bàn (công khai)

### Xác Thực (Authentication)
9. **Đăng Nhập** (`/auth/login`)
   - Đăng nhập vào tài khoản

10. **Đăng Ký** (`/auth/register`)
    - Tạo tài khoản mới

11. **Quên Mật Khẩu** (`/auth/forgot-password`)
    - Khôi phục mật khẩu

### Giỏ Hàng & Thanh Toán
12. **Giỏ Hàng** (`/coffee/cart`)
    - Xem giỏ hàng (khách và đã đăng nhập)
    - Chỉnh sửa số lượng
    - Xóa sản phẩm

13. **Thanh Toán (Khách)** (`/coffee/guest-checkout`)
    - Thanh toán không cần đăng nhập

14. **Thanh Toán (Đã đăng nhập)** (`/coffee/checkout`)
    - Thanh toán với tài khoản
    - Chọn địa chỉ giao hàng
    - Áp dụng mã giảm giá

### Dashboard Khách Hàng (Yêu cầu đăng nhập)
15. **Đơn Hàng Của Tôi** (`/users/orders`)
    - Xem lịch sử đơn hàng
    - Xem chi tiết đơn hàng
    - Hủy đơn hàng (nếu được phép)

16. **Đặt Bàn Của Tôi** (`/users/bookings`)
    - Xem lịch sử đặt bàn
    - Xem chi tiết đặt bàn
    - Hủy đặt bàn (nếu được phép)

17. **Quản Lý Địa Chỉ** (`/users/addresses`)
    - Xem danh sách địa chỉ
    - Thêm địa chỉ mới
    - Chỉnh sửa địa chỉ
    - Xóa địa chỉ
    - Đặt địa chỉ mặc định

18. **Cài Đặt Tài Khoản** (`/users/account`)
    - Xem thông tin cá nhân (fullname, email, phone, ngày sinh, bio)
    - Chỉnh sửa: fullname, phone, ngày sinh, bio
    - Email không thể chỉnh sửa (liên hệ hỗ trợ)
    - Đổi mật khẩu

---

## 👑 ADMIN (Chủ sở hữu)

### Dashboard & Tổng Quan
1. **Dashboard** (`/admin`)
   - Tổng quan hệ thống
   - Thống kê toàn hệ thống
   - Xem hoạt động các chi nhánh

### Quản Lý Catalog
2. **Quản Lý Sản Phẩm** (`/admin/products`)
   - CRUD sản phẩm
   - Quản lý danh mục sản phẩm
   - Quản lý size, giá

3. **Quản Lý Nguyên Liệu** (`/admin/ingredients`)
   - CRUD nguyên liệu
   - Quản lý đơn vị tính
   - Quản lý giá nguyên liệu

4. **Quản Lý Công Thức** (`/admin/recipes`)
   - CRUD công thức pha chế
   - Liên kết sản phẩm với nguyên liệu
   - Quản lý định lượng

5. **Quản Lý Giảm Giá** (`/admin/discounts`)
   - Tạo và quản lý mã giảm giá
   - Áp dụng cho toàn hệ thống

### Quản Lý Tổ Chức
6. **Quản Lý Chi Nhánh** (`/admin/branches`)
   - CRUD chi nhánh
   - Quản lý thông tin chi nhánh
   - Xem hoạt động chi nhánh

7. **Quản Lý Quản Lý** (`/admin/managers`)
   - CRUD tài khoản quản lý
   - Phân công quản lý cho chi nhánh
   - Quản lý thông tin HR

8. **Hoạt Động Chi Nhánh** (`/admin/branch-activities`)
   - Xem hoạt động của tất cả chi nhánh
   - Theo dõi hiệu suất

### Quản Lý Nhà Cung Cấp
9. **Quản Lý Nhà Cung Cấp** (`/admin/suppliers`)
   - CRUD nhà cung cấp
   - Quản lý thông tin liên hệ

### Quản Lý Lương
10. **Quản Lý Lương** (`/admin/payroll`)
    - Xem và quản lý lương toàn hệ thống
    - Tính lương cho tất cả chi nhánh

11. **Mẫu Lương** (`/admin/payroll-templates`)
    - Quản lý mẫu lương hệ thống
    - Cấu hình phụ cấp, thưởng, phạt

12. **Báo Cáo Lương** (`/admin/payroll-reports`)
    - Xem báo cáo lương đa chi nhánh
    - Xuất Excel báo cáo
    - Thống kê lương theo nhiều tiêu chí

### Thống Kê & Phân Tích
13. **Thống Kê** (`/admin/statistics`)
    - Thống kê doanh thu toàn hệ thống
    - Phân tích theo chi nhánh
    - Báo cáo AI

### Cài Đặt
14. **Cài Đặt Tài Khoản** (`/admin/account`)
    - Xem và chỉnh sửa thông tin cá nhân
    - Đổi mật khẩu
    - Quản lý admin level, notes

---

## 🏢 MANAGER (Quản lý chi nhánh)

### Dashboard & Tổng Quan
1. **Dashboard** (`/manager`)
   - Tổng quan chi nhánh
   - Thống kê chi nhánh
   - Xem đơn hàng, đặt bàn trong ngày

### Quản Lý Nhân Sự
2. **Quản Lý Nhân Viên** (`/manager/staff`)
   - CRUD nhân viên
   - Phân công business roles (BARISTA, CASHIER, SERVER, SECURITY)
   - Quản lý thông tin HR nhân viên

3. **Quản Lý Ca Làm Việc** (`/manager/shifts`)
   - Xem lịch ca làm việc
   - Tạo ca làm việc
   - Chỉnh sửa ca làm việc

4. **Mẫu Ca Làm Việc** (`/manager/shift-templates`)
   - Tạo và quản lý mẫu ca
   - Định nghĩa yêu cầu roles cho từng ca

5. **Phân Công Ca** (`/manager/shift-assignments`)
   - Phân công nhân viên vào ca
   - Xem lịch phân công

6. **Yêu Cầu Ca** (`/manager/shift-requests`)
   - Xem yêu cầu ca từ nhân viên
   - Duyệt/từ chối yêu cầu

7. **Lịch Nhân Viên** (`/manager/staff-schedule`)
   - Xem lịch làm việc của tất cả nhân viên
   - Quản lý lịch tổng thể

8. **Đóng Cửa Chi Nhánh** (`/manager/branch-closures`)
   - Đăng ký ngày đóng cửa
   - Quản lý lịch nghỉ

### Quản Lý Menu & Khuyến Mãi
9. **Quản Lý Sản Phẩm** (`/manager/products`)
   - Xem sản phẩm (chỉ đọc hoặc chỉnh sửa theo quyền)
   - Quản lý giá tại chi nhánh

10. **Quản Lý Nguyên Liệu** (`/manager/ingredients`)
    - Xem nguyên liệu
    - Quản lý tồn kho tại chi nhánh

11. **Quản Lý Giảm Giá** (`/manager/discounts`)
    - Tạo và quản lý mã giảm giá cho chi nhánh
    - Áp dụng mã giảm giá

### Quản Lý Bàn
12. **Quản Lý Bàn** (`/manager/tables`)
    - CRUD bàn
    - Quản lý trạng thái bàn
    - Xem bàn đang sử dụng

### Quản Lý Mua Hàng & Tồn Kho
13. **Mua Hàng Nguyên Liệu** (`/manager/procurement`)
    - Tạo yêu cầu mua hàng
    - Quản lý đơn mua hàng

14. **Đơn Mua Hàng** (`/manager/purchase-orders`)
    - Xem danh sách đơn mua hàng
    - Xác nhận đơn mua hàng
    - Theo dõi trạng thái

15. **Quản Lý Nhà Cung Cấp** (`/manager/suppliers`)
    - Xem danh sách nhà cung cấp
    - Liên hệ nhà cung cấp

16. **Tồn Kho** (`/manager/inventory`)
    - Xem tồn kho chi nhánh
    - Quản lý nhập/xuất kho

17. **Phiếu Nhập Kho** (`/manager/goods-receipts`)
    - Tạo phiếu nhập kho
    - Xác nhận nhập kho
    - Quản lý hàng nhập

18. **Trả Hàng** (`/manager/return-goods`)
    - Tạo phiếu trả hàng
    - Quản lý hàng trả về nhà cung cấp

### Quản Lý Lương
19. **Quản Lý Lương** (`/manager/payroll`)
    - Tính lương cho nhân viên chi nhánh
    - Xem và quản lý lương
    - Phê duyệt lương

20. **Thưởng & Phạt** (`/manager/bonus-penalty-allowance`)
    - Quản lý thưởng, phạt, phụ cấp
    - Thêm/sửa/xóa thưởng phạt
    - Xuất báo cáo

21. **Mẫu Lương** (`/manager/payroll-templates`)
    - Quản lý mẫu lương chi nhánh
    - Cấu hình phụ cấp, thưởng, phạt

### Thống Kê
22. **Thống Kê** (`/manager/statistics`)
    - Thống kê doanh thu chi nhánh
    - Phân tích hiệu suất
    - Báo cáo AI

### Cài Đặt
23. **Cài Đặt Tài Khoản** (`/manager/account`)
    - Xem và chỉnh sửa thông tin cá nhân
    - Đổi mật khẩu
    - Quản lý thông tin HR (identity card, hire date, salary, insurance, overtime rate, dependents)

---

## 👨‍💼 STAFF (Nhân viên)

### Lưu ý: Quyền truy cập phụ thuộc vào Business Role
- **SECURITY_STAFF** (Bảo vệ)
- **CASHIER_STAFF** (Thu ngân)
- **SERVER_STAFF** (Phục vụ)
- **BARISTA_STAFF** (Pha chế)

### Dashboard & Tổng Quan
1. **Dashboard** (`/staff`)
   - Tổng quan công việc (nếu có quyền `canViewMenuItems`)
   - Xem đơn hàng, đặt bàn trong ngày
   - Quick actions

### Điểm Bán Hàng (POS)
2. **POS** (`/staff/pos`)
   - Tạo đơn hàng tại quán
   - Thanh toán
   - In hóa đơn
   - **Chỉ dành cho: CASHIER_STAFF**

### Quản Lý Đơn Hàng
3. **Đơn Hàng** (`/staff/orders`)
   - Xem danh sách đơn hàng
   - Xem chi tiết đơn hàng
   - Cập nhật trạng thái đơn hàng
   - **Dành cho: CASHIER_STAFF, SERVER_STAFF, BARISTA_STAFF**

### Quản Lý Đặt Bàn
4. **Đặt Bàn** (`/staff/reservations`)
   - Xem danh sách đặt bàn
   - Xác nhận đặt bàn
   - Hủy đặt bàn
   - **Dành cho: CASHIER_STAFF, SERVER_STAFF**

### Quản Lý Bàn
5. **Bàn** (`/staff/tables`)
   - Xem trạng thái bàn
   - Cập nhật trạng thái bàn (trống/đang dùng)
   - **Dành cho: CASHIER_STAFF, SERVER_STAFF**

### Công Thức & Nguyên Liệu
6. **Công Thức** (`/staff/recipes`)
   - Xem công thức pha chế
   - Xem chi tiết nguyên liệu
   - **Chỉ dành cho: BARISTA_STAFF**

7. **Sử Dụng Nguyên Liệu** (`/staff/stock-usage`)
   - Ghi nhận sử dụng nguyên liệu
   - Cập nhật tồn kho sau khi pha chế
   - **Chỉ dành cho: BARISTA_STAFF**

### Quản Lý Ca Làm Việc
8. **Đăng Ký Ca** (`/staff/shifts`)
   - Đăng ký ca làm việc
   - Xem ca có sẵn
   - **Dành cho: Tất cả nhân viên**

9. **Lịch Làm Việc Của Tôi** (`/staff/my-shifts`)
   - Xem lịch làm việc đã được phân công
   - Xem lịch sử ca làm việc
   - **Dành cho: Tất cả nhân viên**

10. **Yêu Cầu Của Tôi** (`/staff/my-requests`)
    - Xem yêu cầu ca đã gửi
    - Xem trạng thái yêu cầu (đang chờ/đã duyệt/từ chối)
    - **Dành cho: Tất cả nhân viên**

### Cài Đặt
11. **Cài Đặt Tài Khoản** (`/staff/account`)
    - Xem và chỉnh sửa thông tin cá nhân
    - Đổi mật khẩu
    - Xem thông tin HR (identity card, employment type, pay type, salary, etc.)

---

## 📊 Ma Trận Quyền Truy Cập Staff

| Chức Năng | SECURITY | CASHIER | SERVER | BARISTA |
|-----------|----------|---------|--------|---------|
| Overview | ❌ | ✅ | ✅ | ✅ |
| POS | ❌ | ✅ | ❌ | ❌ |
| Orders | ❌ | ✅ | ✅ | ✅ |
| Reservations | ❌ | ✅ | ✅ | ❌ |
| Tables | ❌ | ✅ | ✅ | ❌ |
| Recipes | ❌ | ❌ | ❌ | ✅ |
| Stock Usage | ❌ | ❌ | ❌ | ✅ |
| Shift Registration | ✅ | ✅ | ✅ | ✅ |
| My Schedule | ✅ | ✅ | ✅ | ✅ |
| My Requests | ✅ | ✅ | ✅ | ✅ |
| Account Settings | ✅ | ✅ | ✅ | ✅ |

---

## 🔐 Chức Năng Chung (Tất Cả Vai Trò)

### Xác Thực
- Đăng nhập
- Đăng xuất
- Đổi mật khẩu
- Quên mật khẩu (Customer)

### Cài Đặt Tài Khoản
- Xem thông tin cá nhân
- Chỉnh sửa thông tin (tùy theo vai trò)
- Đổi mật khẩu
- Quản lý avatar

---

## 📝 Ghi Chú

1. **Customer** sử dụng ứng dụng web (`web-app`) với giao diện công khai
2. **Admin, Manager, Staff** sử dụng ứng dụng quản lý nội bộ (`fe_coffee_manager`)
3. Quyền truy cập của **Staff** phụ thuộc vào **Business Role** được phân công
4. Một nhân viên có thể có nhiều Business Roles, quyền sẽ là hợp của tất cả roles
5. Tất cả các chức năng đều được bảo vệ bằng authentication và authorization

