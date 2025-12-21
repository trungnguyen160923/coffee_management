# Chi Tiết Chức Năng STAFF

## 📋 Tổng Quan
Tài liệu này mô tả chi tiết các chức năng của Staff, bao gồm file liên quan, hàm xử lý, logic nghiệp vụ và cách bắt lỗi. Lưu ý: Quyền truy cập phụ thuộc vào Business Role (BARISTA_STAFF, CASHIER_STAFF, SERVER_STAFF, SECURITY_STAFF).

---

## 1. Dashboard (`/staff`)

### Frontend Files
- `fe_coffee_manager/src/pages/staff/StaffDashboard.tsx`
- `fe_coffee_manager/src/utils/staffPermissions.ts`

### Backend Files
- `profile-service/src/main/java/com/service/profile/service/StaffProfileService.java`
- `order-service/src/main/java/orderservice/order_service/service/AnalyticsService.java`

### Hàm Chính

#### Frontend
- `useStaffPermissions()` - Hook kiểm tra quyền
- `canViewMenuItems()` - Có thể xem menu
- `canViewOrders()` - Có thể xem đơn hàng
- `canViewPOS()` - Có thể sử dụng POS
- `canViewRecipes()` - Có thể xem công thức
- `canViewStockUsage()` - Có thể ghi nhận nguyên liệu

#### Backend
- `StaffProfileService.getStaffBusinessRoles(userId)` - Lấy business roles
- `AnalyticsService.getTodayOrders(branchId)` - Đơn hàng hôm nay
- `AnalyticsService.getTodayReservations(branchId)` - Đặt bàn hôm nay

### Logic Nghiệp Vụ
1. Kiểm tra business roles của staff
2. Hiển thị dashboard dựa trên quyền
3. Hiển thị đơn hàng, đặt bàn trong ngày (nếu có quyền)

### Xử Lý Lỗi
- **USER_NOT_FOUND** - Staff không tồn tại
- **NO_BUSINESS_ROLES** - Chưa được phân công business role

---

## 2. POS (`/staff/pos`)

### Frontend Files
- `fe_coffee_manager/src/pages/staff/StaffPOS.tsx`

### Backend Files
- `order-service/src/main/java/orderservice/order_service/controller/POSController.java`
- `order-service/src/main/java/orderservice/order_service/service/POSService.java`
- `order-service/src/main/java/orderservice/order_service/util/StaffPermissionValidator.java`

### Hàm Chính
- `POSController.createPOSOrder(request)` - Tạo đơn POS
- `POSController.getPOSOrdersByStaff(staffId)` - Lấy đơn của staff
- `POSController.updatePOSOrderStatus(id, status)` - Cập nhật trạng thái
- `POSService.createPOSOrder(request)` - Logic tạo đơn
- `StaffPermissionValidator.requirePOSAccess()` - Validate quyền POS
- `StaffPermissionValidator.requireActiveShift()` - Validate đang trong ca

### Logic Nghiệp Vụ
1. **Validate quyền:**
   - Chỉ CASHIER_STAFF mới được sử dụng POS
   - Phải đang trong ca làm việc active

2. **Tạo đơn POS:**
   - Validate sản phẩm tồn tại và active
   - Validate số lượng > 0
   - Tính subtotal
   - Áp dụng giảm giá (nếu có)
   - Tính VAT (10%)
   - Tính tổng
   - Validate chi nhánh không đóng cửa
   - Validate trong giờ mở cửa
   - Tạo Order với type = POS
   - Gán bàn (nếu có)
   - Cập nhật trạng thái bàn
   - Gửi notification

3. **Cập nhật trạng thái:**
   - Validate trạng thái hợp lệ
   - Cập nhật order status
   - Cập nhật table status (nếu có)

