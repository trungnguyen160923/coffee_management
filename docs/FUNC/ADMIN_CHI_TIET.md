# Chi Tiết Chức Năng ADMIN

## 📋 Tổng Quan
Tài liệu này mô tả chi tiết các chức năng của Admin, bao gồm file liên quan, hàm xử lý, logic nghiệp vụ và cách bắt lỗi.

---

## 1. Dashboard (`/admin`)

### Frontend Files
- `fe_coffee_manager/src/pages/admin/AdminDashboard.tsx`

### Backend Files
- `order-service/src/main/java/orderservice/order_service/controller/AnalyticsController.java`
- `order-service/src/main/java/orderservice/order_service/service/AnalyticsService.java`
- `ai-service/app/routers/statistics.py`

### Hàm Chính
- `AnalyticsService.getSystemStatistics()` - Thống kê toàn hệ thống
- `AnalyticsService.getBranchStatistics(branchId)` - Thống kê theo chi nhánh
- `getRevenueByPeriod(period)` - Doanh thu theo kỳ
- `getOrderStatistics()` - Thống kê đơn hàng

### Logic Nghiệp Vụ
1. Tổng hợp dữ liệu từ tất cả chi nhánh
2. Tính toán doanh thu, số đơn hàng, số khách hàng
3. So sánh với kỳ trước
4. Hiển thị biểu đồ và bảng thống kê

### Xử Lý Lỗi
- **UNAUTHORIZED** - Không có quyền ADMIN
- **DATA_NOT_AVAILABLE** - Không có dữ liệu

---

## 2. Quản Lý Sản Phẩm (`/admin/products`)

### Frontend Files
- `fe_coffee_manager/src/pages/admin/ProductManagement.tsx`

### Backend Files
- `catalog-service/src/main/java/com/service/catalog/controller/ProductController.java`
- `catalog-service/src/main/java/com/service/catalog/service/ProductService.java`

### Hàm Chính

#### Backend
- `ProductController.createProduct(request)` - Tạo sản phẩm
- `ProductController.updateProduct(id, request)` - Cập nhật
- `ProductController.deleteProduct(id)` - Xóa
- `ProductService.createProduct(request)` - Logic tạo
- `ProductService.updateProduct(id, request)` - Logic cập nhật
- `ProductService.deleteProduct(id)` - Logic xóa

### Logic Nghiệp Vụ
1. **Tạo sản phẩm:**
   - Validate SKU không trùng
   - Validate category tồn tại
   - Tạo Product entity
   - Tạo ProductDetail cho từng size
   - Validate giá > 0

2. **Cập nhật:**
   - Validate sản phẩm tồn tại
   - Cập nhật thông tin
   - Cập nhật ProductDetails nếu có

3. **Xóa:**
   - Kiểm tra sản phẩm có đơn hàng không
   - Nếu có: set active = false (soft delete)
   - Nếu không: xóa hoàn toàn

### Xử Lý Lỗi
- **PRODUCT_NOT_FOUND** - Sản phẩm không tồn tại
- **PRODUCT_SKU_ALREADY_EXISTS** - SKU đã tồn tại
- **CATEGORY_NOT_FOUND** - Danh mục không tồn tại
- **SIZE_NOT_FOUND** - Size không tồn tại
- **INVALID_PRICE** - Giá không hợp lệ
- **PRODUCT_HAS_ORDERS** - Sản phẩm đã có đơn hàng, không thể xóa
- **VALIDATION_FAILED** - Lỗi validation

---

## 3. Quản Lý Nguyên Liệu (`/admin/ingredients`)

### Frontend Files
- `fe_coffee_manager/src/pages/admin/IngredientManagement.tsx`

### Backend Files
- `catalog-service/src/main/java/com/service/catalog/controller/IngredientController.java`
- `catalog-service/src/main/java/com/service/catalog/service/IngredientService.java`

### Hàm Chính
- `IngredientController.createIngredient(request)` - Tạo nguyên liệu
- `IngredientController.updateIngredient(id, request)` - Cập nhật
- `IngredientController.deleteIngredient(id)` - Xóa
- `IngredientService.createIngredient(request)` - Logic tạo
- `IngredientService.updateIngredient(id, request)` - Logic cập nhật

