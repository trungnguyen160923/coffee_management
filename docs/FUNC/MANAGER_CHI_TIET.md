# Chi Tiết Chức Năng MANAGER

## 📋 Tổng Quan
Tài liệu này mô tả chi tiết các chức năng của Manager, bao gồm file liên quan, hàm xử lý, logic nghiệp vụ và cách bắt lỗi.

---

## 1. Dashboard (`/manager`)

### Frontend Files
- `fe_coffee_manager/src/pages/manager/ManagerDashboard.tsx`

### Backend Files
- `order-service/src/main/java/orderservice/order_service/service/AnalyticsService.java`
- `ai-service/app/routers/statistics.py`

### Hàm Chính
- `AnalyticsService.getBranchStatistics(branchId)` - Thống kê chi nhánh
- `getTodayOrders(branchId)` - Đơn hàng hôm nay
- `getTodayReservations(branchId)` - Đặt bàn hôm nay

### Logic Nghiệp Vụ
1. Lấy thống kê chỉ cho chi nhánh của manager
2. Tính doanh thu, số đơn hàng trong ngày/tuần/tháng
3. Hiển thị các chỉ số quan trọng

### Xử Lý Lỗi
- **BRANCH_NOT_FOUND** - Chi nhánh không tồn tại
- **UNAUTHORIZED** - Không phải manager của chi nhánh này

---

## 2. Quản Lý Nhân Viên (`/manager/staff`)

### Frontend Files
- `fe_coffee_manager/src/pages/manager/StaffManagement.tsx`

### Backend Files
- `auth/src/main/java/com/service/auth/controller/UserV2Controller.java`
- `auth/src/main/java/com/service/auth/service/UserV2Service.java`
- `profile-service/src/main/java/com/service/profile/controller/StaffProfileController.java`
- `profile-service/src/main/java/com/service/profile/service/StaffProfileService.java`

### Hàm Chính
- `UserV2Controller.createStaff(request)` - Tạo nhân viên
- `StaffProfileController.getStaffProfiles(branchId)` - Lấy danh sách
- `StaffProfileController.updateStaffProfile(id, request)` - Cập nhật
- `StaffProfileController.assignBusinessRoles(id, roleIds)` - Phân công roles
- `UserV2Service.createStaff(request)` - Logic tạo
- `StaffProfileService.updateProfile(userId, request)` - Logic cập nhật

### Logic Nghiệp Vụ
1. **Tạo nhân viên:**
   - Validate email không trùng
   - Tạo user với role STAFF
   - Tạo staff_profile với branchId của manager
   - Phân công business roles (BARISTA, CASHIER, SERVER, SECURITY)

2. **Cập nhật:**
   - Cập nhật thông tin HR (employment type, pay type, salary)
   - Cập nhật business roles

3. **Phân công roles:**
   - Validate roles tồn tại
   - Cập nhật staff_business_roles

### Xử Lý Lỗi
- **USER_NOT_FOUND** - Nhân viên không tồn tại
- **EMAIL_ALREADY_EXISTS** - Email đã tồn tại
- **STAFF_NOT_IN_BRANCH** - Nhân viên không thuộc chi nhánh
- **INVALID_BUSINESS_ROLE** - Business role không hợp lệ
- **VALIDATION_FAILED** - Lỗi validation

---

## 3. Quản Lý Ca Làm Việc (`/manager/shifts`)

### Frontend Files
- `fe_coffee_manager/src/pages/manager/ShiftCalendarPage.tsx`

### Backend Files
- `profile-service/src/main/java/com/service/profile/controller/ShiftController.java`
- `profile-service/src/main/java/com/service/profile/service/ShiftService.java`
- `profile-service/src/main/java/com/service/profile/service/ShiftValidationService.java`

### Hàm Chính
- `ShiftController.createShift(request)` - Tạo ca
- `ShiftController.updateShift(id, request)` - Cập nhật
- `ShiftController.getShifts(branchId, start, end)` - Lấy danh sách
- `ShiftService.createShift(request, managerUserId)` - Logic tạo
- `ShiftValidationService.validateShiftCreation(shift)` - Validate tạo ca
- `ShiftValidationService.validateShiftTime(shiftDate, startTime, endTime)` - Validate thời gian