### Xử Lý Lỗi
- **UNAUTHORIZED** - Không có quyền POS (không phải CASHIER_STAFF)
- **NO_ACTIVE_SHIFT** - Không đang trong ca làm việc
- **PRODUCT_NOT_FOUND** - Sản phẩm không tồn tại
- **PRODUCT_OUT_OF_STOCK** - Hết hàng
- **BRANCH_CLOSED_ON_DATE** - Chi nhánh đóng cửa
- **BRANCH_NOT_OPERATING_ON_DAY** - Không hoạt động vào ngày này
- **BRANCH_OUTSIDE_OPERATING_HOURS** - Ngoài giờ mở cửa
- **INVALID_QUANTITY** - Số lượng không hợp lệ
- **INVALID_DISCOUNT_CODE** - Mã giảm giá không hợp lệ
- **VALIDATION_FAILED** - Lỗi validation

---

## 3. Đơn Hàng (`/staff/orders`)

### Frontend Files
- `fe_coffee_manager/src/pages/staff/StaffOrders.tsx`

### Backend Files
- `order-service/src/main/java/orderservice/order_service/controller/OrderController.java`
- `order-service/src/main/java/orderservice/order_service/service/OrderService.java`
- `order-service/src/main/java/orderservice/order_service/util/StaffPermissionValidator.java`

### Hàm Chính
- `OrderController.getOrdersByBranch(branchId)` - Lấy đơn theo branch
- `OrderController.getOrderById(id)` - Lấy chi tiết
- `OrderController.updateOrderStatus(id, status)` - Cập nhật trạng thái
- `OrderService.getOrdersByBranch(branchId)` - Logic lấy
- `OrderService.updateOrderStatus(id, status)` - Logic cập nhật
- `StaffPermissionValidator.requireOrdersAccess()` - Validate quyền

### Logic Nghiệp Vụ
1. **Xem đơn hàng:**
   - Chỉ xem được đơn của branch mình
   - Filter theo trạng thái (nếu có)
   - Sắp xếp theo thời gian

2. **Cập nhật trạng thái:**
   - Validate trạng thái hợp lệ
   - Validate transition hợp lệ (PENDING -> PREPARING -> READY -> COMPLETED)
   - Cập nhật order status
   - Gửi notification cho khách hàng

### Xử Lý Lỗi
- **UNAUTHORIZED** - Không có quyền xem đơn hàng
- **ORDER_NOT_FOUND** - Đơn hàng không tồn tại
- **ORDER_NOT_IN_BRANCH** - Đơn không thuộc branch
- **INVALID_STATUS_TRANSITION** - Chuyển trạng thái không hợp lệ
- **ORDER_ALREADY_COMPLETED** - Đơn đã hoàn thành
- **ORDER_ALREADY_CANCELLED** - Đơn đã bị hủy

---

## 4. Đặt Bàn (`/staff/reservations`)

### Frontend Files
- `fe_coffee_manager/src/pages/staff/StaffReservations.tsx`

### Backend Files
- `order-service/src/main/java/orderservice/order_service/controller/ReservationController.java`
- `order-service/src/main/java/orderservice/order_service/service/ReservationService.java`
- `order-service/src/main/java/orderservice/order_service/util/StaffPermissionValidator.java`

### Hàm Chính
- `ReservationController.getReservationsByBranch(branchId)` - Lấy đặt bàn
- `ReservationController.updateReservationStatus(id, status)` - Cập nhật trạng thái
- `ReservationService.getReservationsByBranch(branchId)` - Logic lấy
- `ReservationService.updateReservationStatus(id, status)` - Logic cập nhật
- `StaffPermissionValidator.requireReservationsAccess()` - Validate quyền

### Logic Nghiệp Vụ
1. **Xem đặt bàn:**
   - Chỉ xem được đặt bàn của branch mình
   - Filter theo trạng thái, ngày
   - Hiển thị thông tin bàn được gán

2. **Xác nhận đặt bàn:**
   - Validate reservation tồn tại
   - Validate status = PENDING
   - Cập nhật status = CONFIRMED
   - Gán bàn (nếu chưa gán)
   - Gửi notification

3. **Hủy đặt bàn:**
   - Validate reservation tồn tại
   - Validate có thể hủy (status = PENDING hoặc CONFIRMED)
   - Cập nhật status = CANCELLED
   - Giải phóng bàn
   - Gửi notification