### Logic Nghiệp Vụ
1. Validate tên nguyên liệu không trùng
2. Validate đơn vị tính tồn tại
3. Validate giá > 0
4. Lưu vào database

### Xử Lý Lỗi
- **INGREDIENT_NOT_FOUND** - Nguyên liệu không tồn tại
- **INGREDIENT_NAME_ALREADY_EXISTS** - Tên đã tồn tại
- **UNIT_NOT_FOUND** - Đơn vị tính không tồn tại
- **INVALID_PRICE** - Giá không hợp lệ
- **INGREDIENT_IN_USE** - Nguyên liệu đang được sử dụng trong công thức

---

## 4. Quản Lý Công Thức (`/admin/recipes`)

### Frontend Files
- `fe_coffee_manager/src/pages/admin/RecipeManagement.tsx`

### Backend Files
- `catalog-service/src/main/java/com/service/catalog/controller/RecipeController.java`
- `catalog-service/src/main/java/com/service/catalog/service/RecipeService.java`

### Hàm Chính
- `RecipeController.createRecipe(request)` - Tạo công thức
- `RecipeController.updateRecipe(id, request)` - Cập nhật
- `RecipeController.deleteRecipe(id)` - Xóa
- `RecipeService.createRecipe(request)` - Logic tạo
- `RecipeService.validateRecipeIngredients(ingredients)` - Validate nguyên liệu

### Logic Nghiệp Vụ
1. Validate sản phẩm tồn tại
2. Validate từng nguyên liệu tồn tại
3. Validate định lượng > 0
4. Tính tổng định lượng (phải = 100% hoặc logic khác)
5. Lưu công thức và recipe ingredients

### Xử Lý Lỗi
- **RECIPE_NOT_FOUND** - Công thức không tồn tại
- **PRODUCT_NOT_FOUND** - Sản phẩm không tồn tại
- **INGREDIENT_NOT_FOUND** - Nguyên liệu không tồn tại
- **INVALID_QUANTITY** - Định lượng không hợp lệ
- **RECIPE_QUANTITY_MISMATCH** - Tổng định lượng không đúng
- **VALIDATION_FAILED** - Lỗi validation

---

## 5. Quản Lý Giảm Giá (`/admin/discounts`)

### Frontend Files
- `fe_coffee_manager/src/pages/admin/DiscountManagement.tsx`

### Backend Files
- `order-service/src/main/java/orderservice/order_service/controller/DiscountController.java`
- `order-service/src/main/java/orderservice/order_service/service/DiscountService.java`

### Hàm Chính
- `DiscountController.createDiscount(request)` - Tạo mã giảm giá
- `DiscountController.updateDiscount(id, request)` - Cập nhật
- `DiscountController.deleteDiscount(id)` - Xóa
- `DiscountService.createDiscount(request)` - Logic tạo
- `DiscountService.validateDiscount(code, orderTotal)` - Validate mã

### Logic Nghiệp Vụ
1. Validate mã code không trùng
2. Validate thời gian (startDate < endDate)
3. Validate giá trị giảm giá (phần trăm hoặc số tiền)
4. Validate điều kiện (minOrderValue, maxUses, etc.)
5. Áp dụng cho toàn hệ thống

### Xử Lý Lỗi
- **DISCOUNT_NOT_FOUND** - Mã giảm giá không tồn tại
- **DISCOUNT_CODE_ALREADY_EXISTS** - Mã đã tồn tại
- **INVALID_DISCOUNT_DATE** - Thời gian không hợp lệ
- **INVALID_DISCOUNT_VALUE** - Giá trị giảm giá không hợp lệ
- **DISCOUNT_EXPIRED** - Mã đã hết hạn
- **VALIDATION_FAILED** - Lỗi validation

---

## 6. Quản Lý Chi Nhánh (`/admin/branches`)

### Frontend Files
- `fe_coffee_manager/src/pages/admin/BranchManagement.tsx`

### Backend Files
- `order-service/src/main/java/orderservice/order_service/controller/BranchController.java`
- `order-service/src/main/java/orderservice/order_service/service/BranchService.java`