### Logic Nghiệp Vụ
1. **Tạo ca:**
   - Validate branch tồn tại và manager quản lý branch đó
   - Validate thời gian (không quá khứ, không quá xa)
   - Validate chi nhánh không đóng cửa
   - Validate thời gian trong giờ mở cửa
   - Validate duration hợp lệ
   - Tạo shift với status = AVAILABLE
   - Tạo shift_role_requirements

2. **Cập nhật:**
   - Chỉ cho phép cập nhật khi chưa có assignment
   - Validate thời gian mới
   - Cập nhật thông tin

3. **Xóa:**
   - Chỉ cho phép xóa khi chưa có assignment
   - Xóa shift và requirements

### Xử Lý Lỗi
- **SHIFT_NOT_FOUND** - Ca không tồn tại
- **SHIFT_DATE_IN_PAST** - Ngày ca trong quá khứ
- **SHIFT_DATE_TOO_FAR** - Ngày ca quá xa
- **BRANCH_CLOSED_ON_DATE** - Chi nhánh đóng cửa
- **SHIFT_TIME_CONFLICT** - Xung đột thời gian
- **SHIFT_BELOW_MIN_DURATION** - Thời lượng quá ngắn
- **SHIFT_EXCEEDS_MAX_DURATION** - Thời lượng quá dài
- **SHIFT_HAS_ASSIGNMENTS** - Ca đã có phân công, không thể xóa
- **UNAUTHORIZED** - Không phải manager của chi nhánh

---

## 4. Mẫu Ca Làm Việc (`/manager/shift-templates`)

### Frontend Files
- `fe_coffee_manager/src/pages/manager/ShiftTemplateManagement.tsx`

### Backend Files
- `profile-service/src/main/java/com/service/profile/controller/ShiftTemplateController.java`
- `profile-service/src/main/java/com/service/profile/service/ShiftTemplateService.java`

### Hàm Chính
- `ShiftTemplateController.createTemplate(request)` - Tạo mẫu
- `ShiftTemplateController.updateTemplate(id, request)` - Cập nhật
- `ShiftTemplateController.deleteTemplate(id)` - Xóa
- `ShiftTemplateService.createTemplate(request, branchId)` - Logic tạo
- `ShiftTemplateService.generateShiftsFromTemplate(templateId, startDate, endDate)` - Tạo ca từ mẫu

### Logic Nghiệp Vụ
1. **Tạo mẫu:**
   - Validate tên mẫu không trùng trong branch
   - Validate thời gian (startTime < endTime)
   - Validate role requirements
   - Lưu template

2. **Tạo ca từ mẫu:**
   - Validate template tồn tại
   - Tạo ca cho từng ngày trong khoảng thời gian
   - Áp dụng openDays của branch
   - Bỏ qua ngày đóng cửa

### Xử Lý Lỗi
- **SHIFT_TEMPLATE_NOT_FOUND** - Mẫu không tồn tại
- **DUPLICATE_ENTITY** - Tên mẫu đã tồn tại
- **INVALID_TIME_RANGE** - Thời gian không hợp lệ
- **VALIDATION_FAILED** - Lỗi validation

---

## 5. Phân Công Ca (`/manager/shift-assignments`)

### Frontend Files
- `fe_coffee_manager/src/pages/manager/ShiftAssignmentsManagement.tsx`

### Backend Files
- `profile-service/src/main/java/com/service/profile/controller/ShiftAssignmentController.java`
- `profile-service/src/main/java/com/service/profile/service/ShiftAssignmentService.java`
- `profile-service/src/main/java/com/service/profile/service/ShiftValidationService.java`

### Hàm Chính
- `ShiftAssignmentController.assignStaff(shiftId, staffId)` - Phân công
- `ShiftAssignmentController.removeAssignment(id)` - Hủy phân công
- `ShiftAssignmentService.assignStaff(shiftId, staffId, managerUserId)` - Logic phân công
- `ShiftValidationService.validateAssignment(shift, staff)` - Validate phân công

### Logic Nghiệp Vụ
1. **Phân công:**
   - Validate shift tồn tại và AVAILABLE
   - Validate staff thuộc branch
   - Validate staff có business role phù hợp
   - Validate staff chưa có ca trùng thời gian
   - Validate các quy tắc (giờ làm việc, overtime, etc.)
   - Tạo assignment
   - Cập nhật shift status nếu đủ người