### Xử Lý Lỗi
- **UNAUTHORIZED** - Không có quyền xem đặt bàn
- **RESERVATION_NOT_FOUND** - Đặt bàn không tồn tại
- **RESERVATION_NOT_IN_BRANCH** - Không thuộc branch
- **RESERVATION_ALREADY_CONFIRMED** - Đã được xác nhận
- **RESERVATION_ALREADY_CANCELLED** - Đã bị hủy
- **NO_AVAILABLE_TABLE** - Không có bàn trống

---

## 5. Bàn (`/staff/tables`)

### Frontend Files
- `fe_coffee_manager/src/pages/staff/StaffTables.tsx`

### Backend Files
- `order-service/src/main/java/orderservice/order_service/controller/TableManagementController.java`
- `order-service/src/main/java/orderservice/order_service/service/TableManagementService.java`
- `order-service/src/main/java/orderservice/order_service/util/StaffPermissionValidator.java`

### Hàm Chính
- `TableManagementController.getTablesByBranch(branchId)` - Lấy danh sách bàn
- `TableManagementController.updateTableStatus(id, status)` - Cập nhật trạng thái
- `TableManagementController.assignTableToReservation(tableId, reservationId)` - Gán bàn
- `TableManagementService.getTablesByBranch(branchId)` - Logic lấy
- `TableManagementService.updateTableStatus(id, status)` - Logic cập nhật
- `StaffPermissionValidator.requireTablesAccess()` - Validate quyền

### Logic Nghiệp Vụ
1. **Xem bàn:**
   - Lấy danh sách bàn của branch
   - Hiển thị trạng thái (AVAILABLE, OCCUPIED, RESERVED)
   - Hiển thị thông tin đơn hàng/đặt bàn liên quan

2. **Cập nhật trạng thái:**
   - Validate bàn tồn tại
   - Validate trạng thái hợp lệ
   - Cập nhật table status
   - Cập nhật order/reservation liên quan

3. **Gán bàn:**
   - Validate bàn trống
   - Validate reservation tồn tại
   - Gán bàn cho reservation
   - Cập nhật trạng thái bàn = RESERVED

### Xử Lý Lỗi
- **UNAUTHORIZED** - Không có quyền quản lý bàn
- **TABLE_NOT_FOUND** - Bàn không tồn tại
- **TABLE_NOT_IN_BRANCH** - Bàn không thuộc branch
- **TABLE_NOT_AVAILABLE** - Bàn không trống
- **TABLE_ALREADY_OCCUPIED** - Bàn đang được sử dụng
- **INVALID_TABLE_STATUS** - Trạng thái không hợp lệ

---

## 6. Công Thức (`/staff/recipes`)

### Frontend Files
- `fe_coffee_manager/src/pages/staff/StaffRecipes.tsx`

### Backend Files
- `catalog-service/src/main/java/com/service/catalog/controller/RecipeController.java`
- `catalog-service/src/main/java/com/service/catalog/service/RecipeService.java`
- `order-service/src/main/java/orderservice/order_service/util/StaffPermissionValidator.java`

### Hàm Chính
- `RecipeController.getRecipes()` - Lấy danh sách công thức
- `RecipeController.getRecipeById(id)` - Lấy chi tiết
- `RecipeService.getRecipes()` - Logic lấy
- `RecipeService.getRecipeById(id)` - Logic lấy chi tiết
- `StaffPermissionValidator.requireRecipesAccess()` - Validate quyền

### Logic Nghiệp Vụ
1. **Xem công thức:**
   - Chỉ BARISTA_STAFF mới được xem
   - Lấy danh sách công thức
   - Hiển thị nguyên liệu và định lượng
   - Hiển thị hướng dẫn pha chế

2. **Xem chi tiết:**
   - Lấy thông tin chi tiết công thức
   - Hiển thị từng bước pha chế
   - Hiển thị nguyên liệu cần thiết

### Xử Lý Lỗi
- **UNAUTHORIZED** - Không có quyền xem công thức (không phải BARISTA_STAFF)
- **RECIPE_NOT_FOUND** - Công thức không tồn tại
- **PRODUCT_NOT_FOUND** - Sản phẩm không tồn tại