### Hàm Chính
- `BranchController.createBranch(request)` - Tạo chi nhánh
- `BranchController.updateBranch(id, request)` - Cập nhật
- `BranchController.deleteBranch(id)` - Xóa
- `BranchService.createBranch(request)` - Logic tạo
- `BranchService.validateBranchAddress(address)` - Validate địa chỉ

### Logic Nghiệp Vụ
1. Validate thông tin chi nhánh (name, address, phone)
2. Validate địa chỉ (ward, district, province)
3. Validate tọa độ (latitude, longitude) nếu có
4. Lưu vào database

### Xử Lý Lỗi
- **BRANCH_NOT_FOUND** - Chi nhánh không tồn tại
- **BRANCH_NAME_ALREADY_EXISTS** - Tên chi nhánh đã tồn tại
- **INVALID_ADDRESS** - Địa chỉ không hợp lệ
- **BRANCH_HAS_ORDERS** - Chi nhánh đã có đơn hàng, không thể xóa
- **VALIDATION_FAILED** - Lỗi validation

---

## 7. Quản Lý Quản Lý (`/admin/managers`)

### Frontend Files
- `fe_coffee_manager/src/pages/admin/ManagerManagement.tsx`

### Backend Files
- `auth/src/main/java/com/service/auth/controller/UserV2Controller.java`
- `auth/src/main/java/com/service/auth/service/UserV2Service.java`
- `profile-service/src/main/java/com/service/profile/controller/ManagerProfileController.java`
- `profile-service/src/main/java/com/service/profile/service/ManagerProfileService.java`

### Hàm Chính
- `UserV2Controller.createManager(request)` - Tạo tài khoản manager
- `UserV2Controller.updateManager(id, request)` - Cập nhật
- `ManagerProfileController.getManagerProfile(id)` - Lấy thông tin HR
- `ManagerProfileController.updateManagerProfile(id, request)` - Cập nhật HR
- `UserV2Service.createManager(request)` - Logic tạo
- `ManagerProfileService.updateProfile(userId, request)` - Logic cập nhật HR

### Logic Nghiệp Vụ
1. **Tạo manager:**
   - Validate email không trùng
   - Tạo user với role MANAGER
   - Tạo manager_profile với branchId
   - Validate branch tồn tại
   - Gửi thông tin đăng nhập

2. **Cập nhật:**
   - Cập nhật thông tin user
   - Cập nhật thông tin HR (salary, insurance, etc.)

3. **Phân công chi nhánh:**
   - Validate manager chưa có chi nhánh hoặc cho phép thay đổi
   - Cập nhật branchId trong manager_profile

### Xử Lý Lỗi
- **USER_NOT_FOUND** - Manager không tồn tại
- **EMAIL_ALREADY_EXISTS** - Email đã tồn tại
- **BRANCH_NOT_FOUND** - Chi nhánh không tồn tại
- **MANAGER_ALREADY_ASSIGNED** - Manager đã được phân công
- **VALIDATION_FAILED** - Lỗi validation

---

## 8. Quản Lý Nhà Cung Cấp (`/admin/suppliers`)

### Frontend Files
- `fe_coffee_manager/src/pages/admin/SupplierManagement.tsx`

### Backend Files
- `catalog-service/src/main/java/com/service/catalog/controller/SupplierController.java`
- `catalog-service/src/main/java/com/service/catalog/service/SupplierService.java`

### Hàm Chính
- `SupplierController.createSupplier(request)` - Tạo nhà cung cấp
- `SupplierController.updateSupplier(id, request)` - Cập nhật
- `SupplierController.deleteSupplier(id)` - Xóa
- `SupplierService.createSupplier(request)` - Logic tạo

### Logic Nghiệp Vụ
1. Validate thông tin (name, contact, address)
2. Validate email, phone format
3. Lưu vào database

### Xử Lý Lỗi
- **SUPPLIER_NOT_FOUND** - Nhà cung cấp không tồn tại
- **SUPPLIER_NAME_ALREADY_EXISTS** - Tên đã tồn tại
- **INVALID_EMAIL** - Email không hợp lệ
- **INVALID_PHONE** - Số điện thoại không hợp lệ
- **SUPPLIER_HAS_PURCHASE_ORDERS** - Đã có đơn mua hàng, không thể xóa