2. **Hủy phân công:**
   - Validate assignment tồn tại
   - Xóa assignment
   - Cập nhật shift status nếu thiếu người

### Xử Lý Lỗi
- **SHIFT_NOT_FOUND** - Ca không tồn tại
- **SHIFT_NOT_AVAILABLE** - Ca không còn trống
- **SHIFT_FULL** - Ca đã đủ người
- **SHIFT_ALREADY_REGISTERED** - Nhân viên đã có ca trùng
- **SHIFT_ROLE_NOT_QUALIFIED** - Nhân viên không đủ trình độ
- **SHIFT_EXCEEDS_DAILY_HOURS** - Vượt quá giờ làm việc hàng ngày
- **SHIFT_EXCEEDS_WEEKLY_HOURS** - Vượt quá giờ làm việc hàng tuần
- **SHIFT_EXCEEDS_OVERTIME_LIMIT** - Vượt quá giờ overtime
- **SHIFT_EMPLOYMENT_TYPE_MISMATCH** - Không khớp loại hợp đồng
- **UNAUTHORIZED** - Không phải manager của branch

---

## 6. Yêu Cầu Ca (`/manager/shift-requests`)

### Frontend Files
- `fe_coffee_manager/src/pages/manager/ManagerShiftRequests.tsx`

### Backend Files
- `profile-service/src/main/java/com/service/profile/controller/ShiftRequestController.java`
- `profile-service/src/main/java/com/service/profile/service/ShiftRequestService.java`

### Hàm Chính
- `ShiftRequestController.getRequests(branchId, status)` - Lấy danh sách
- `ShiftRequestController.approveRequest(id)` - Duyệt
- `ShiftRequestController.rejectRequest(id, reason)` - Từ chối
- `ShiftRequestService.approveRequest(id, managerUserId)` - Logic duyệt
- `ShiftRequestService.rejectRequest(id, reason, managerUserId)` - Logic từ chối

### Logic Nghiệp Vụ
1. **Duyệt yêu cầu:**
   - Validate request tồn tại và status = PENDING
   - Validate manager có quyền (branch của manager)
   - Thực hiện logic theo type:
     - REGISTER: Tạo assignment
     - LEAVE: Xóa assignment
     - SWAP: Hoán đổi assignment
     - PICK_UP: Chuyển assignment
   - Cập nhật status = APPROVED
   - Gửi notification

2. **Từ chối:**
   - Validate request tồn tại
   - Cập nhật status = REJECTED
   - Lưu lý do từ chối
   - Gửi notification

### Xử Lý Lỗi
- **SHIFT_REQUEST_NOT_FOUND** - Yêu cầu không tồn tại
- **SHIFT_REQUEST_ALREADY_PROCESSED** - Đã được xử lý
- **SHIFT_REQUEST_INVALID_TYPE** - Loại yêu cầu không hợp lệ
- **UNAUTHORIZED** - Không có quyền duyệt

---

## 7. Quản Lý Lương (`/manager/payroll`)

### Frontend Files
- `fe_coffee_manager/src/pages/manager/ManagerPayrollManagement.tsx`

### Backend Files
- `profile-service/src/main/java/com/service/profile/controller/PayrollController.java`
- `profile-service/src/main/java/com/service/profile/service/PayrollService.java`

### Hàm Chính
- `PayrollController.calculatePayroll(request)` - Tính lương
- `PayrollController.calculatePayrollBatch(request)` - Tính lương hàng loạt
- `PayrollController.getPayrolls(branchId, filters)` - Lấy danh sách
- `PayrollController.approvePayroll(id)` - Duyệt lương
- `PayrollService.calculatePayroll(request, userId, role)` - Logic tính
- `PayrollService.validateAuthorization(userId, branchId, role)` - Validate quyền

### Logic Nghiệp Vụ
1. **Tính lương:**
   - Chỉ tính cho nhân viên trong branch của manager
   - Tính base salary hoặc hourly rate
   - Tính công ca làm việc
   - Tính overtime
   - Tính allowances, bonuses, penalties
   - Tính bảo hiểm và thuế
   - Tính tổng lương