---

## 7. Sử Dụng Nguyên Liệu (`/staff/stock-usage`)

### Frontend Files
- `fe_coffee_manager/src/pages/staff/StaffStockUsage.tsx`

### Backend Files
- `catalog-service/src/main/java/com/service/catalog/controller/StockController.java`
- `catalog-service/src/main/java/com/service/catalog/service/StockService.java`
- `catalog-service/src/main/java/com/service/catalog/service/StockAdjustmentService.java`
- `order-service/src/main/java/orderservice/order_service/util/StaffPermissionValidator.java`

### Hàm Chính
- `StockController.recordStockUsage(request)` - Ghi nhận sử dụng
- `StockController.getStockUsage(branchId, date)` - Lấy lịch sử
- `StockService.recordStockUsage(branchId, ingredientId, quantity)` - Logic ghi nhận
- `StockAdjustmentService.adjustStock(branchId, ingredientId, quantity, reason)` - Điều chỉnh tồn kho
- `StaffPermissionValidator.requireStockUsageAccess()` - Validate quyền

### Logic Nghiệp Vụ
1. **Ghi nhận sử dụng:**
   - Chỉ BARISTA_STAFF mới được ghi nhận
   - Validate nguyên liệu tồn tại
   - Validate số lượng > 0
   - Validate tồn kho đủ
   - Tạo stock usage record
   - Giảm tồn kho
   - Ghi log

2. **Xem lịch sử:**
   - Lấy lịch sử sử dụng theo ngày
   - Hiển thị nguyên liệu, số lượng, thời gian
   - Tính tổng sử dụng

### Xử Lý Lỗi
- **UNAUTHORIZED** - Không có quyền ghi nhận (không phải BARISTA_STAFF)
- **INGREDIENT_NOT_FOUND** - Nguyên liệu không tồn tại
- **INSUFFICIENT_STOCK** - Không đủ tồn kho
- **INVALID_QUANTITY** - Số lượng không hợp lệ
- **STOCK_NOT_FOUND** - Tồn kho không tồn tại
- **VALIDATION_FAILED** - Lỗi validation

---

## 8. Đăng Ký Ca (`/staff/shifts`)

### Frontend Files
- `fe_coffee_manager/src/pages/staff/StaffShiftRegistration.tsx`

### Backend Files
- `profile-service/src/main/java/com/service/profile/controller/ShiftController.java`
- `profile-service/src/main/java/com/service/profile/service/ShiftService.java`
- `profile-service/src/main/java/com/service/profile/service/ShiftValidationService.java`

### Hàm Chính
- `ShiftController.getAvailableShifts(branchId, start, end)` - Lấy ca có sẵn
- `ShiftController.registerShift(shiftId)` - Đăng ký ca
- `ShiftService.getAvailableShifts(branchId, start, end)` - Logic lấy
- `ShiftService.registerShift(shiftId, staffId)` - Logic đăng ký
- `ShiftValidationService.validateShiftRegistration(shift, staff)` - Validate đăng ký

### Logic Nghiệp Vụ
1. **Lấy ca có sẵn:**
   - Lấy ca có status = AVAILABLE
   - Lọc theo branch của staff
   - Lọc theo ngày (không quá khứ, không quá xa)
   - Hiển thị thông tin ca (thời gian, yêu cầu roles)

2. **Đăng ký ca:**
   - Validate ca tồn tại và AVAILABLE
   - Validate staff có business role phù hợp
   - Validate staff chưa có ca trùng thời gian
   - Validate các quy tắc (giờ làm việc, overtime, etc.)
   - Tạo assignment
   - Cập nhật shift status nếu đủ người
   - Gửi notification cho manager