---

## 9. Quản Lý Lương (`/admin/payroll`)

### Frontend Files
- `fe_coffee_manager/src/pages/admin/AdminPayrollManagement.tsx`

### Backend Files
- `profile-service/src/main/java/com/service/profile/controller/PayrollController.java`
- `profile-service/src/main/java/com/service/profile/service/PayrollService.java`

### Hàm Chính
- `PayrollController.calculatePayroll(request)` - Tính lương
- `PayrollController.calculatePayrollBatch(request)` - Tính lương hàng loạt
- `PayrollController.getPayrolls(filters)` - Lấy danh sách
- `PayrollController.approvePayroll(id)` - Duyệt lương
- `PayrollController.markPayrollAsPaid(id)` - Đánh dấu đã thanh toán
- `PayrollService.calculatePayroll(request, userId, role)` - Logic tính lương
- `PayrollService.calculateShiftWorkSummary(userId, period)` - Tính công ca làm việc
- `PayrollService.approvePayroll(id, userId, role)` - Logic duyệt

### Logic Nghiệp Vụ
1. **Tính lương:**
   - Lấy thông tin profile (staff hoặc manager)
   - Tính base salary hoặc hourly rate
   - Tính công ca làm việc trong kỳ
   - Tính overtime (nếu có)
   - Tính allowances, bonuses, penalties
   - Tính bảo hiểm (BHXH, BHYT, BHTN)
   - Tính thuế TNCN
   - Tính tổng lương thực nhận

2. **Duyệt lương:**
   - Chỉ ADMIN mới duyệt được
   - Cập nhật status = APPROVED
   - Gửi notification

3. **Đánh dấu đã thanh toán:**
   - Chỉ ADMIN mới thực hiện
   - Cập nhật status = PAID
   - Ghi nhận ngày thanh toán

### Xử Lý Lỗi
- **PAYROLL_NOT_FOUND** - Payroll không tồn tại
- **PAYROLL_ALREADY_EXISTS** - Payroll đã tồn tại cho kỳ này
- **USER_ID_NOT_FOUND** - Nhân viên không tồn tại
- **PAYROLL_ALREADY_APPROVED** - Đã được duyệt
- **PAYROLL_ALREADY_PAID** - Đã được thanh toán
- **INVALID_PERIOD** - Kỳ lương không hợp lệ
- **UNAUTHORIZED** - Không có quyền ADMIN

---

## 10. Mẫu Lương (`/admin/payroll-templates`)

### Frontend Files
- `fe_coffee_manager/src/pages/admin/AdminPayrollTemplates.tsx`

### Backend Files
- `profile-service/src/main/java/com/service/profile/controller/BonusTemplateController.java`
- `profile-service/src/main/java/com/service/profile/controller/AllowanceTemplateController.java`
- `profile-service/src/main/java/com/service/profile/controller/PenaltyConfigController.java`
- `profile-service/src/main/java/com/service/profile/service/BonusTemplateService.java`
- `profile-service/src/main/java/com/service/profile/service/AllowanceTemplateService.java`
- `profile-service/src/main/java/com/service/profile/service/PenaltyConfigService.java`

### Hàm Chính
- `BonusTemplateController.createTemplate(request)` - Tạo mẫu thưởng
- `AllowanceTemplateController.createTemplate(request)` - Tạo mẫu phụ cấp
- `PenaltyConfigController.createConfig(request)` - Tạo cấu hình phạt
- `BonusTemplateService.createTemplate(request)` - Logic tạo
- `AllowanceTemplateService.createTemplate(request)` - Logic tạo
- `PenaltyConfigService.createConfig(request)` - Logic tạo

### Logic Nghiệp Vụ
1. Tạo mẫu hệ thống (áp dụng cho tất cả chi nhánh)
2. Validate tên mẫu không trùng
3. Validate giá trị (phần trăm hoặc số tiền)
4. Lưu vào database

### Xử Lý Lỗi
- **TEMPLATE_NOT_FOUND** - Mẫu không tồn tại
- **TEMPLATE_NAME_ALREADY_EXISTS** - Tên mẫu đã tồn tại
- **INVALID_TEMPLATE_VALUE** - Giá trị không hợp lệ
- **VALIDATION_FAILED** - Lỗi validation