2. **Duyệt lương:**
   - Chỉ duyệt được payroll của branch mình
   - Cập nhật status = APPROVED
   - Gửi notification

### Xử Lý Lỗi
- **PAYROLL_NOT_FOUND** - Payroll không tồn tại
- **PAYROLL_ALREADY_EXISTS** - Đã tồn tại
- **UNAUTHORIZED** - Không phải manager của branch
- **PAYROLL_ALREADY_APPROVED** - Đã được duyệt
- **STAFF_NOT_IN_BRANCH** - Nhân viên không thuộc branch

---

## 8. Thưởng & Phạt (`/manager/bonus-penalty-allowance`)

### Frontend Files
- `fe_coffee_manager/src/pages/manager/ManagerBonusPenaltyAllowanceManagement.tsx`

### Backend Files
- `profile-service/src/main/java/com/service/profile/controller/BonusController.java`
- `profile-service/src/main/java/com/service/profile/controller/PenaltyController.java`
- `profile-service/src/main/java/com/service/profile/controller/AllowanceController.java`
- `profile-service/src/main/java/com/service/profile/service/BonusService.java`
- `profile-service/src/main/java/com/service/profile/service/PenaltyService.java`
- `profile-service/src/main/java/com/service/profile/service/AllowanceService.java`

### Hàm Chính
- `BonusController.createBonus(request)` - Tạo thưởng
- `PenaltyController.createPenalty(request)` - Tạo phạt
- `AllowanceController.createAllowance(request)` - Tạo phụ cấp
- `BonusService.createBonus(request, branchId)` - Logic tạo
- `PenaltyService.createPenalty(request, branchId)` - Logic tạo
- `AllowanceService.createAllowance(request, branchId)` - Logic tạo

### Logic Nghiệp Vụ
1. **Tạo thưởng/phạt/phụ cấp:**
   - Validate nhân viên thuộc branch
   - Validate giá trị (phần trăm hoặc số tiền)
   - Validate kỳ (period)
   - Lưu vào database
   - Áp dụng vào payroll khi tính lương

### Xử Lý Lỗi
- **BONUS_NOT_FOUND** - Thưởng không tồn tại
- **PENALTY_NOT_FOUND** - Phạt không tồn tại
- **ALLOWANCE_NOT_FOUND** - Phụ cấp không tồn tại
- **STAFF_NOT_IN_BRANCH** - Nhân viên không thuộc branch
- **INVALID_VALUE** - Giá trị không hợp lệ
- **VALIDATION_FAILED** - Lỗi validation

---

## 9. Quản Lý Mua Hàng (`/manager/procurement`)

### Frontend Files
- `fe_coffee_manager/src/pages/manager/IngredientProcurement.tsx`
- `fe_coffee_manager/src/pages/manager/PurchaseOrders.tsx`

### Backend Files
- `catalog-service/src/main/java/com/service/catalog/controller/PurchaseOrderController.java`
- `catalog-service/src/main/java/com/service/catalog/service/PurchaseOrderService.java`

### Hàm Chính
- `PurchaseOrderController.createPurchaseOrder(request)` - Tạo đơn mua hàng
- `PurchaseOrderController.getPurchaseOrders(branchId)` - Lấy danh sách
- `PurchaseOrderController.confirmPurchaseOrder(id)` - Xác nhận đơn
- `PurchaseOrderService.createPurchaseOrder(request, branchId)` - Logic tạo
- `PurchaseOrderService.validatePurchaseOrder(request)` - Validate đơn

### Logic Nghiệp Vụ
1. **Tạo đơn mua hàng:**
   - Validate supplier tồn tại
   - Validate nguyên liệu tồn tại
   - Validate số lượng > 0
   - Tính tổng tiền
   - Tạo purchase order với status = PENDING
   - Gửi notification cho supplier

2. **Xác nhận đơn:**
   - Chỉ manager của branch mới xác nhận được
   - Cập nhật status = CONFIRMED
   - Gửi notification