### Xử Lý Lỗi
- **SHIFT_NOT_FOUND** - Ca không tồn tại
- **SHIFT_NOT_AVAILABLE** - Ca không còn trống
- **SHIFT_FULL** - Ca đã đủ người
- **SHIFT_ALREADY_REGISTERED** - Đã đăng ký ca trùng
- **SHIFT_ROLE_NOT_QUALIFIED** - Không đủ trình độ
- **SHIFT_EXCEEDS_DAILY_HOURS** - Vượt quá giờ làm việc hàng ngày
- **SHIFT_EXCEEDS_WEEKLY_HOURS** - Vượt quá giờ làm việc hàng tuần
- **SHIFT_EXCEEDS_OVERTIME_LIMIT** - Vượt quá giờ overtime
- **SHIFT_EMPLOYMENT_TYPE_MISMATCH** - Không khớp loại hợp đồng
- **SHIFT_DATE_IN_PAST** - Ngày ca trong quá khứ
- **SHIFT_DATE_TOO_FAR** - Ngày ca quá xa

---

## 9. Lịch Làm Việc Của Tôi (`/staff/my-shifts`)

### Frontend Files
- `fe_coffee_manager/src/pages/staff/StaffMyShifts.tsx`

### Backend Files
- `profile-service/src/main/java/com/service/profile/controller/ShiftAssignmentController.java`
- `profile-service/src/main/java/com/service/profile/service/ShiftAssignmentService.java`

### Hàm Chính
- `ShiftAssignmentController.getMyAssignments(staffId, start, end)` - Lấy phân công
- `ShiftAssignmentController.cancelAssignment(id)` - Hủy phân công
- `ShiftAssignmentService.getAssignmentsByStaff(staffId, start, end)` - Logic lấy
- `ShiftAssignmentService.cancelAssignment(id, staffId)` - Logic hủy

### Logic Nghiệp Vụ
1. **Xem lịch:**
   - Lấy tất cả assignments của staff
   - Filter theo khoảng thời gian
   - Hiển thị thông tin ca (ngày, giờ, branch)
   - Hiển thị trạng thái (PENDING, CONFIRMED, COMPLETED)

2. **Hủy phân công:**
   - Chỉ hủy được assignment của chính mình
   - Chỉ hủy được khi status = PENDING hoặc CONFIRMED
   - Xóa assignment
   - Cập nhật shift status
   - Gửi notification cho manager

### Xử Lý Lỗi
- **SHIFT_ASSIGNMENT_NOT_FOUND** - Phân công không tồn tại
- **ASSIGNMENT_NOT_OWNED_BY_STAFF** - Không phải phân công của staff
- **ASSIGNMENT_ALREADY_COMPLETED** - Đã hoàn thành, không thể hủy
- **ASSIGNMENT_CANNOT_BE_CANCELLED** - Không thể hủy (quá gần thời gian ca)

---

## 10. Yêu Cầu Của Tôi (`/staff/my-requests`)

### Frontend Files
- `fe_coffee_manager/src/pages/staff/StaffMyRequests.tsx`

### Backend Files
- `profile-service/src/main/java/com/service/profile/controller/ShiftRequestController.java`
- `profile-service/src/main/java/com/service/profile/service/ShiftRequestService.java`

### Hàm Chính
- `ShiftRequestController.getMyRequests(staffId)` - Lấy yêu cầu của tôi
- `ShiftRequestController.createRequest(request)` - Tạo yêu cầu
- `ShiftRequestController.cancelRequest(id)` - Hủy yêu cầu
- `ShiftRequestService.createRequest(request, staffId)` - Logic tạo
- `ShiftRequestService.cancelRequest(id, staffId)` - Logic hủy

### Logic Nghiệp Vụ
1. **Tạo yêu cầu:**
   - Validate loại yêu cầu (REGISTER, LEAVE, SWAP, PICK_UP, OVERTIME)
   - Validate thông tin theo từng loại:
     - REGISTER: shiftId bắt buộc
     - LEAVE: assignmentId bắt buộc
     - SWAP: assignmentId và targetStaffId bắt buộc
     - PICK_UP: assignmentId và targetStaffId bắt buộc
     - OVERTIME: shiftId bắt buộc
   - Validate deadline (LEAVE phải trước 24h)
   - Tạo request với status = PENDING
   - Gửi notification cho manager