---

## 11. Báo Cáo Lương (`/admin/payroll-reports`)

### Frontend Files
- `fe_coffee_manager/src/pages/admin/AdminPayrollReports.tsx`

### Backend Files
- `profile-service/src/main/java/com/service/profile/controller/PayrollController.java`
- `profile-service/src/main/java/com/service/profile/service/PayrollService.java`

### Hàm Chính
- `PayrollController.getPayrolls(filters)` - Lấy danh sách với filter
- `PayrollService.getPayrolls(userId, branchId, period, status)` - Logic lấy
- `exportPayrollsToExcel(filters)` - Xuất Excel

### Logic Nghiệp Vụ
1. Filter theo branch, period, status
2. Tính tổng hợp (tổng lương, số nhân viên)
3. Xuất Excel với nhiều format (chi tiết, tổng hợp)
4. So sánh giữa các chi nhánh

### Xử Lý Lỗi
- **NO_DATA_FOUND** - Không có dữ liệu
- **INVALID_FILTER** - Filter không hợp lệ
- **EXPORT_FAILED** - Lỗi xuất file

---

## 12. Thống Kê (`/admin/statistics`)

### Frontend Files
- `fe_coffee_manager/src/pages/admin/AIStatistics.tsx`

### Backend Files
- `ai-service/app/routers/statistics.py`
- `order-service/src/main/java/orderservice/order_service/service/AnalyticsService.java`
- `catalog-service/src/main/java/com/service/catalog/service/AnalyticsService.java`

### Hàm Chính
- `getSystemStatistics()` - Thống kê toàn hệ thống
- `getRevenueStatistics(period)` - Thống kê doanh thu
- `getProductStatistics()` - Thống kê sản phẩm
- `getBranchComparison()` - So sánh chi nhánh
- `getAIPredictions()` - Dự đoán AI

### Logic Nghiệp Vụ
1. Tổng hợp dữ liệu từ tất cả services
2. Tính toán các chỉ số (revenue, orders, customers)
3. Phân tích xu hướng
4. Dự đoán bằng AI
5. Hiển thị biểu đồ và báo cáo

### Xử Lý Lỗi
- **DATA_NOT_AVAILABLE** - Không có dữ liệu
- **INVALID_PERIOD** - Kỳ không hợp lệ
- **AI_SERVICE_ERROR** - Lỗi service AI

---

## 13. Hoạt Động Chi Nhánh (`/admin/branch-activities`)

### Frontend Files
- `fe_coffee_manager/src/pages/admin/AdminBranchActivities.tsx`

### Backend Files
- `order-service/src/main/java/orderservice/order_service/controller/AnalyticsController.java`
- `order-service/src/main/java/orderservice/order_service/service/AnalyticsService.java`

### Hàm Chính
- `AnalyticsController.getBranchActivities(branchId)` - Lấy hoạt động
- `AnalyticsService.getBranchActivities(branchId)` - Logic lấy
- `getBranchPerformance(branchId)` - Hiệu suất chi nhánh

### Logic Nghiệp Vụ
1. Lấy đơn hàng, đặt bàn, doanh thu của chi nhánh
2. Tính các chỉ số hiệu suất
3. So sánh với mục tiêu
4. Hiển thị timeline hoạt động

### Xử Lý Lỗi
- **BRANCH_NOT_FOUND** - Chi nhánh không tồn tại
- **NO_ACTIVITY_DATA** - Không có dữ liệu hoạt động

---

## 📝 Tổng Kết Xử Lý Lỗi

### Authorization
- Tất cả endpoints yêu cầu role ADMIN
- Sử dụng `@PreAuthorize("hasRole('ADMIN')")`
- Throw `AppException(ErrorCode.UNAUTHORIZED)` nếu không có quyền

### Validation
- Sử dụng `@Valid` và Bean Validation
- Custom validation cho logic phức tạp
- Throw `AppException(ErrorCode.VALIDATION_FAILED)`

### Business Logic Errors
- Sử dụng `AppException` với `ErrorCode` cụ thể
- Mỗi service có `ErrorCode` enum riêng
- `GlobalExceptionHandler` xử lý tất cả exceptions