### Xử Lý Lỗi
- **PURCHASE_ORDER_NOT_FOUND** - Đơn không tồn tại
- **SUPPLIER_NOT_FOUND** - Nhà cung cấp không tồn tại
- **INGREDIENT_NOT_FOUND** - Nguyên liệu không tồn tại
- **INVALID_QUANTITY** - Số lượng không hợp lệ
- **UNAUTHORIZED** - Không phải manager của branch
- **PURCHASE_ORDER_ALREADY_CONFIRMED** - Đã được xác nhận

---

## 10. Phiếu Nhập Kho (`/manager/goods-receipts`)

### Frontend Files
- `fe_coffee_manager/src/pages/manager/GoodsReceipts.tsx`

### Backend Files
- `catalog-service/src/main/java/com/service/catalog/controller/GoodsReceiptController.java`
- `catalog-service/src/main/java/com/service/catalog/service/GoodsReceiptService.java`

### Hàm Chính
- `GoodsReceiptController.createGoodsReceipt(request)` - Tạo phiếu nhập
- `GoodsReceiptController.confirmGoodsReceipt(id)` - Xác nhận nhập kho
- `GoodsReceiptService.createGoodsReceipt(request, branchId)` - Logic tạo
- `GoodsReceiptService.confirmGoodsReceipt(id)` - Logic xác nhận

### Logic Nghiệp Vụ
1. **Tạo phiếu nhập:**
   - Validate purchase order tồn tại
   - Validate purchase order đã CONFIRMED
   - Tạo goods receipt với status = PENDING
   - Liên kết với purchase order

2. **Xác nhận nhập kho:**
   - Validate goods receipt tồn tại
   - Cập nhật tồn kho cho từng nguyên liệu
   - Cập nhật status = CONFIRMED
   - Cập nhật purchase order status = RECEIVED

### Xử Lý Lỗi
- **GOODS_RECEIPT_NOT_FOUND** - Phiếu không tồn tại
- **PURCHASE_ORDER_NOT_FOUND** - Đơn mua hàng không tồn tại
- **PURCHASE_ORDER_NOT_CONFIRMED** - Đơn chưa được xác nhận
- **GOODS_RECEIPT_ALREADY_CONFIRMED** - Đã được xác nhận
- **INSUFFICIENT_STOCK** - Không đủ tồn kho (khi trả hàng)

---

## 11. Quản Lý Bàn (`/manager/tables`)

### Frontend Files
- `fe_coffee_manager/src/pages/manager/TableManagement.tsx`

### Backend Files
- `order-service/src/main/java/orderservice/order_service/controller/TableManagementController.java`
- `order-service/src/main/java/orderservice/order_service/service/TableManagementService.java`

### Hàm Chính
- `TableManagementController.createTable(request)` - Tạo bàn
- `TableManagementController.updateTable(id, request)` - Cập nhật
- `TableManagementController.deleteTable(id)` - Xóa
- `TableManagementService.createTable(request, branchId)` - Logic tạo

### Logic Nghiệp Vụ
1. **Tạo bàn:**
   - Validate branch tồn tại
   - Validate số bàn không trùng
   - Validate capacity > 0
   - Lưu vào database

2. **Cập nhật:**
   - Validate bàn tồn tại
   - Validate bàn không đang sử dụng
   - Cập nhật thông tin

### Xử Lý Lỗi
- **TABLE_NOT_FOUND** - Bàn không tồn tại
- **TABLE_NUMBER_ALREADY_EXISTS** - Số bàn đã tồn tại
- **TABLE_IN_USE** - Bàn đang sử dụng
- **INVALID_CAPACITY** - Sức chứa không hợp lệ
- **UNAUTHORIZED** - Không phải manager của branch

---

## 📝 Tổng Kết Xử Lý Lỗi

### Authorization
- Tất cả endpoints yêu cầu role MANAGER
- Validate manager quản lý branch được yêu cầu
- Sử dụng `@PreAuthorize("hasRole('MANAGER')")`
- Validate branch ownership trong service layer

### Validation
- Sử dụng `@Valid` và Bean Validation
- Custom validation cho business rules
- Validate thời gian, ngày tháng
- Validate relationships (staff-branch, shift-branch)

### Business Logic Errors
- Sử dụng `AppException` với `ErrorCode` cụ thể
- Validate các quy tắc nghiệp vụ (shift rules, payroll rules)
- `GlobalExceptionHandler` xử lý tất cả exceptions