2. **Xem yêu cầu:**
   - Lấy tất cả requests của staff
   - Hiển thị trạng thái (PENDING, APPROVED, REJECTED)
   - Hiển thị lý do từ chối (nếu có)

3. **Hủy yêu cầu:**
   - Chỉ hủy được request của chính mình
   - Chỉ hủy được khi status = PENDING
   - Xóa request
   - Gửi notification

### Xử Lý Lỗi
- **SHIFT_REQUEST_NOT_FOUND** - Yêu cầu không tồn tại
- **SHIFT_REQUEST_INVALID_TYPE** - Loại yêu cầu không hợp lệ
- **SHIFT_NOT_FOUND** - Ca không tồn tại
- **SHIFT_ASSIGNMENT_NOT_FOUND** - Phân công không tồn tại
- **SHIFT_REQUEST_LEAVE_DEADLINE_PASSED** - Quá hạn đăng ký nghỉ
- **SHIFT_REQUEST_ASSIGNMENT_NOT_OWNED** - Không sở hữu phân công
- **SHIFT_REQUEST_SWAP_TARGET_REQUIRED** - Thiếu nhân viên đích
- **SHIFT_REQUEST_SWAP_TARGET_SAME_STAFF** - Không thể swap với chính mình
- **SHIFT_REQUEST_ALREADY_PROCESSED** - Đã được xử lý
- **SHIFT_REQUEST_CANNOT_BE_CANCELLED** - Không thể hủy

---

## 11. Cài Đặt Tài Khoản (`/staff/account`)

### Frontend Files
- `fe_coffee_manager/src/pages/common/AccountSettingsPage.tsx`

### Backend Files
- `auth/src/main/java/com/service/auth/controller/AuthenticationController.java`
- `auth/src/main/java/com/service/auth/service/AuthenticationService.java`
- `profile-service/src/main/java/com/service/profile/controller/StaffProfileController.java`
- `profile-service/src/main/java/com/service/profile/service/StaffProfileService.java`

### Hàm Chính
- `StaffProfileController.getMyProfile()` - Lấy thông tin
- `StaffProfileController.updateProfile(request)` - Cập nhật
- `AuthenticationController.changePassword(request)` - Đổi mật khẩu
- `StaffProfileService.updateProfile(userId, request)` - Logic cập nhật
- `AuthenticationService.changePassword(userId, request)` - Logic đổi mật khẩu

### Logic Nghiệp Vụ
1. **Cập nhật thông tin:**
   - Cho phép cập nhật: fullname, phone
   - Không cho phép cập nhật: email, identity card, business roles
   - Cập nhật vào staff_profile

2. **Đổi mật khẩu:**
   - Validate mật khẩu cũ đúng
   - Validate mật khẩu mới
   - Hash và cập nhật

### Xử Lý Lỗi
- **USER_NOT_FOUND** - Staff không tồn tại
- **INVALID_OLD_PASSWORD** - Mật khẩu cũ sai
- **WEAK_PASSWORD** - Mật khẩu mới không đủ mạnh
- **VALIDATION_FAILED** - Lỗi validation

---

## 📝 Tổng Kết Xử Lý Lỗi

### Permission Validation
- Sử dụng `StaffPermissionValidator` để validate quyền
- Kiểm tra business roles (BARISTA_STAFF, CASHIER_STAFF, SERVER_STAFF, SECURITY_STAFF)
- Kiểm tra active shift cho một số chức năng (POS)

### Authorization
- Tất cả endpoints yêu cầu role STAFF
- Validate staff thuộc branch được yêu cầu
- Validate business role phù hợp với chức năng

### Validation
- Sử dụng `@Valid` và Bean Validation
- Custom validation cho business rules
- Validate thời gian, ngày tháng
- Validate relationships (staff-branch, shift-staff)

### Business Logic Errors
- Sử dụng `AppException` với `ErrorCode` cụ thể
- Validate các quy tắc nghiệp vụ (shift rules, stock rules)
- `GlobalExceptionHandler` xử lý tất cả exceptions

### Ma Trận Quyền

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


