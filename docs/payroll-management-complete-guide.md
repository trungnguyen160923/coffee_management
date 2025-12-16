# Hệ Thống Quản Lý Lương, Thưởng, Phạt - Hướng Dẫn Đầy Đủ

## 📋 Mục Lục

1. [Tổng Quan](#1-tổng-quan)
2. [Phân Quyền](#2-phân-quyền)
3. [Công Thức Tính Lương](#3-công-thức-tính-lương)
4. [Logic Tính Overtime](#4-logic-tính-overtime)
5. [Database Schema](#5-database-schema)
6. [API Endpoints](#6-api-endpoints)
7. [Workflow & Luồng Xử Lý](#7-workflow--luồng-xử-lý)
8. [Tinh Chỉnh Nghiệp Vụ](#8-tinh-chỉnh-nghiệp-vụ)
9. [Phân Tích Overtime Logic](#9-phân-tích-overtime-logic)

---

## 1. Tổng Quan

### 1.1. Mục Tiêu
- Quản lý lương, thưởng, phạt cho nhân viên (Staff) và quản lý (Manager)
- Phân quyền rõ ràng: Manager quản lý Staff, Admin quản lý Manager
- Tính toán lương tự động dựa trên ca làm việc, thưởng, phạt
- Phù hợp với thực tế vận hành doanh nghiệp tại Việt Nam

### 1.2. Đặc Thù Quán Cà Phê
- Full-time làm theo ca (sáng/chiều/tối) - không có "giờ hành chính"
- Mỗi ca có `duration_hours` cố định (6h, 7h, 8h...)
- **OT xảy ra khi tổng giờ làm trong ngày vượt quá giới hạn quy định** (ví dụ: quy định 8h/ngày, nhưng làm 2 ca = 12h → OT = 4h)

---

## 2. Phân Quyền

### 2.1. Manager
**Quản lý lương Staff trong branch của mình:**
- ✅ Tính/duyệt lương Staff trong branch của mình
- ✅ Tạo bonus/penalty/allowance cho Staff (có thể dùng template từ Admin hoặc custom)
- ✅ Apply template từ Admin cho Staff
- ✅ Xem danh sách payroll của Staff trong branch
- ✅ Xem danh sách templates (SYSTEM và BRANCH của mình)
- ❌ Không quản lý Manager khác
- ❌ Không quản lý Staff ở branch khác
- ❌ Không tạo/sửa/xóa templates (chỉ Admin)

**Validation:**
```java
if (currentUserRole == MANAGER) {
    if (targetUserRole != STAFF) throw ACCESS_DENIED;
    if (targetUserBranchId != currentManagerBranchId) throw ACCESS_DENIED;
}
```

### 2.2. Admin
**Quản lý lương Manager (toàn bộ chuỗi):**
- ✅ Tính/duyệt lương Manager và Staff
- ✅ Đánh dấu payroll đã thanh toán (PAID)
- ✅ Xem tất cả payroll
- ✅ Tạo bonus/penalty/allowance cho Manager hoặc Staff
- ✅ **Tạo/quản lý templates** (SYSTEM và BRANCH scope)
- ✅ Manager có thể apply templates này cho Staff

### 2.3. Staff
**Chỉ xem lương của chính mình:**
- ✅ Xem payroll của chính mình
- ❌ Không tạo/sửa/xóa payroll

---

## 3. Công Thức Tính Lương

### 3.1. Công Thức Tổng Quát

```
Gross Salary = Base Salary + Overtime Pay + Allowances + Bonuses

Total Deductions = Amount Insurances + Amount Tax + Amount Advances
Net Salary = Gross Salary - Total Deductions - Penalties
```

### 3.2. Tính Base Salary

#### Part-time (pay_type = 'HOURLY'):
```
Base Salary = Σ(actual_hours từ shifts) × hourly_rate
```
- Chỉ tính shifts có `status = 'CHECKED_OUT'` (đã hoàn thành)
- Lấy `actual_hours` từ `shift_assignments.actual_hours`
- Nếu `actual_hours` NULL → tính từ `checked_in_at` và `checked_out_at`

#### Full-time (pay_type = 'MONTHLY'):
```
Base Salary = base_salary (lương cứng)
```

**Xử lý nghỉ phép:**
- Lương 1 ngày = base_salary / 26 (số ngày công chuẩn)
- Nghỉ không phép → Tạo Penalty loại `UNPAID_LEAVE`
- Nghỉ có phép → Không trừ lương

### 3.3. Tính Overtime Pay

Xem chi tiết ở [mục 4](#4-logic-tính-overtime)

### 3.4. Các Thành Phần Khác

#### Allowances (Phụ cấp):
- Tổng các allowance có `status = 'ACTIVE'` trong kỳ
- Loại: MEAL, TRANSPORT, PHONE, ROLE, OTHER

#### Bonuses (Thưởng):
- Tổng các bonus có `status = 'APPROVED'` trong kỳ
- Loại: PERFORMANCE, STORE_TARGET, HOLIDAY, REFERRAL, SPECIAL

#### Penalties (Phạt):
- Tổng các penalty có `status = 'APPROVED'` trong kỳ
- Tự động tạo khi Manager đánh dấu NO_SHOW
- Tự động hủy khi sửa NO_SHOW → COMPLETED (nếu payroll chưa APPROVED)
- Loại: LATE, NO_SHOW, EARLY_LEAVE, VIOLATION, UNPAID_LEAVE, OTHER

#### Deductions (Khấu trừ):

**Amount Insurances:** 10.5% của `insurance_salary` (không phải base_salary)
- BHXH: 8%
- BHYT: 1.5%
- BHTN: 1%

**Amount Tax:** Thuế TNCN (tính theo bậc với giảm trừ gia cảnh)
- Giảm trừ bản thân: 11tr/tháng
- Giảm trừ người phụ thuộc: 4.4tr/người
- Bậc thuế: 5% → 10% → 15% → 20% → 25% → 30% → 35%

**Amount Advances:** Ứng lương (nếu có)

**Total Deductions:** = Insurances + Tax + Advances

---

## 4. Logic Tính Overtime

### 4.1. Phân Tích Logic OT Hiện Tại

#### ✅ Điểm Mạnh:
- **Validation tốt:** Đã có giới hạn OT hợp lý (40h/tuần + 12h OT = 52h/tuần)
- **Dữ liệu đầy đủ:** `actual_hours`, `duration_hours`, `overtime_rate` đã có
- **Tính toán chính xác:** `actual_hours` được tính từ check-in/check-out

#### ❌ Điểm Yếu:
- **Chưa tính OT pay:** Chỉ validate, chưa tính tiền
- **Chưa phân biệt Full-time vs Part-time:** Cần logic khác nhau
- **Chưa phân biệt ngày thường/cuối tuần/lễ:** Cần hệ số khác nhau

### 4.2. Logic OT Cho Quán Cà Phê

#### Tính Overtime Hours:

**Ngày thường (shift_type = 'NORMAL'):**
```
Tổng giờ làm trong ngày = Σ(actual_hours của tất cả ca trong ngày)
Overtime Hours = max(0, Tổng giờ làm - MAX_DAILY_HOURS)
```
- MAX_DAILY_HOURS = 8h/ngày (quy định lao động)
- OT chỉ tính khi tổng giờ làm > 8h

**Ngày nghỉ/lễ (shift_type = 'WEEKEND' hoặc 'HOLIDAY'):**
```
Overtime Hours = actual_hours (toàn bộ giờ làm là OT)
```

**Ví dụ:**
- Ngày thường: Ca sáng 6h + Ca chiều 6h = 12h → OT = 12h - 8h = 4h
- Ngày thường: Ca sáng 6h + Ca tối 2h = 8h → OT = 0h (không vượt quá 8h)
- Ngày lễ: Làm 1 ca 6h → OT = 6h (toàn bộ)

#### Tính Overtime Pay:

**Part-time (pay_type = 'HOURLY'):**
```
OT Pay = OT Hours × hourly_rate × overtime_rate × multiplier
```

**Full-time (pay_type = 'MONTHLY'):**
```
Hourly Rate = base_salary / (26 ngày × 8 giờ)
OT Pay = OT Hours × hourly_rate × overtime_rate × multiplier
```

#### Hệ số theo ngày (multiplier):
- **Ngày thường:** 1.5x (overtime_rate mặc định)
- **Cuối tuần:** 2.0x (1.5 × 1.33)
- **Lễ/Tết:** 3.0x (1.5 × 2.0)

### 4.3. Code Example

```java
/**
 * Tính tổng overtime hours trong một ngày
 * OT = Tổng giờ làm trong ngày - MAX_DAILY_HOURS (8h)
 */
public BigDecimal calculateOvertimeHoursForDay(Integer userId, LocalDate date) {
    // Lấy tất cả ca đã hoàn thành trong ngày
    List<ShiftAssignment> completedShifts = shiftAssignmentRepository
        .findByStaffUserIdAndShiftDateAndStatus(userId, date, "CHECKED_OUT");
    
    // Tính tổng giờ làm thực tế trong ngày
    BigDecimal totalHoursInDay = completedShifts.stream()
        .map(sa -> sa.getActualHours() != null ? sa.getActualHours() : BigDecimal.ZERO)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
    
    // Kiểm tra shift_type của ca đầu tiên (giả sử tất cả ca trong ngày cùng loại)
    Shift firstShift = completedShifts.isEmpty() ? null : completedShifts.get(0).getShift();
    String shiftType = firstShift != null ? firstShift.getShiftType() : "NORMAL";
    
    if ("WEEKEND".equals(shiftType) || "HOLIDAY".equals(shiftType)) {
        // Làm ngày nghỉ/lễ: Toàn bộ giờ làm là OT
        return totalHoursInDay;
    } else {
        // Ngày thường: OT = Tổng giờ làm - 8h (nếu > 0)
        BigDecimal overtime = totalHoursInDay.subtract(MAX_DAILY_HOURS);
        return overtime.compareTo(BigDecimal.ZERO) > 0 ? overtime : BigDecimal.ZERO;
    }
}

/**
 * Tính tổng overtime hours trong kỳ lương
 */
public BigDecimal calculateOvertimeHoursForPeriod(Integer userId, String period) {
    // Parse period (YYYY-MM) thành YearMonth
    YearMonth yearMonth = YearMonth.parse(period);
    LocalDate startDate = yearMonth.atDay(1);
    LocalDate endDate = yearMonth.atEndOfMonth();
    
    BigDecimal totalOvertime = BigDecimal.ZERO;
    
    // Tính OT cho từng ngày trong kỳ
    LocalDate currentDate = startDate;
    while (!currentDate.isAfter(endDate)) {
        BigDecimal dayOvertime = calculateOvertimeHoursForDay(userId, currentDate);
        totalOvertime = totalOvertime.add(dayOvertime);
        currentDate = currentDate.plusDays(1);
    }
    
    return totalOvertime;
}

private BigDecimal getOvertimeMultiplier(LocalDate shiftDate, BigDecimal baseRate) {
    DayOfWeek dayOfWeek = shiftDate.getDayOfWeek();
    
    // Cuối tuần (Thứ 7, CN)
    if (dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY) {
        return baseRate.multiply(BigDecimal.valueOf(1.33)); // ≈ 2.0x
    }
    
    // Ngày lễ (check từ bảng holidays)
    if (isHoliday(shiftDate)) {
        return baseRate.multiply(BigDecimal.valueOf(2.0)); // 3.0x
    }
    
    // Ngày thường
    return baseRate; // 1.5x
}
```

---

## 5. Database Schema

### 5.0. Template System - Hệ Thống Mẫu (Mới)

#### ⚠️ Phân Tích 3NF:

**Vấn đề tiềm ẩn:**
- `scope` và `branch_id` có mối quan hệ business rule:
  - Nếu `scope = 'SYSTEM'` → `branch_id = NULL`
  - Nếu `scope = 'BRANCH'` → `branch_id` phải có giá trị
- Điều này có thể được coi là functional dependency: `scope` có thể được suy ra từ `branch_id`

**Giải pháp để đạt 3NF hoàn toàn:**

**Option 1: Loại bỏ `scope` (Recommended)**
- `scope` là derived field: có thể tính từ `branch_id`
- `branch_id = NULL` → SYSTEM scope
- `branch_id != NULL` → BRANCH scope
- **Ưu điểm:** Đạt 3NF hoàn toàn, không duplicate
- **Nhược điểm:** Logic phức tạp hơn một chút (cần check NULL)

**Option 2: Loại bỏ `branch_id` (Không khuyến nghị)**
- Chỉ dùng `scope`, không dùng `branch_id`
- **Nhược điểm:** Mất thông tin branch cụ thể cho BRANCH scope

**Option 3: Giữ nguyên (Chấp nhận business rule)**
- Trong thực tế, nhiều hệ thống chấp nhận business rule này
- `scope` và `branch_id` là 2 attributes độc lập về mặt kỹ thuật
- **Ưu điểm:** Rõ ràng, dễ query
- **Nhược điểm:** Có thể vi phạm 3NF nhẹ (nhưng chấp nhận được)

**Khuyến nghị:** **Option 1** - Loại bỏ `scope`, tính từ `branch_id`

#### Thiết Kế Template System:
**Mục tiêu:** Admin tạo các mức lương, thưởng, phạt mẫu chung cho toàn bộ chi nhánh, Manager có thể áp dụng hoặc custom riêng.

**Cấu trúc:**
- **Allowance Templates**: Phụ cấp mẫu (ví dụ: Phụ cấp ăn trưa 30k/ngày, Phụ cấp xăng 200k/tháng)
- **Bonus Templates**: Thưởng mẫu (ví dụ: Thưởng hiệu suất 500k, Thưởng đạt chỉ tiêu 1tr)
- **Penalty Templates**: Phạt mẫu (mở rộng từ `penalty_config`, thêm `branch_id` và `scope`)

**Phạm vi (Scope) - Tính từ `branch_id`:**
- `SYSTEM`: `branch_id = NULL` → Áp dụng cho toàn bộ hệ thống (tất cả branch)
- `BRANCH`: `branch_id != NULL` → Áp dụng cho branch cụ thể
- `CUSTOM`: Manager tự tạo, không dùng template (`source_template_id = NULL`)

**Lý do thiết kế:**
- **Đạt 3NF:** Không lưu `scope` (derived field), tính từ `branch_id`
- **Logic:** `branch_id = NULL` → SYSTEM, `branch_id != NULL` → BRANCH
- **Query:** `WHERE branch_id IS NULL` (SYSTEM) hoặc `WHERE branch_id = ?` (BRANCH)

**Workflow:**
1. Admin tạo template (SYSTEM hoặc BRANCH scope)
2. Manager có thể:
   - **Apply template**: Sử dụng template từ Admin (tạo bonus/penalty/allowance từ template)
   - **Custom**: Tạo riêng không dùng template (source_template_id = NULL)
   - **Override**: Sử dụng template nhưng điều chỉnh amount/description

#### Bảng Template:

```sql
-- Allowance Templates (Đạt 3NF: scope tính từ branch_id)
CREATE TABLE allowance_templates (
  template_id INT PRIMARY KEY AUTO_INCREMENT,
  branch_id INT DEFAULT NULL 
    COMMENT 'NULL = SYSTEM scope (toàn bộ), có giá trị = BRANCH scope',
  name VARCHAR(100) NOT NULL,
  allowance_type ENUM('MEAL', 'TRANSPORT', 'PHONE', 'ROLE', 'OTHER') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT NOT NULL,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_branch_id (branch_id),
  KEY idx_is_active (is_active)
);

-- Bonus Templates (Đạt 3NF: scope tính từ branch_id)
CREATE TABLE bonus_templates (
  template_id INT PRIMARY KEY AUTO_INCREMENT,
  branch_id INT DEFAULT NULL 
    COMMENT 'NULL = SYSTEM scope, có giá trị = BRANCH scope',
  name VARCHAR(100) NOT NULL,
  bonus_type ENUM('PERFORMANCE', 'STORE_TARGET', 'HOLIDAY', 'REFERRAL', 'SPECIAL') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  criteria_ref VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT NOT NULL,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_branch_id (branch_id),
  KEY idx_is_active (is_active)
);

-- Penalty Templates (Mở rộng từ penalty_config, đạt 3NF)
-- Scope tính từ branch_id: NULL = SYSTEM, có giá trị = BRANCH
ALTER TABLE penalty_config 
  ADD COLUMN branch_id INT DEFAULT NULL 
    COMMENT 'NULL = SYSTEM scope, có giá trị = BRANCH scope',
  ADD COLUMN created_by INT DEFAULT NULL 
    COMMENT 'Admin user_id',
  ADD KEY idx_branch_id (branch_id);
```

#### Cập Nhật Bảng Hiện Có:

```sql
-- Thêm source_template_id để track template được sử dụng
ALTER TABLE allowances 
  ADD COLUMN source_template_id INT DEFAULT NULL 
    COMMENT 'ID của template được sử dụng (NULL = custom)',
  ADD KEY idx_source_template (source_template_id);

ALTER TABLE bonuses 
  ADD COLUMN source_template_id INT DEFAULT NULL,
  ADD KEY idx_source_template (source_template_id);

ALTER TABLE penalties 
  ADD COLUMN source_template_id INT DEFAULT NULL,
  ADD KEY idx_source_template (source_template_id);
```

#### Logic Sử Dụng Template:

**1. Manager Apply Template:**
```java
// Manager chọn template và apply cho staff
public Bonus createBonusFromTemplate(Integer templateId, Integer userId, String period) {
    BonusTemplate template = bonusTemplateRepository.findById(templateId)
        .orElseThrow(() -> new AppException(ErrorCode.TEMPLATE_NOT_FOUND));
    
    // Validate: Manager chỉ có thể dùng template của branch mình hoặc SYSTEM (branch_id = NULL)
    validateTemplateAccess(currentManagerBranchId, template);
    
    // Logic: scope = SYSTEM nếu branch_id = NULL, BRANCH nếu branch_id != NULL
    
    // Tạo bonus từ template
    Bonus bonus = Bonus.builder()
        .userId(userId)
        .bonusType(template.getBonusType())
        .amount(template.getAmount()) // Có thể override
        .description(template.getDescription())
        .sourceTemplateId(templateId) // Track template được dùng
        .status(Bonus.BonusStatus.PENDING)
        .build();
    
    return bonusRepository.save(bonus);
}
```

**2. Manager Custom (Không dùng template):**
```java
// Manager tạo riêng, source_template_id = NULL
public Bonus createCustomBonus(BonusCreationRequest request) {
    Bonus bonus = Bonus.builder()
        .userId(request.getUserId())
        .bonusType(Bonus.BonusType.valueOf(request.getBonusType()))
        .amount(request.getAmount())
        .description(request.getDescription())
        .sourceTemplateId(null) // Custom, không dùng template
        .status(Bonus.BonusStatus.PENDING)
        .build();
    
    return bonusRepository.save(bonus);
}
```

**3. Admin Quản Lý Templates:**
- Tạo template SYSTEM (toàn bộ branch)
- Tạo template BRANCH (cho branch cụ thể)
- Manager chỉ có thể xem và apply templates của branch mình hoặc SYSTEM

---

### 5.1. Cập Nhật Bảng Hiện Có

#### `manager_profiles`:
```sql
base_salary DECIMAL(12,2) - Lương cơ bản
insurance_salary DECIMAL(12,2) - Lương đóng BH
overtime_rate DECIMAL(12,2) - Hệ số tăng ca
number_of_dependents INT - Số người phụ thuộc
```

#### `staff_profiles`:
```sql
insurance_salary DECIMAL(12,2) - Lương đóng BH
number_of_dependents INT - Số người phụ thuộc
```

#### `shifts`:
```sql
shift_type ENUM('NORMAL', 'WEEKEND', 'HOLIDAY', 'OVERTIME') - Loại ca
```

### 5.2. Bảng Mới

#### `payrolls` - Bảng lương chính
- Lưu thông tin lương hàng tháng
- Có snapshot fields (audit trail)
- Tách rõ deductions: `amount_insurances`, `amount_tax`, `amount_advances`
- Workflow: DRAFT → REVIEW → APPROVED → PAID
- Unique constraint: mỗi nhân viên chỉ có 1 payroll mỗi kỳ

#### `bonuses` - Thưởng
- Loại: PERFORMANCE, STORE_TARGET, HOLIDAY, REFERRAL, SPECIAL
- Status: PENDING → APPROVED/REJECTED

#### `penalties` - Phạt
- Loại: LATE, NO_SHOW, EARLY_LEAVE, VIOLATION, UNPAID_LEAVE, OTHER
- `created_by = 0` = System tự động
- Liên kết với `shift_id` nếu có

#### `allowances` - Phụ cấp
- Loại: MEAL, TRANSPORT, PHONE, ROLE, OTHER
- Status: ACTIVE/INACTIVE

#### `penalty_config` - Cấu hình mức phạt (Tùy chọn)
- Lưu mức phạt mặc định
- Có dữ liệu mẫu

#### `holidays` - Ngày lễ (Tùy chọn)
- Để tính OT hệ số cao
- Có dữ liệu mẫu ngày lễ

**Xem chi tiết trong file:** `sql/profile_db.sql`

---

## 6. API Endpoints

### 6.1. Payroll Management

```
POST   /api/payrolls/calculate          - Tính lương cho nhân viên
POST   /api/payrolls/calculate-batch     - Tính lương cho nhiều nhân viên (batch)
GET    /api/payrolls                     - Lấy danh sách payroll (có filter)
GET    /api/payrolls/{payrollId}         - Lấy chi tiết payroll
PUT    /api/payrolls/{payrollId}/approve - Duyệt payroll
PUT    /api/payrolls/approve-batch       - Duyệt nhiều payroll (batch)
PUT    /api/payrolls/{payrollId}/pay     - Đánh dấu đã thanh toán (Admin only)
```

### 6.2. Bonus Management

```
POST   /api/bonuses                      - Tạo bonus
GET    /api/bonuses                     - Lấy danh sách bonus (có filter)
GET    /api/bonuses/{bonusId}           - Lấy chi tiết bonus
PUT    /api/bonuses/{bonusId}/approve   - Duyệt bonus
PUT    /api/bonuses/{bonusId}/reject    - Từ chối bonus
DELETE /api/bonuses/{bonusId}           - Xóa bonus (chỉ khi PENDING)
```

### 6.3. Penalty Management

```
POST   /api/penalties                    - Tạo penalty
GET    /api/penalties                   - Lấy danh sách penalty (có filter)
GET    /api/penalties/{penaltyId}       - Lấy chi tiết penalty
PUT    /api/penalties/{penaltyId}/approve - Duyệt penalty
PUT    /api/penalties/{penaltyId}/reject - Từ chối penalty
DELETE /api/penalties/{penaltyId}       - Xóa penalty (chỉ khi PENDING)
```

### 6.4. Allowance Management

```
POST   /api/allowances                  - Tạo allowance (custom hoặc từ template)
GET    /api/allowances                  - Lấy danh sách allowance (có filter)
GET    /api/allowances/{allowanceId}    - Lấy chi tiết allowance
PUT    /api/allowances/{allowanceId}    - Cập nhật allowance
DELETE /api/allowances/{allowanceId}   - Xóa allowance
```

### 6.5. Template Management (Admin Only)

#### Allowance Templates:
```
POST   /api/allowance-templates         - Tạo allowance template (Admin)
GET    /api/allowance-templates        - Lấy danh sách templates (có filter: scope, branch_id)
GET    /api/allowance-templates/{templateId} - Lấy chi tiết template
PUT    /api/allowance-templates/{templateId} - Cập nhật template (Admin)
DELETE /api/allowance-templates/{templateId} - Xóa template (Admin)
POST   /api/allowances/apply-template   - Apply template cho staff (Manager)
```

#### Bonus Templates:
```
POST   /api/bonus-templates             - Tạo bonus template (Admin)
GET    /api/bonus-templates             - Lấy danh sách templates (có filter)
GET    /api/bonus-templates/{templateId} - Lấy chi tiết template
PUT    /api/bonus-templates/{templateId} - Cập nhật template (Admin)
DELETE /api/bonus-templates/{templateId} - Xóa template (Admin)
POST   /api/bonuses/apply-template      - Apply template cho staff (Manager)
```

#### Penalty Templates (penalty_config):
```
POST   /api/penalty-configs             - Tạo penalty config (Admin)
GET    /api/penalty-configs             - Lấy danh sách configs (có filter: scope, branch_id)
GET    /api/penalty-configs/{configId}  - Lấy chi tiết config
PUT    /api/penalty-configs/{configId}  - Cập nhật config (Admin)
DELETE /api/penalty-configs/{configId}  - Xóa config (Admin)
POST   /api/penalties/apply-template    - Apply template cho staff (Manager)
```

---

## 7. Workflow & Luồng Xử Lý

### 7.1. Workflow Payroll

```
1. Tính lương → Status: DRAFT
2. Manager/Admin review → Status: REVIEW
3. Manager/Admin approve → Status: APPROVED
4. Admin thanh toán → Status: PAID
```

### 7.2. Luồng Tính Lương Hàng Tháng

```
1. Manager/Admin chọn nhân viên và kỳ lương (YYYY-MM)
2. Hệ thống tự động:
   - Lấy base salary từ profile
   - Tính overtime từ shift_assignments
   - Tính tổng allowances (ACTIVE)
   - Tính tổng bonuses (APPROVED)
   - Tính tổng penalties (APPROVED)
   - Tính deductions (BHXH, BHYT, BHTN, thuế)
   - Tính net salary
3. Tạo payroll với status = DRAFT
4. Manager/Admin review và approve
5. Admin đánh dấu PAID sau khi thanh toán
```

### 7.3. Luồng Tạo Thưởng/Phạt

#### Option 1: Apply Template (Manager)
```
1. Manager xem danh sách templates (SYSTEM + BRANCH của mình)
2. Manager chọn template và apply cho Staff
3. Hệ thống tạo bonus/penalty/allowance từ template
4. Manager có thể override amount/description nếu cần
5. Status mặc định = PENDING
6. Sau khi approve → được tính vào payroll
```

#### Option 2: Custom (Manager/Admin)
```
1. Manager/Admin tạo bonus/penalty/allowance custom (không dùng template)
2. source_template_id = NULL
3. Status mặc định = PENDING
4. Nếu Manager tạo → cần Admin duyệt (nếu vượt ngưỡng)
5. Nếu Admin tạo → có thể tự approve
6. Sau khi approve → được tính vào payroll
```

#### Option 3: Admin Tạo Template
```
1. Admin tạo template (SYSTEM hoặc BRANCH scope)
2. Template được lưu vào allowance_templates/bonus_templates/penalty_config
3. Manager có thể xem và apply template này
```

### 7.4. Event-Driven Penalty

**Flow xử lý:**
1. Manager đánh dấu Shift là NO_SHOW cho nhân viên
2. Shift Service bắn Event: `StaffAbsentEvent`
3. Payroll Service lắng nghe Event
4. Tự động tạo penalty với:
   - `penalty_type`: NO_SHOW
   - `amount`: Lấy từ `penalty_config`
   - `status`: PENDING (để Manager confirm)
   - `created_by`: 0 (System)

**Xử lý khi sửa NO_SHOW:**
- Nếu payroll chưa APPROVED → Tự động hủy penalty tương ứng
- Nếu payroll đã APPROVED → Không cho phép sửa assignment status

---

## 8. Tinh Chỉnh Nghiệp Vụ

### 8.1. Overtime Logic - Xử Lý Ngày Nghỉ/Lễ

**Vấn đề:** Công thức `OT = actual_hours - duration_hours` của từng ca là SAI.

**Đúng:** OT phải tính theo **tổng giờ làm trong ngày** so với giới hạn quy định (8h/ngày).

**Giải pháp:**
- **Ngày thường:** OT = Tổng giờ làm trong ngày - MAX_DAILY_HOURS (8h)
- **Ngày nghỉ/lễ:** OT = Tổng giờ làm (toàn bộ)

**Ví dụ:**
- Ngày thường: Ca sáng 6h + Ca chiều 6h = 12h → OT = 12h - 8h = **4h**
- Ngày thường: Ca sáng 6h + Ca tối 2h = 8h → OT = **0h** (không vượt quá 8h)
- Ngày thường: Chỉ làm 1 ca 6h → OT = **0h** (không vượt quá 8h)
- Ngày lễ: Làm 1 ca 6h → OT = **6h** (toàn bộ)

### 8.2. Deductions - Tách Lương Đóng BH vs Lương Thực

**Vấn đề:** Công ty nhỏ thường đóng BH trên mức lương tối thiểu vùng.

**Giải pháp:** 
- Thêm `insurance_salary` (lương đóng BH)
- Tính BH trên `insurance_salary`, không phải `base_salary`

### 8.3. Thuế TNCN - Tính Đầy Đủ

**Công thức:**
```
Taxable Income = Gross Salary - Total Insurance - Personal Deduction - Dependent Deduction
```

**Giảm trừ:**
- Bản thân: 11tr/tháng
- Người phụ thuộc: 4.4tr/người

**Bậc thuế (2024):**
- 0-5tr → 5%
- 5-10tr → 10%
- 10-18tr → 15%
- 18-32tr → 20%
- 32-52tr → 25%
- 52-80tr → 30%
- >80tr → 35%

### 8.4. Penalty Tự Động - Xử Lý Khi Sửa NO_SHOW

**Vấn đề:** Manager lỡ đánh NO_SHOW sai → penalty tự động tạo → sau đó sửa lại COMPLETED → penalty vẫn còn?

**Giải pháp:**
1. Khóa sửa assignment nếu payroll đã APPROVED
2. Tự động hủy penalty khi sửa NO_SHOW → COMPLETED (nếu payroll chưa APPROVED)

### 8.5. Database - Tách Rõ Deductions

**Cập nhật bảng `payrolls`:**
- `amount_insurances` - Tổng BHXH + BHYT + BHTN (10.5%)
- `amount_tax` - Thuế TNCN
- `amount_advances` - Ứng lương
- `total_deductions` - Tổng khấu trừ

---

## 9. Phân Tích Overtime Logic

### 9.1. Logic OT Hiện Tại

#### ✅ Điểm Mạnh:
1. **Validation tốt:** Đã có giới hạn OT hợp lý (40h + 12h)
2. **Dữ liệu đầy đủ:** `actual_hours`, `duration_hours`, `overtime_rate` đã có
3. **Tính toán chính xác:** `actual_hours` được tính từ check-in/check-out

#### ❌ Điểm Yếu:
1. **Chưa tính OT pay:** Chỉ validate, chưa tính tiền
2. **Chưa phân biệt Full-time vs Part-time:** Cần logic khác nhau
3. **Chưa phân biệt ngày thường/cuối tuần/lễ:** Cần hệ số khác nhau
4. **Chưa tích hợp với payroll:** Cần tính OT trong payroll service

### 9.2. Validation Overtime Limits

**Constants:**
```java
MAX_DAILY_HOURS = 8h/ngày
MAX_WEEKLY_HOURS = 40h/tuần
MAX_OVERTIME_PER_WEEK = 12h/tuần
MAX_OVERTIME_PER_DAY = 4h/ngày (theo quy định lao động VN)
MAX_WEEKLY_HOURS_OVERTIME = 52h/tuần (40 + 12)
```

**Logic Validation:**
1. **Normal Shift:**
   - Tổng giờ/tuần ≤ 40h
   - Tổng giờ/ngày ≤ 8h
   - OT daily: tối đa 4h/ngày (tổng ≤ 12h/ngày)

2. **Overtime Shift (Request):**
   - Bỏ qua rest period
   - Tổng giờ/ngày ≤ 12h (8h + 4h OT)
   - Tổng giờ/tuần ≤ 52h (40 + 12)

**✅ Hợp lý:** Tuân thủ quy định lao động VN.

---

## 10. Tính Năng Chính

1. **Tính lương tự động** từ shifts, allowances, bonuses, penalties
2. **Template System** - Admin tạo templates, Manager có thể apply hoặc custom
3. **Tự động tạo penalty** khi NO_SHOW (event-driven)
4. **Batch calculate** - Tính lương cho nhiều nhân viên cùng lúc
5. **Batch approve** - Duyệt nhiều payroll cùng lúc
6. **Snapshot** - Lưu giá trị lương tại thời điểm tính (audit trail)
7. **SecurityService** - Tái sử dụng logic phân quyền

---

## 11. Lưu Ý Quan Trọng

### 11.1. Snapshot Mechanism
- Lưu `base_salary_snapshot`, `hourly_rate_snapshot`, `insurance_salary_snapshot`
- Nếu nhân viên tăng lương giữa kỳ, payroll cũ vẫn giữ nguyên giá trị cũ
- Quan trọng cho audit trail

### 11.2. Prorated Salary
- Tính theo ngày cho nhân viên vào/ra giữa tháng
- Công thức: `base_salary × (số ngày làm việc / số ngày trong tháng)`

### 11.3. Insurance Salary
- Tính BH trên `insurance_salary` (thường = lương tối thiểu vùng)
- Không phải `base_salary` thực tế
- Giúp giảm chi phí cho công ty nhỏ

### 11.4. Thuế TNCN
- Tính đầy đủ với giảm trừ gia cảnh
- Cần số người phụ thuộc từ profile

### 11.5. Penalty Auto
- Tự động hủy khi sửa NO_SHOW → COMPLETED
- Chỉ nếu payroll chưa APPROVED

### 11.6. OT Ngày Nghỉ/Lễ
- Toàn bộ giờ làm được tính là OT
- Cần flag `shift_type` để phân biệt

### 11.7. Template System
- **Admin tạo templates** với scope SYSTEM (toàn bộ) hoặc BRANCH (chi nhánh cụ thể)
- **Manager có thể:**
  - Xem templates (SYSTEM + BRANCH của mình)
  - Apply template cho Staff (tạo bonus/penalty/allowance từ template)
  - Custom riêng (không dùng template, `source_template_id = NULL`)
  - Override amount/description khi apply template
- **Tracking:** `source_template_id` trong allowances/bonuses/penalties để biết template được dùng
- **Validation:** Manager chỉ có thể dùng templates của branch mình hoặc SYSTEM scope

---

## 12. Thứ Tự Triển Khai & Tiến Độ

### Phase 1: Core Functionality

#### ✅ 1. Database Schema
- [x] Cập nhật `manager_profiles`: thêm `base_salary`, `insurance_salary`, `overtime_rate`, `number_of_dependents`
- [x] Cập nhật `staff_profiles`: thêm `insurance_salary`, `number_of_dependents`
- [x] Cập nhật `shifts`: thêm `shift_type`
- [x] Tạo bảng `payrolls` với đầy đủ fields
- [x] Tạo bảng `bonuses`
- [x] Tạo bảng `penalties`
- [x] Tạo bảng `allowances`
- [x] Tạo bảng `penalty_config` (tùy chọn)
- [x] Tạo bảng `holidays` (tùy chọn)

#### ✅ 2. Entities & Repositories
- [x] Tạo entity `Payroll` với đầy đủ fields và enums
- [x] Tạo entity `Bonus` với đầy đủ fields và enums
- [x] Tạo entity `Penalty` với đầy đủ fields và enums
- [x] Tạo entity `Allowance` với đầy đủ fields và enums
- [x] Cập nhật entity `StaffProfile`: thêm `insuranceSalary`, `numberOfDependents`
- [x] Cập nhật entity `ManagerProfile`: thêm `baseSalary`, `insuranceSalary`, `overtimeRate`, `numberOfDependents`
- [x] Cập nhật entity `Shift`: thêm `shiftType`
- [x] Tạo `PayrollRepository` với các query methods
- [x] Tạo `BonusRepository` với các query methods
- [x] Tạo `PenaltyRepository` với các query methods
- [x] Tạo `AllowanceRepository` với các query methods

#### ✅ 3. DTOs
- [x] Tạo `PayrollCalculationRequest`
- [x] Tạo `PayrollResponse`
- [x] Tạo `BonusCreationRequest`
- [x] Tạo `BonusResponse`
- [x] Tạo `PenaltyCreationRequest`
- [x] Tạo `PenaltyResponse`
- [x] Tạo `AllowanceCreationRequest`
- [x] Tạo `AllowanceResponse`

#### ✅ 4. PayrollService - Logic Tính Lương
- [x] Method `calculatePayroll()` - Tính lương chính
- [x] Method `calculateBaseSalary()` - Tính base salary (Part-time và Full-time)
- [x] Method `calculateHourlyBaseSalary()` - Tính lương theo giờ cho Part-time
- [x] Method `calculateOvertimeHoursForPeriod()` - Tính tổng OT trong kỳ
- [x] Method `calculateOvertimeHoursForDay()` - Tính OT trong một ngày (theo logic: tổng giờ - 8h)
- [x] Method `calculateOvertimePay()` - Tính tiền OT với hệ số
- [x] Method `calculateTotalAllowances()` - Tính tổng phụ cấp
- [x] Method `calculateTotalBonuses()` - Tính tổng thưởng
- [x] Method `calculateTotalPenalties()` - Tính tổng phạt
- [x] Method `calculateInsuranceDeduction()` - Tính khấu trừ BHXH, BHYT, BHTN (10.5%)
- [x] Method `calculatePersonalIncomeTax()` - Tính thuế TNCN theo bậc với giảm trừ gia cảnh
- [x] Method `validateAuthorization()` - Validate phân quyền (Manager chỉ quản lý Staff trong branch)
- [x] Snapshot mechanism: Lưu `baseSalarySnapshot`, `hourlyRateSnapshot`, `insuranceSalarySnapshot`

#### ✅ 5. Mapper & Error Codes
- [x] Tạo `PayrollMapper` (MapStruct)
- [x] Thêm Error Codes: `PAYROLL_ALREADY_EXISTS`, `PAYROLL_NOT_FOUND`, `PAYROLL_ALREADY_APPROVED`, `PAYROLL_ALREADY_PAID`, `INVALID_PERIOD_FORMAT`, `EMPTY_PERIOD`, `BONUS_NOT_FOUND`, `PENALTY_NOT_FOUND`, `ALLOWANCE_NOT_FOUND`

### Phase 2: Template System (Mới)

#### ✅ 6. Template Entities & Repositories
- [x] Tạo entity `AllowanceTemplate` với đầy đủ fields
- [x] Tạo entity `BonusTemplate` với đầy đủ fields
- [x] Tạo entity `PenaltyConfig` với đầy đủ fields
- [x] Cập nhật entity `Bonus`, `Penalty`, `Allowance`: thêm `sourceTemplateId`
- [x] Tạo `AllowanceTemplateRepository` với các query methods:
  - [x] `findByBranchIdIsNullAndIsActiveTrue()` - Lấy SYSTEM templates
  - [x] `findByBranchIdAndIsActiveTrue()` - Lấy BRANCH templates
  - [x] `findTemplatesForManager()` - Lấy templates cho Manager (SYSTEM + BRANCH của mình)
- [x] Tạo `BonusTemplateRepository` với các query methods tương tự
- [x] Tạo `PenaltyConfigRepository` với các query methods

#### ✅ 7. Template DTOs
- [x] Tạo `AllowanceTemplateCreationRequest`
- [x] Tạo `AllowanceTemplateResponse`
- [x] Tạo `AllowanceTemplateUpdateRequest`
- [x] Tạo `BonusTemplateCreationRequest`
- [x] Tạo `BonusTemplateResponse`
- [x] Tạo `BonusTemplateUpdateRequest`
- [x] Tạo `PenaltyConfigCreationRequest`
- [x] Tạo `PenaltyConfigResponse`
- [x] Tạo `PenaltyConfigUpdateRequest`
- [x] Tạo `ApplyTemplateRequest` (cho Manager apply template)

#### ✅ 8. Template Mappers
- [x] Tạo `AllowanceTemplateMapper` (MapStruct)
- [x] Tạo `BonusTemplateMapper` (MapStruct)
- [x] Tạo `PenaltyConfigMapper` (MapStruct)

#### ✅ 9. Template Services
- [x] Tạo `AllowanceTemplateService` với các methods:
  - [x] `createTemplate()` - Tạo template (Admin only)
  - [x] `updateTemplate()` - Cập nhật template (Admin only)
  - [x] `deleteTemplate()` - Xóa template (Admin only)
  - [x] `getTemplates()` - Lấy danh sách templates (có filter: branch_id, is_active)
  - [x] `getTemplateById()` - Lấy chi tiết template
  - [x] `getTemplatesForManager()` - Lấy templates cho Manager (SYSTEM + BRANCH của mình)
  - [x] `validateTemplateAccess()` - Validate template access
- [x] Tạo `BonusTemplateService` với các methods tương tự
- [x] Tạo `PenaltyConfigService` với các methods tương tự:
  - [x] `getConfigByPenaltyType()` - Lấy config theo penalty_type (ưu tiên BRANCH, nếu không có thì SYSTEM)

### Phase 3: Services & Controllers

#### ✅ 10. BonusService, PenaltyService, AllowanceService
- [ ] Tạo `BonusService` với các methods:
  - [ ] `createBonus()` - Tạo bonus custom (không dùng template)
  - [ ] `createBonusFromTemplate()` - Tạo bonus từ template (Manager apply template)
  - [ ] `approveBonus()` - Duyệt bonus
  - [ ] `rejectBonus()` - Từ chối bonus
  - [ ] `getBonuses()` - Lấy danh sách bonus (có filter: user_id, period, status, branch_id)
  - [ ] `getBonusById()` - Lấy chi tiết bonus
  - [ ] `deleteBonus()` - Xóa bonus (chỉ khi PENDING)
  - [ ] `validateAuthorization()` - Validate phân quyền
- [ ] Tạo `PenaltyService` với các methods:
  - [ ] `createPenalty()` - Tạo penalty custom
  - [ ] `createPenaltyFromTemplate()` - Tạo penalty từ template/penalty_config
  - [ ] `createAutoPenalty()` - Tạo penalty tự động khi NO_SHOW (event-driven)
  - [ ] `approvePenalty()` - Duyệt penalty
  - [ ] `rejectPenalty()` - Từ chối penalty
  - [ ] `getPenalties()` - Lấy danh sách penalty (có filter)
  - [ ] `getPenaltyById()` - Lấy chi tiết penalty
  - [ ] `cancelAutoPenalty()` - Hủy penalty tự động khi sửa NO_SHOW → COMPLETED
  - [ ] `deletePenalty()` - Xóa penalty (chỉ khi PENDING)
  - [ ] `validateAuthorization()` - Validate phân quyền
- [ ] Tạo `AllowanceService` với các methods:
  - [ ] `createAllowance()` - Tạo allowance custom
  - [ ] `createAllowanceFromTemplate()` - Tạo allowance từ template
  - [ ] `updateAllowance()` - Cập nhật allowance
  - [ ] `getAllowances()` - Lấy danh sách allowance (có filter)
  - [ ] `getAllowanceById()` - Lấy chi tiết allowance
  - [ ] `deleteAllowance()` - Xóa allowance
  - [ ] `validateAuthorization()` - Validate phân quyền

#### ✅ 11. PayrollService - Bổ Sung Methods
- [x] `getPayrolls()` - Lấy danh sách payroll (có filter: user_id, period, status, branch_id)
- [x] `getPayrollById()` - Lấy chi tiết payroll
- [x] `approvePayroll()` - Duyệt payroll
- [x] `markPayrollAsPaid()` - Đánh dấu đã thanh toán (Admin only)
- [x] `calculatePayrollBatch()` - Tính lương cho nhiều nhân viên (batch)
- [x] `approvePayrollBatch()` - Duyệt nhiều payroll cùng lúc (batch)
- [x] `recalculatePayroll()` - Tính lại payroll (nếu có thay đổi)

#### ⏳ 12. SecurityService (Tùy chọn)
- [ ] Tạo `SecurityService` với các methods:
  - [ ] `isManagerOfBranch()` - Kiểm tra Manager có quản lý branch không
  - [ ] `isManagerOfUser()` - Kiểm tra Manager có quản lý user không
  - [ ] `validateTemplateAccess()` - Validate Manager có thể dùng template không
- [ ] Hoặc: Giữ logic trong từng Service (đã có `validateAuthorization()` trong PayrollService)

#### ✅ 13. Controllers
- [x] Tạo `PayrollController` với các endpoints:
  - [x] `POST /api/payrolls/calculate` - Tính lương cho 1 nhân viên
  - [x] `POST /api/payrolls/calculate-batch` - Tính lương cho nhiều nhân viên (batch)
  - [x] `GET /api/payrolls` - Lấy danh sách payroll (có filter: user_id, period, status, branch_id)
  - [x] `GET /api/payrolls/{payrollId}` - Lấy chi tiết payroll
  - [x] `PUT /api/payrolls/{payrollId}/approve` - Duyệt payroll
  - [x] `PUT /api/payrolls/approve-batch` - Duyệt nhiều payroll (batch)
  - [x] `PUT /api/payrolls/{payrollId}/pay` - Đánh dấu đã thanh toán (Admin only)
  - [x] `POST /api/payrolls/{payrollId}/recalculate` - Tính lại payroll
- [ ] Tạo `BonusController` với các endpoints:
  - [ ] `POST /api/bonuses` - Tạo bonus custom
  - [ ] `POST /api/bonuses/apply-template` - Apply template cho staff (Manager)
  - [ ] `GET /api/bonuses` - Lấy danh sách bonus (có filter)
  - [ ] `GET /api/bonuses/{bonusId}` - Lấy chi tiết bonus
  - [ ] `PUT /api/bonuses/{bonusId}/approve` - Duyệt bonus
  - [ ] `PUT /api/bonuses/{bonusId}/reject` - Từ chối bonus
  - [ ] `DELETE /api/bonuses/{bonusId}` - Xóa bonus (chỉ khi PENDING)
- [ ] Tạo `PenaltyController` với các endpoints:
  - [ ] `POST /api/penalties` - Tạo penalty custom
  - [ ] `POST /api/penalties/apply-template` - Apply template cho staff (Manager)
  - [ ] `GET /api/penalties` - Lấy danh sách penalty (có filter)
  - [ ] `GET /api/penalties/{penaltyId}` - Lấy chi tiết penalty
  - [ ] `PUT /api/penalties/{penaltyId}/approve` - Duyệt penalty
  - [ ] `PUT /api/penalties/{penaltyId}/reject` - Từ chối penalty
  - [ ] `DELETE /api/penalties/{penaltyId}` - Xóa penalty (chỉ khi PENDING)
- [ ] Tạo `AllowanceController` với các endpoints:
  - [ ] `POST /api/allowances` - Tạo allowance custom
  - [ ] `POST /api/allowances/apply-template` - Apply template cho staff (Manager)
  - [ ] `GET /api/allowances` - Lấy danh sách allowance (có filter)
  - [ ] `GET /api/allowances/{allowanceId}` - Lấy chi tiết allowance
  - [ ] `PUT /api/allowances/{allowanceId}` - Cập nhật allowance
  - [ ] `DELETE /api/allowances/{allowanceId}` - Xóa allowance

#### ✅ 14. Template Controllers (Admin Only)
- [ ] Tạo `AllowanceTemplateController` với các endpoints:
  - [ ] `POST /api/allowance-templates` - Tạo template (Admin)
  - [ ] `GET /api/allowance-templates` - Lấy danh sách templates (có filter: branch_id, is_active)
  - [ ] `GET /api/allowance-templates/{templateId}` - Lấy chi tiết template
  - [ ] `PUT /api/allowance-templates/{templateId}` - Cập nhật template (Admin)
  - [ ] `DELETE /api/allowance-templates/{templateId}` - Xóa template (Admin)
- [ ] Tạo `BonusTemplateController` với các endpoints tương tự
- [ ] Tạo `PenaltyConfigController` với các endpoints tương tự

### Phase 4: Advanced Features

#### ✅ 15. Event-Driven Features
- [x] Tạo Event `StaffAbsentEvent`
- [x] Tạo Event Listener `PenaltyEventListener`:
  - [x] Lắng nghe `StaffAbsentEvent` khi Manager đánh dấu NO_SHOW
  - [x] Tự động tạo penalty với `penalty_type = NO_SHOW`
  - [x] Lấy `amount` từ `penalty_config` (SYSTEM hoặc BRANCH scope)
  - [x] Set `created_by = 0` (System), `status = PENDING`
- [x] Tạo `AsyncConfig` để enable @Async cho EventListener
- [x] Method `cancelAutoPenalty()` trong PenaltyService để hủy penalty khi sửa NO_SHOW → COMPLETED
- [x] Tích hợp với Shift Service:
  - [x] `ShiftAssignmentAutoStatusJob`: Publish `StaffAbsentEvent` khi tự động set NO_SHOW
  - [x] `ShiftAssignmentService.markAsNoShow()`: Method cho Manager manually mark NO_SHOW và publish event
  - [x] `ShiftAssignmentService.checkOut()`: Tự động hủy penalty khi sửa NO_SHOW → CHECKED_OUT
  - [x] Validate: Không cho phép mark NO_SHOW nếu payroll đã APPROVED
  - [x] Endpoint `PUT /api/shift-assignments/{assignmentId}/mark-no-show` cho Manager

#### ✅ 16. Batch Operations
- [x] `calculatePayrollBatch()` - Tính lương cho nhiều nhân viên:
  - [x] Input: List userIds, period
  - [x] Tính lương cho từng user
  - [x] Return: List PayrollResponse (continue on error)
- [x] `approvePayrollBatch()` - Duyệt nhiều payroll cùng lúc:
  - [x] Input: List payrollIds
  - [x] Validate và approve từng payroll
  - [x] Return: List PayrollResponse (continue on error)

#### ✅ 17. Overtime Multiplier theo Ngày
- [x] Cải thiện `calculateOvertimePay()` để tính hệ số theo ngày:
  - [x] Tính OT pay cho từng ngày riêng biệt (không tính tổng rồi nhân hệ số)
  - [x] Ngày thường: 1.5x (overtime_rate mặc định)
  - [x] Cuối tuần (Thứ 7, CN): 2.0x (1.5 × 1.33)
  - [x] Lễ/Tết: 3.0x (1.5 × 2.0)
- [x] Tích hợp với bảng `holidays`:
  - [x] Tạo entity `Holiday` và `HolidayRepository`
  - [x] Method `isHoliday(LocalDate date)` - Check ngày có phải lễ không
  - [x] Method `getOvertimeMultiplier()` - Tính hệ số theo ngày
- [x] Cập nhật `calculateOvertimePay()` để tính theo từng ngày với hệ số khác nhau
- [x] Cải thiện `calculateOvertimeHoursForDay()`:
  - [x] Check shift_type của TẤT CẢ ca trong ngày (không chỉ ca đầu tiên)
  - [x] Nếu có bất kỳ ca nào là WEEKEND/HOLIDAY, toàn bộ giờ làm là OT
  - [x] Kiểm tra ngày có phải lễ từ bảng `holidays`
  - [x] Kiểm tra ngày có phải cuối tuần (Thứ 7, CN)

#### ⏳ 18. Testing & Validation
- [ ] Unit tests cho PayrollService:
  - [ ] Test `calculateBaseSalary()` cho Part-time và Full-time
  - [ ] Test `calculateOvertimeHoursForDay()` với các trường hợp
  - [ ] Test `calculateOvertimePay()` với hệ số khác nhau
  - [ ] Test `calculatePersonalIncomeTax()` với các bậc thuế
  - [ ] Test `calculateInsuranceDeduction()`
  - [ ] Test `validateAuthorization()`
- [ ] Unit tests cho BonusService, PenaltyService, AllowanceService
- [ ] Unit tests cho Template Services
- [ ] Integration tests cho API endpoints:
  - [ ] Test tính lương end-to-end
  - [ ] Test apply template
  - [ ] Test approve/reject workflow
- [ ] Test phân quyền:
  - [ ] Manager chỉ quản lý Staff trong branch mình
  - [ ] Manager chỉ dùng templates của branch mình hoặc SYSTEM
  - [ ] Admin có quyền tất cả
  - [ ] Staff chỉ xem lương của chính mình
- [ ] Test edge cases:
  - [ ] Nhân viên mới vào giữa tháng (prorated salary)
  - [ ] Nhân viên nghỉ việc giữa tháng
  - [ ] Payroll đã APPROVED → không cho phép sửa
  - [ ] Template bị xóa → record vẫn giữ nguyên (snapshot)

### Phase 5: Frontend/UI Development

#### ✅ 22. Service Files (API Integration)
- [x] Tạo `payrollService.ts`:
  - [x] `calculatePayroll()` - Tính lương cho 1 nhân viên
  - [x] `calculatePayrollBatch()` - Tính lương batch
  - [x] `getPayrolls()` - Lấy danh sách payroll (có filter)
  - [x] `getPayrollById()` - Lấy chi tiết payroll
  - [x] `approvePayroll()` - Duyệt payroll
  - [x] `approvePayrollBatch()` - Duyệt batch
  - [x] `markPayrollAsPaid()` - Đánh dấu đã thanh toán
  - [x] `recalculatePayroll()` - Tính lại payroll
- [x] Tạo `bonusService.ts`:
  - [x] `createBonus()` - Tạo bonus custom
  - [x] `applyTemplate()` - Apply template cho staff
  - [x] `getBonuses()` - Lấy danh sách bonus
  - [x] `getBonusById()` - Lấy chi tiết bonus
  - [x] `approveBonus()` - Duyệt bonus
  - [x] `rejectBonus()` - Từ chối bonus
  - [x] `deleteBonus()` - Xóa bonus
- [x] Tạo `penaltyService.ts`:
  - [x] `createPenalty()` - Tạo penalty custom
  - [x] `applyTemplate()` - Apply template cho staff
  - [x] `getPenalties()` - Lấy danh sách penalty
  - [x] `getPenaltyById()` - Lấy chi tiết penalty
  - [x] `approvePenalty()` - Duyệt penalty
  - [x] `rejectPenalty()` - Từ chối penalty
  - [x] `deletePenalty()` - Xóa penalty
- [x] Tạo `allowanceService.ts`:
  - [x] `createAllowance()` - Tạo allowance custom
  - [x] `applyTemplate()` - Apply template cho staff
  - [x] `updateAllowance()` - Cập nhật allowance
  - [x] `getAllowances()` - Lấy danh sách allowance
  - [x] `getAllowanceById()` - Lấy chi tiết allowance
  - [x] `deleteAllowance()` - Xóa allowance
- [x] Tạo `payrollTemplateService.ts`:
  - [x] `getAllowanceTemplates()` - Lấy danh sách allowance templates
  - [x] `getBonusTemplates()` - Lấy danh sách bonus templates
  - [x] `getPenaltyConfigs()` - Lấy danh sách penalty configs
  - [x] `createAllowanceTemplate()` - Tạo allowance template (Admin)
  - [x] `createBonusTemplate()` - Tạo bonus template (Admin)
  - [x] `createPenaltyConfig()` - Tạo penalty config (Admin)
  - [x] `updateTemplate()` - Cập nhật template (Admin)
  - [x] `deleteTemplate()` - Xóa template (Admin)
  - [x] Cập nhật `services/index.ts` để export các service mới

#### ✅ 23. Admin Pages & Components
- [x] `AdminPayrollManagement.tsx`:
  - [x] Danh sách payroll toàn hệ thống (có filter: branch, period, status)
  - [x] Tính lương cho Manager hoặc Staff
  - [x] Batch calculate/approve
  - [x] Xem chi tiết payroll
  - [x] Đánh dấu đã thanh toán (PAID)
  - [x] Tính lại payroll
- [x] `AdminPayrollTemplates.tsx`:
  - [x] Quản lý Allowance Templates (tạo/sửa/xóa)
  - [x] Quản lý Bonus Templates (tạo/sửa/xóa)
  - [x] Quản lý Penalty Configs (tạo/sửa/xóa)
  - [x] Filter theo scope (SYSTEM/BRANCH)
  - [x] Toggle active/inactive
  - [x] Tabs để chuyển đổi giữa các loại template
- [x] `AdminPayrollReports.tsx`:
  - [x] Báo cáo lương theo branch
  - [x] Báo cáo lương theo kỳ
  - [x] Thống kê tổng hợp (tổng lương, khấu trừ, trung bình)
  - [x] Phân bổ theo trạng thái
  - [x] Export Excel (placeholder - cần implement sau)

#### ⏳ 24. Manager Pages & Components
- [ ] `ManagerPayrollManagement.tsx`:
  - [ ] Danh sách payroll của Staff trong branch (có filter: period, status)
  - [ ] Tính lương cho Staff
  - [ ] Batch calculate/approve
  - [ ] Xem chi tiết payroll
- [ ] `ManagerPayrollCalculation.tsx`:
  - [ ] Form tính lương (chọn staff, period)
  - [ ] Preview kết quả trước khi tính
  - [ ] Batch calculation
- [ ] `ManagerBonusPenaltyManagement.tsx`:
  - [ ] Danh sách bonus/penalty của Staff
  - [ ] Tạo bonus/penalty custom
  - [ ] Apply template cho Staff
  - [ ] Duyệt/từ chối bonus/penalty
  - [ ] Xóa bonus/penalty (chỉ khi PENDING)
- [ ] `ManagerAllowanceManagement.tsx`:
  - [ ] Danh sách allowance của Staff
  - [ ] Tạo allowance custom
  - [ ] Apply template cho Staff
  - [ ] Cập nhật/xóa allowance
- [ ] `ManagerPayrollTemplates.tsx`:
  - [ ] Xem danh sách templates (SYSTEM + BRANCH của mình)
  - [ ] Apply template cho Staff
  - [ ] Preview template details

#### ⏳ 25. Staff Pages & Components
- [ ] `StaffMyPayroll.tsx`:
  - [ ] Danh sách payroll của chính mình (có filter: period)
  - [ ] Xem chi tiết payroll
  - [ ] Download/Print payroll slip
- [ ] `StaffPayrollHistory.tsx`:
  - [ ] Lịch sử lương các kỳ
  - [ ] So sánh lương giữa các kỳ
  - [ ] Filter theo năm/tháng

#### ⏳ 26. Shared Components
- [ ] `PayrollTable.tsx`:
  - [ ] Bảng hiển thị danh sách payroll
  - [ ] Sort, filter, pagination
  - [ ] Actions: View, Approve, Pay, Recalculate
- [ ] `PayrollDetailModal.tsx`:
  - [ ] Modal hiển thị chi tiết payroll
  - [ ] Breakdown: Base Salary, OT, Allowances, Bonuses, Penalties, Deductions
  - [ ] Snapshot values
  - [ ] Status badge
- [ ] `PayrollCalculationForm.tsx`:
  - [ ] Form chọn user và period
  - [ ] Preview calculation result
  - [ ] Submit calculation
- [ ] `PayrollSummaryCard.tsx`:
  - [ ] Card tổng kết lương (Gross, Deductions, Net)
  - [ ] Visual breakdown (chart)
- [ ] `BonusPenaltyForm.tsx`:
  - [ ] Form tạo bonus/penalty
  - [ ] Template selector
  - [ ] Custom amount/description override
- [ ] `TemplateSelector.tsx`:
  - [ ] Dropdown/Modal chọn template
  - [ ] Filter theo type (Allowance/Bonus/Penalty)
  - [ ] Preview template details
- [ ] `PayrollStatusBadge.tsx`:
  - [ ] Badge hiển thị status (DRAFT, REVIEW, APPROVED, PAID)
  - [ ] Color coding
- [ ] `PayrollFilters.tsx`:
  - [ ] Filter component (period, status, branch, user)
  - [ ] Date picker cho period
- [ ] `PayrollBreakdownChart.tsx`:
  - [ ] Chart hiển thị breakdown lương (pie/bar chart)
  - [ ] Base Salary, OT, Allowances, Bonuses, Penalties, Deductions

#### ⏳ 27. Routing & Navigation
- [ ] Thêm routes vào `App.tsx`:
  - [ ] `/admin/payroll` - AdminPayrollManagement
  - [ ] `/admin/payroll-templates` - AdminPayrollTemplates
  - [ ] `/admin/payroll-reports` - AdminPayrollReports (Tùy chọn)
  - [ ] `/manager/payroll` - ManagerPayrollManagement
  - [ ] `/manager/payroll-calculation` - ManagerPayrollCalculation
  - [ ] `/manager/bonus-penalty` - ManagerBonusPenaltyManagement
  - [ ] `/manager/allowances` - ManagerAllowanceManagement
  - [ ] `/manager/payroll-templates` - ManagerPayrollTemplates
  - [ ] `/staff/payroll` - StaffMyPayroll
  - [ ] `/staff/payroll-history` - StaffPayrollHistory
- [ ] Thêm vào navigation menu (Layout):
  - [ ] Admin menu: "Quản Lý Lương", "Templates", "Báo Cáo"
  - [ ] Manager menu: "Quản Lý Lương", "Tính Lương", "Thưởng/Phạt", "Templates"
  - [ ] Staff menu: "Lương Của Tôi", "Lịch Sử Lương"

#### ⏳ 28. Types & Interfaces
- [ ] Tạo `types/payroll.ts`:
  - [ ] `Payroll`, `PayrollResponse`
  - [ ] `Bonus`, `BonusResponse`
  - [ ] `Penalty`, `PenaltyResponse`
  - [ ] `Allowance`, `AllowanceResponse`
  - [ ] `PayrollTemplate`, `BonusTemplate`, `PenaltyConfig`
  - [ ] Enums: `PayrollStatus`, `BonusType`, `PenaltyType`, `AllowanceType`
- [ ] Export types trong `types/index.ts`

#### ⏳ 19. Báo Cáo & Thống Kê (Tùy chọn)
- [ ] Báo cáo lương theo branch:
  - [ ] Tổng lương phải trả theo branch
  - [ ] Số lượng nhân viên theo branch
  - [ ] Lương trung bình theo branch
- [ ] Báo cáo lương theo kỳ:
  - [ ] So sánh lương giữa các kỳ
  - [ ] Xu hướng tăng/giảm lương
- [ ] Thống kê thưởng/phạt:
  - [ ] Tổng thưởng/phạt theo kỳ
  - [ ] Top nhân viên được thưởng nhiều nhất
  - [ ] Phân tích loại thưởng/phạt phổ biến
- [ ] Export Excel:
  - [ ] Export payroll list
  - [ ] Export báo cáo lương
  - [ ] Export thống kê

#### ⏳ 20. Cập Nhật Entities - Thêm source_template_id
- [ ] Cập nhật entity `Bonus`: thêm field `sourceTemplateId`
- [ ] Cập nhật entity `Penalty`: thêm field `sourceTemplateId`
- [ ] Cập nhật entity `Allowance`: thêm field `sourceTemplateId`
- [ ] Cập nhật DTOs: thêm `sourceTemplateId` vào Response DTOs

#### ⏳ 21. Validation & Business Rules
- [ ] Validate period format (YYYY-MM)
- [ ] Validate không tạo payroll trùng kỳ
- [ ] Validate Manager chỉ quản lý Staff trong branch
- [ ] Validate template access (Manager chỉ dùng SYSTEM + BRANCH của mình)
- [ ] Validate không sửa payroll đã APPROVED/PAID
- [ ] Validate không xóa bonus/penalty đã APPROVED

---

## 📊 Tổng Kết Tiến Độ

### ✅ Đã Hoàn Thành (Phase 1 - Core):
- **Database Schema**: 100% ✅
- **Entities & Repositories**: 100% ✅
- **DTOs**: 100% ✅
- **PayrollService - Logic Tính Lương**: 100% ✅
  - Tính base salary (Part-time & Full-time) ✅
  - Tính Overtime (theo ngày và theo kỳ) ✅
  - Tính Deductions (BHXH, BHYT, BHTN, Thuế TNCN) ✅
  - Validate phân quyền ✅
- **Mapper & Error Codes**: 100% ✅

### ⏳ Đang Làm / Chưa Làm:
- **Template System**: Entities, Repositories, Services ✅ 100%, Controllers ⏳ 0%
- **Services**: BonusService, PenaltyService, AllowanceService (0%)
- **Controllers**: Tất cả controllers (0%)
- **Event-Driven**: Tự động tạo penalty (0%)
- **Batch Operations**: Tính/duyệt batch (0%)
- **Overtime Multiplier**: Hệ số theo ngày (0%)
- **Testing**: Unit tests, Integration tests (0%)

### 📈 Tiến Độ Tổng Thể: **~75%** (Backend: ~90%, Frontend: 0%)

**Chi tiết:**
- Phase 1 (Core): ✅ 100%
- Phase 2 (Template System): ✅ 100% (Entities, Repositories, DTOs, Mappers, Services, Controllers)
- Phase 3 (Services & Controllers): ✅ 100% (BonusService, PenaltyService, AllowanceService, Controllers)
- Phase 4 (Advanced Features): ✅ 100% (Event-Driven ✅, Batch Operations ✅, Overtime Multiplier ✅, PayrollController ✅, Testing ⏳)
- Phase 5 (Frontend/UI Development): ⏳ 0% (Bước tiếp theo)

---

## 13. Code Examples

### 13.1. Tính Thuế TNCN

```java
public BigDecimal calculatePersonalIncomeTax(
    BigDecimal taxableIncome, 
    Integer numberOfDependents) {
    
    BigDecimal deduction = PERSONAL_DEDUCTION
        .add(DEPENDENT_DEDUCTION.multiply(BigDecimal.valueOf(numberOfDependents)));
    
    BigDecimal taxableAmount = taxableIncome.subtract(deduction);
    if (taxableAmount.compareTo(BigDecimal.ZERO) <= 0) {
        return BigDecimal.ZERO;
    }
    
    // Tính thuế theo bậc (xem chi tiết trong payroll-logic-refinements.md)
    // ...
}
```

### 13.2. SecurityService

```java
@Service
public class SecurityService {
    public boolean isManagerOfBranch(Integer managerUserId, Integer branchId) {
        ManagerProfile manager = managerProfileRepository.findById(managerUserId)
            .orElse(null);
        return manager != null && manager.getBranchId().equals(branchId);
    }
    
    public boolean isManagerOfUser(Integer managerUserId, Integer targetUserId) {
        ManagerProfile manager = managerProfileRepository.findById(managerUserId)
            .orElse(null);
        if (manager == null) return false;
        
        StaffProfile staff = staffProfileRepository.findById(targetUserId)
            .orElse(null);
        return staff != null && staff.getBranchId().equals(manager.getBranchId());
    }
}
```

---

## 14. Tổng Kết

### Logic Hiện Tại:
- ✅ **Validation:** Tốt, đã có giới hạn OT hợp lý
- ✅ **Dữ liệu:** Đầy đủ (`actual_hours`, `duration_hours`, `overtime_rate`, `insurance_salary`, `number_of_dependents`)
- ✅ **Tính toán:** Đã có logic tính OT pay, deductions, thuế TNCN đầy đủ

### Đã Hoàn Thành:
1. ✅ Logic tính `overtime_hours = Tổng giờ làm trong ngày - MAX_DAILY_HOURS (8h)` (với xử lý WEEKEND/HOLIDAY)
2. ✅ Logic tính `overtime_pay` với hệ số (có thể cải thiện thêm hệ số theo ngày)
3. ✅ Tích hợp vào `PayrollService.calculatePayroll()`
4. ✅ Phân biệt Full-time vs Part-time
5. ✅ Tính thuế TNCN đầy đủ với giảm trừ gia cảnh
6. ✅ Tính deductions (BHXH, BHYT, BHTN) dựa trên `insurance_salary`
7. ✅ Snapshot mechanism cho audit trail
8. ✅ Validate phân quyền (Manager chỉ quản lý Staff trong branch)

### Cần Bổ Sung:
1. ⏳ **Frontend/UI Development** (Phase 5) - Bước tiếp theo:
   - Service files cho API calls
   - Pages cho Admin/Manager/Staff
   - Shared components
   - Routing & Navigation
2. ⏳ Testing (có thể làm sau khi có UI)

### Kết Luận:
**✅ Phase 1 (Core Functionality) đã hoàn thành ~60%:**
- Database schema: ✅ 100%
- Entities & Repositories: ✅ 100%
- DTOs: ✅ 100%
- PayrollService với logic tính lương đầy đủ: ✅ 100%
- Mapper & Error Codes: ✅ 100%

**⏳ Phase 2 (Template System) đang chờ triển khai:**
- Template Entities & Repositories: ⏳ 0%
- Template DTOs & Mappers: ⏳ 0%
- Template Services: ⏳ 0%
- Template Controllers: ⏳ 0%

**⏳ Phase 3 (Services & Controllers) đang chờ triển khai:**
- BonusService, PenaltyService, AllowanceService: ⏳ 0%
- PayrollService bổ sung methods: ⏳ 0%
- Controllers: ⏳ 0%

**✅ Phase 4 (Advanced Features) đã hoàn thành:**
- Event-Driven: ✅ 100% (Event, Listener, AsyncConfig ✅, tích hợp với Shift Service ✅)
- Batch Operations: ✅ 100%
- Overtime Multiplier: ✅ 100%
- PayrollController: ✅ 100%
- Testing: ⏳ 0% (có thể làm sau)

**⏳ Phase 5 (Frontend/UI Development) - Bước tiếp theo:**
- Service Files (API Integration): ⏳ 0%
- Admin Pages & Components: ⏳ 0%
- Manager Pages & Components: ⏳ 0%
- Staff Pages & Components: ⏳ 0%
- Shared Components: ⏳ 0%
- Routing & Navigation: ⏳ 0%
- Types & Interfaces: ⏳ 0%

**🎯 Bước tiếp theo: Bắt đầu Phase 5 (Frontend/UI Development)**

