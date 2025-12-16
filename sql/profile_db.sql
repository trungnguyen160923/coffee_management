-- profile_db SQL extracted from your schema (customer/admin/manager/staff profiles + addresses)
-- Source: Cafe-management_final.sql (extracted tables listed by user). 
-- create_at and update_at use CURRENT_TIMESTAMP defaults.
-- Decimal columns use scale 2 (DECIMAL(12,2)) where applicable.

DROP DATABASE IF EXISTS profile_db;
CREATE DATABASE profile_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE profile_db;

-- Addresses table
DROP TABLE IF EXISTS addresses;
CREATE TABLE addresses (
  address_id INT NOT NULL AUTO_INCREMENT UNIQUE,
  label VARCHAR(50) NOT NULL,
  full_address VARCHAR(255) NOT NULL,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (address_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customer Profiles
DROP TABLE IF EXISTS customer_profiles;
CREATE TABLE customer_profiles (
  user_id INT NOT NULL UNIQUE,
  dob DATE NOT NULL,
  avatar_url VARCHAR(255) DEFAULT NULL,
  bio VARCHAR(255) DEFAULT NULL,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customer Addresses (links customer_profiles <-> addresses)
DROP TABLE IF EXISTS customer_addresses;
CREATE TABLE customer_addresses (
  id INT NOT NULL AUTO_INCREMENT UNIQUE,
  user_id INT NOT NULL,
  address_id INT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ca_user_id (user_id),
  KEY idx_ca_address_id (address_id),
  CONSTRAINT fk_ca_user FOREIGN KEY (user_id) REFERENCES customer_profiles(user_id) ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT fk_ca_address FOREIGN KEY (address_id) REFERENCES addresses(address_id) ON UPDATE NO ACTION ON DELETE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Manager Profiles
DROP TABLE IF EXISTS manager_profiles;
CREATE TABLE manager_profiles (
  user_id INT NOT NULL UNIQUE,
  branch_id INT NOT NULL DEFAULT -1,
  hire_date DATE NOT NULL,
  identity_card VARCHAR(50) NOT NULL,
  base_salary DECIMAL(12,2) NOT NULL DEFAULT 0.00 
    COMMENT 'Lương cơ bản theo tháng cho Manager',
  insurance_salary DECIMAL(12,2) DEFAULT 0.00 
    COMMENT 'Lương để tính bảo hiểm (thường = lương tối thiểu vùng)',
  overtime_rate DECIMAL(12,2) DEFAULT NULL 
    COMMENT 'Hệ số tăng ca (ví dụ: 1.5 = 150%)',
  number_of_dependents INT DEFAULT 0 
    COMMENT 'Số người phụ thuộc (để tính giảm trừ thuế TNCN)',
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  KEY idx_manager_branch_id (branch_id)
  -- NOTE: branch_id refers to branches in order_db; keep as loose reference (no cross-DB FK)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin Profiles
DROP TABLE IF EXISTS admin_profiles;
CREATE TABLE admin_profiles (
  user_id INT NOT NULL UNIQUE,
  admin_level TINYINT NOT NULL DEFAULT 1,
  notes TEXT,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id)
  -- NOTE: user_id refers to users in auth_db; keep as loose reference (no cross-DB FK)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Staff Profiles
DROP TABLE IF EXISTS staff_profiles;
CREATE TABLE staff_profiles (
  user_id INT NOT NULL UNIQUE,
  branch_id INT NOT NULL,
  identity_card VARCHAR(50) NOT NULL,
  hire_date DATE NOT NULL,
  employment_type ENUM('FULL_TIME', 'PART_TIME', 'CASUAL') NOT NULL DEFAULT 'FULL_TIME',
  pay_type ENUM('MONTHLY', 'HOURLY') NOT NULL DEFAULT 'MONTHLY',
  base_salary DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  insurance_salary DECIMAL(12,2) DEFAULT 0.00 
    COMMENT 'Lương để tính bảo hiểm (thường = lương tối thiểu vùng)',
  hourly_rate DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  overtime_rate DECIMAL(12,2) DEFAULT NULL,
  number_of_dependents INT DEFAULT 0 
    COMMENT 'Số người phụ thuộc (để tính giảm trừ thuế TNCN)',
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  KEY idx_staff_branch_id (branch_id)
  -- NOTE: branch_id refers to branches in order_db; keep as loose reference (no cross-DB FK)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Example: create index for fast lookups
CREATE INDEX ux_customer_profiles_user_id ON customer_profiles(user_id);


-- Processed events (idempotency for Kafka listeners)
DROP TABLE IF EXISTS processed_event;
CREATE TABLE processed_event (
  event_id VARCHAR(100) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id),
  KEY idx_processed_type_time (event_type, processed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Staff role assignments (mapping staff ↔ roles in auth_db.roles)
DROP TABLE IF EXISTS staff_role_assignments;
CREATE TABLE staff_role_assignments (
  assignment_id INT PRIMARY KEY AUTO_INCREMENT,
  staff_user_id INT NOT NULL,
  role_id INT NOT NULL, -- Loose reference to auth_db.roles.role_id
  proficiency_level ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT') DEFAULT 'INTERMEDIATE',
  certified_at DATE DEFAULT NULL,
  notes VARCHAR(255) DEFAULT NULL,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_staff_role (staff_user_id, role_id),
  KEY idx_staff_role_staff (staff_user_id),
  KEY idx_staff_role_role (role_id),
  CONSTRAINT fk_staff_role_staff FOREIGN KEY (staff_user_id)
    REFERENCES staff_profiles(user_id) ON DELETE CASCADE
  -- NOTE: role_id is a loose reference to auth_db.roles.role_id (no cross-DB FK)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Shift templates (reusable definitions for shifts)
DROP TABLE IF EXISTS shift_templates;
CREATE TABLE shift_templates (
  template_id INT PRIMARY KEY AUTO_INCREMENT,
  branch_id INT NOT NULL, -- Loose reference to order_db.branches
  name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_hours DECIMAL(4,2) NOT NULL,
  max_staff_allowed INT DEFAULT NULL,
  employment_type ENUM('FULL_TIME', 'PART_TIME', 'CASUAL', 'ANY') 
    NOT NULL DEFAULT 'ANY'
    COMMENT 'Loại nhân viên phù hợp với ca này. ANY = tất cả loại đều có thể đăng ký',
  is_active BOOLEAN DEFAULT TRUE,
  description VARCHAR(255) DEFAULT NULL,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_shift_templates_branch (branch_id),
  KEY idx_shift_templates_employment_type (employment_type)
  -- NOTE: branch_id is loose reference to order_db.branches (no cross-DB FK)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Role requirements per template
DROP TABLE IF EXISTS shift_template_role_requirements;
CREATE TABLE shift_template_role_requirements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_id INT NOT NULL,
  role_id INT NOT NULL, -- Loose reference to auth_db.roles.role_id
  quantity INT NOT NULL DEFAULT 1,
  is_required BOOLEAN DEFAULT TRUE,
  notes VARCHAR(255) DEFAULT NULL,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_template_role (template_id, role_id),
  KEY idx_template_req_template (template_id),
  KEY idx_template_req_role (role_id),
  CONSTRAINT fk_template_req_template FOREIGN KEY (template_id)
    REFERENCES shift_templates(template_id) ON DELETE CASCADE
  -- NOTE: role_id is a loose reference to auth_db.roles.role_id
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Shifts (concrete work shifts per day)
DROP TABLE IF EXISTS shifts;
CREATE TABLE shifts (
  shift_id INT PRIMARY KEY AUTO_INCREMENT,
  branch_id INT NOT NULL, -- Loose reference to order_db.branches
  template_id INT DEFAULT NULL,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_hours DECIMAL(4,2) NOT NULL,
  max_staff_allowed INT DEFAULT NULL,
  employment_type ENUM('FULL_TIME', 'PART_TIME', 'CASUAL', 'ANY') 
    DEFAULT NULL
    COMMENT 'Loại nhân viên phù hợp với ca này. NULL = kế thừa từ template, ANY = tất cả loại',
  status ENUM('DRAFT', 'PUBLISHED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')
    NOT NULL DEFAULT 'DRAFT',
  shift_type ENUM('NORMAL', 'WEEKEND', 'HOLIDAY', 'OVERTIME') 
    NOT NULL DEFAULT 'NORMAL' 
    COMMENT 'Loại ca: NORMAL (ngày thường), WEEKEND (cuối tuần), HOLIDAY (lễ), OVERTIME (tăng ca)',
  created_by INT NOT NULL, -- user_id of manager
  notes TEXT DEFAULT NULL,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_shifts_branch_date (branch_id, shift_date),
  KEY idx_shifts_date_status (shift_date, status),
  KEY idx_shifts_template (template_id),
  KEY idx_shifts_employment_type (employment_type),
  CONSTRAINT fk_shifts_template FOREIGN KEY (template_id)
    REFERENCES shift_templates(template_id) ON DELETE SET NULL
  -- NOTE: branch_id is a loose reference to order_db.branches (no cross-DB FK)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Role requirements per concrete shift
DROP TABLE IF EXISTS shift_role_requirements;
CREATE TABLE shift_role_requirements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  shift_id INT NOT NULL,
  role_id INT NOT NULL, -- Loose reference to auth_db.roles.role_id
  quantity INT NOT NULL DEFAULT 1,
  is_required BOOLEAN DEFAULT TRUE,
  notes VARCHAR(255) DEFAULT NULL,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_shift_role (shift_id, role_id),
  KEY idx_shift_req_shift (shift_id),
  KEY idx_shift_req_role (role_id),
  CONSTRAINT fk_shift_req_shift FOREIGN KEY (shift_id)
    REFERENCES shifts(shift_id) ON DELETE CASCADE
  -- NOTE: role_id is a loose reference to auth_db.roles.role_id
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Shift assignments (staff assigned to shifts)
DROP TABLE IF EXISTS shift_assignments;
CREATE TABLE shift_assignments (
  assignment_id INT PRIMARY KEY AUTO_INCREMENT,
  shift_id INT NOT NULL,
  staff_user_id INT NOT NULL,
  assignment_type ENUM('AUTO', 'MANUAL', 'SELF_REGISTERED', 'SWAPPED', 'BORROWED')
    NOT NULL DEFAULT 'MANUAL',
  status ENUM('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW', 'CANCELLED')
    NOT NULL DEFAULT 'PENDING',
  is_borrowed_staff BOOLEAN NOT NULL DEFAULT FALSE,
  staff_base_branch_id INT DEFAULT NULL,
  checked_in_at DATETIME DEFAULT NULL,
  checked_out_at DATETIME DEFAULT NULL,
  actual_hours DECIMAL(4,2) DEFAULT NULL,
  notes VARCHAR(255) DEFAULT NULL,
  assigned_by INT NOT NULL,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_shift_staff (shift_id, staff_user_id),
  KEY idx_assignments_staff (staff_user_id),
  KEY idx_assignments_shift (shift_id),
  KEY idx_assignments_status (status),
  KEY idx_assignments_borrowed (is_borrowed_staff),
  CONSTRAINT fk_assignments_shift FOREIGN KEY (shift_id)
    REFERENCES shifts(shift_id) ON DELETE CASCADE,
  CONSTRAINT fk_assignments_staff FOREIGN KEY (staff_user_id)
    REFERENCES staff_profiles(user_id) ON DELETE CASCADE
  -- NOTE: role_id and staff_base_branch_id are loose references
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Cross-branch requests (borrowing staff)
DROP TABLE IF EXISTS cross_branch_requests;
CREATE TABLE cross_branch_requests (
  request_id INT PRIMARY KEY AUTO_INCREMENT,
  from_branch_id INT NOT NULL,
  to_branch_id INT NOT NULL,
  staff_user_id INT NOT NULL,
  shift_id INT NOT NULL,
  requested_by INT NOT NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')
    NOT NULL DEFAULT 'PENDING',
  reason VARCHAR(255) DEFAULT NULL,
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by INT DEFAULT NULL,
  reviewed_at DATETIME DEFAULT NULL,
  review_notes VARCHAR(255) DEFAULT NULL,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_cross_branch_from (from_branch_id),
  KEY idx_cross_branch_to (to_branch_id),
  KEY idx_cross_branch_staff (staff_user_id),
  KEY idx_cross_branch_shift (shift_id),
  KEY idx_cross_branch_status (status),
  CONSTRAINT fk_cross_branch_shift FOREIGN KEY (shift_id)
    REFERENCES shifts(shift_id) ON DELETE CASCADE
  -- NOTE: branch & staff references are loose (no cross-DB FK)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Generic shift requests: SWAP / LEAVE / OVERTIME
DROP TABLE IF EXISTS shift_requests;
CREATE TABLE shift_requests (
  request_id INT PRIMARY KEY AUTO_INCREMENT,
  assignment_id INT NOT NULL,
  staff_user_id INT NOT NULL,
  request_type ENUM('SWAP', 'PICK_UP', 'TWO_WAY_SWAP', 'LEAVE', 'OVERTIME') NOT NULL,
  target_staff_user_id INT DEFAULT NULL,
  overtime_hours DECIMAL(4,2) DEFAULT NULL,
  reason VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by INT DEFAULT NULL,
  reviewed_at DATETIME DEFAULT NULL,
  review_notes VARCHAR(255) DEFAULT NULL,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_shift_requests_assignment (assignment_id),
  KEY idx_shift_requests_staff (staff_user_id),
  KEY idx_shift_requests_target_staff (target_staff_user_id),
  KEY idx_shift_requests_type_status (request_type, status),
  CONSTRAINT fk_shift_requests_assignment FOREIGN KEY (assignment_id)
    REFERENCES shift_assignments(assignment_id) ON DELETE CASCADE
  -- NOTE: staff_user_id and target_staff_user_id are loose references
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Staff availability definitions (for auto-assign)
DROP TABLE IF EXISTS staff_availability;
CREATE TABLE staff_availability (
  availability_id INT PRIMARY KEY AUTO_INCREMENT,
  staff_user_id INT NOT NULL,
  day_of_week TINYINT NOT NULL, -- 1=Monday .. 7=Sunday
  start_time TIME DEFAULT NULL,
  end_time TIME DEFAULT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  notes VARCHAR(255) DEFAULT NULL,
  effective_from DATE DEFAULT NULL,
  effective_to DATE DEFAULT NULL,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_availability_staff (staff_user_id),
  KEY idx_availability_day (day_of_week),
  CONSTRAINT fk_availability_staff FOREIGN KEY (staff_user_id)
    REFERENCES staff_profiles(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- PAYROLL MANAGEMENT SYSTEM - Database Schema
-- =====================================================
-- Tạo các bảng mới cho hệ thống quản lý lương, thưởng, phạt
-- =====================================================

-- Bảng PAYROLLS - Lương chính
DROP TABLE IF EXISTS payrolls;
CREATE TABLE payrolls (
  payroll_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL 
    COMMENT 'user_id của Staff hoặc Manager',
  user_role ENUM('STAFF', 'MANAGER') NOT NULL 
    COMMENT 'Vai trò: STAFF hoặc MANAGER',
  branch_id INT NOT NULL 
    COMMENT 'Chi nhánh',
  period VARCHAR(7) NOT NULL 
    COMMENT 'Kỳ lương: Format YYYY-MM (ví dụ: 2024-01)',
  
  -- Thành phần lương (Snapshot - lưu giá trị tại thời điểm tính)
  base_salary DECIMAL(12,2) NOT NULL DEFAULT 0.00 
    COMMENT 'Lương cơ bản',
  base_salary_snapshot DECIMAL(12,2) DEFAULT 0.00 
    COMMENT 'Snapshot lương cơ bản tại thời điểm tính (audit trail)',
  hourly_rate_snapshot DECIMAL(12,2) DEFAULT 0.00 
    COMMENT 'Snapshot lương theo giờ tại thời điểm tính (audit trail)',
  insurance_salary_snapshot DECIMAL(12,2) DEFAULT 0.00 
    COMMENT 'Snapshot lương đóng BH tại thời điểm tính',
  
  -- Overtime
  overtime_hours DECIMAL(4,2) DEFAULT 0.00 
    COMMENT 'Tổng số giờ tăng ca',
  overtime_pay DECIMAL(12,2) DEFAULT 0.00 
    COMMENT 'Tiền tăng ca',
  
  -- Các khoản cộng
  total_allowances DECIMAL(12,2) DEFAULT 0.00 
    COMMENT 'Tổng phụ cấp',
  total_bonuses DECIMAL(12,2) DEFAULT 0.00 
    COMMENT 'Tổng thưởng',
  
  -- Các khoản trừ
  total_penalties DECIMAL(12,2) DEFAULT 0.00 
    COMMENT 'Tổng phạt',
  
  -- Tổng lương
  gross_salary DECIMAL(12,2) NOT NULL DEFAULT 0.00 
    COMMENT 'Tổng lương trước thuế = base + overtime + allowances + bonuses',
  
  -- Khấu trừ (tách rõ từng khoản)
  amount_insurances DECIMAL(15,2) DEFAULT 0.00 
    COMMENT 'Tổng BHXH + BHYT + BHTN (10.5% insurance_salary)',
  amount_tax DECIMAL(15,2) DEFAULT 0.00 
    COMMENT 'Thuế thu nhập cá nhân (TNCN)',
  amount_advances DECIMAL(15,2) DEFAULT 0.00 
    COMMENT 'Ứng lương (nếu có)',
  total_deductions DECIMAL(15,2) DEFAULT 0.00 
    COMMENT 'Tổng khấu trừ = insurances + tax + advances',
  
  -- Lương thực nhận
  net_salary DECIMAL(15,2) NOT NULL DEFAULT 0.00 
    COMMENT 'Lương thực nhận = gross - total_deductions - penalties',
  
  -- Trạng thái và quy trình
  status ENUM('DRAFT', 'REVIEW', 'APPROVED', 'PAID') NOT NULL DEFAULT 'DRAFT' 
    COMMENT 'Trạng thái: DRAFT (nháp), REVIEW (xem xét), APPROVED (đã duyệt), PAID (đã thanh toán)',
  created_by INT NOT NULL 
    COMMENT 'user_id của người tạo (Manager hoặc Admin)',
  approved_by INT DEFAULT NULL 
    COMMENT 'user_id của người duyệt',
  approved_at DATETIME DEFAULT NULL 
    COMMENT 'Thời gian duyệt',
  paid_at DATETIME DEFAULT NULL 
    COMMENT 'Thời gian thanh toán',
  
  -- Ghi chú
  notes TEXT 
    COMMENT 'Ghi chú',
  
  -- Timestamps
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Constraints và Indexes
  UNIQUE KEY ux_user_period (user_id, period) 
    COMMENT 'Mỗi nhân viên chỉ có 1 payroll mỗi kỳ',
  KEY idx_branch_period (branch_id, period),
  KEY idx_branch_period_role (branch_id, period, user_role),
  KEY idx_status (status),
  KEY idx_created_by (created_by),
  KEY idx_approved_by (approved_by),
  KEY idx_period (period),
  KEY idx_payrolls_user_period_status (user_id, period, status),
  KEY idx_payrolls_branch_status (branch_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Bảng lương chính - Lưu thông tin lương hàng tháng của nhân viên';

-- Bảng BONUSES - Thưởng
DROP TABLE IF EXISTS bonuses;
CREATE TABLE bonuses (
  bonus_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL 
    COMMENT 'user_id của Staff hoặc Manager',
  user_role ENUM('STAFF', 'MANAGER') NOT NULL 
    COMMENT 'Vai trò: STAFF hoặc MANAGER',
  branch_id INT NOT NULL 
    COMMENT 'Chi nhánh',
  period VARCHAR(7) NOT NULL 
    COMMENT 'Kỳ lương: Format YYYY-MM',
  
  -- Thông tin thưởng
  bonus_type ENUM('PERFORMANCE', 'STORE_TARGET', 'HOLIDAY', 'REFERRAL', 'SPECIAL') NOT NULL 
    COMMENT 'Loại thưởng: PERFORMANCE (hiệu suất), STORE_TARGET (đạt chỉ tiêu), HOLIDAY (lễ tết), REFERRAL (giới thiệu), SPECIAL (đặc biệt)',
  amount DECIMAL(12,2) NOT NULL 
    COMMENT 'Số tiền thưởng',
  description TEXT 
    COMMENT 'Mô tả lý do thưởng',
  criteria_ref VARCHAR(255) 
    COMMENT 'Tham chiếu đến tiêu chí (ví dụ: sales_target_id, performance_metric_id)',
  shift_id INT DEFAULT NULL
    COMMENT 'Ca làm việc liên quan (nullable)',
  
  -- Trạng thái và quy trình
  status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING' 
    COMMENT 'Trạng thái: PENDING (chờ duyệt), APPROVED (đã duyệt), REJECTED (từ chối)',
  created_by INT NOT NULL 
    COMMENT 'user_id của người tạo (Manager hoặc Admin)',
  approved_by INT DEFAULT NULL 
    COMMENT 'user_id của người duyệt',
  approved_at DATETIME DEFAULT NULL 
    COMMENT 'Thời gian duyệt',
  rejection_reason TEXT 
    COMMENT 'Lý do từ chối',
  
  -- Timestamps
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Constraints và Indexes
  KEY idx_user_period (user_id, period),
  KEY idx_branch_period (branch_id, period),
  KEY idx_status (status),
  KEY idx_bonus_type (bonus_type),
  KEY idx_bonus_shift_id (shift_id),
  KEY idx_created_by (created_by),
  KEY idx_period (period),
  KEY idx_bonuses_user_status (user_id, status),
  KEY idx_bonuses_branch_status (branch_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Bảng thưởng - Lưu các khoản thưởng cho nhân viên';

-- Bảng PENALTIES - Phạt
DROP TABLE IF EXISTS penalties;
CREATE TABLE penalties (
  penalty_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL 
    COMMENT 'user_id của Staff hoặc Manager',
  user_role ENUM('STAFF', 'MANAGER') NOT NULL 
    COMMENT 'Vai trò: STAFF hoặc MANAGER',
  branch_id INT NOT NULL 
    COMMENT 'Chi nhánh',
  period VARCHAR(7) NOT NULL 
    COMMENT 'Kỳ lương: Format YYYY-MM',
  
  -- Thông tin phạt
  penalty_type ENUM('LATE', 'NO_SHOW', 'EARLY_LEAVE', 'VIOLATION', 'UNPAID_LEAVE', 'OTHER') NOT NULL 
    COMMENT 'Loại phạt: LATE (đi muộn), NO_SHOW (không đi làm), EARLY_LEAVE (về sớm), VIOLATION (vi phạm), UNPAID_LEAVE (nghỉ không phép), OTHER (khác)',
  amount DECIMAL(12,2) NOT NULL 
    COMMENT 'Số tiền phạt',
  reason_code VARCHAR(50) 
    COMMENT 'Mã lý do (ví dụ: LATE_15MIN, NO_SHOW_SHIFT_123)',
  description TEXT 
    COMMENT 'Mô tả chi tiết lý do phạt',
  incident_date DATE 
    COMMENT 'Ngày xảy ra sự cố',
  shift_id INT DEFAULT NULL 
    COMMENT 'Tham chiếu đến shift nếu liên quan đến ca làm việc',
  
  -- Trạng thái và quy trình
  status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING' 
    COMMENT 'Trạng thái: PENDING (chờ duyệt), APPROVED (đã duyệt), REJECTED (từ chối)',
  created_by INT NOT NULL 
    COMMENT 'user_id của người tạo (0 = System tự động, Manager hoặc Admin)',
  approved_by INT DEFAULT NULL 
    COMMENT 'user_id của người duyệt',
  approved_at DATETIME DEFAULT NULL 
    COMMENT 'Thời gian duyệt',
  rejection_reason TEXT 
    COMMENT 'Lý do từ chối',
  
  -- Timestamps
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Constraints và Indexes
  KEY idx_user_period (user_id, period),
  KEY idx_branch_period (branch_id, period),
  KEY idx_status (status),
  KEY idx_penalty_type (penalty_type),
  KEY idx_shift_id (shift_id),
  KEY idx_created_by (created_by),
  KEY idx_period (period),
  KEY idx_incident_date (incident_date),
  KEY idx_penalties_user_status (user_id, status),
  KEY idx_penalties_branch_status (branch_id, status),
  KEY idx_penalties_shift_status (shift_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Bảng phạt - Lưu các khoản phạt cho nhân viên';

-- Bảng ALLOWANCES - Phụ cấp
DROP TABLE IF EXISTS allowances;
CREATE TABLE allowances (
  allowance_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL 
    COMMENT 'user_id của Staff hoặc Manager',
  user_role ENUM('STAFF', 'MANAGER') NOT NULL 
    COMMENT 'Vai trò: STAFF hoặc MANAGER',
  branch_id INT NOT NULL 
    COMMENT 'Chi nhánh',
  period VARCHAR(7) NOT NULL 
    COMMENT 'Kỳ lương: Format YYYY-MM',
  
  -- Thông tin phụ cấp
  allowance_type ENUM('MEAL', 'TRANSPORT', 'PHONE', 'ROLE', 'OTHER') NOT NULL 
    COMMENT 'Loại phụ cấp: MEAL (ăn trưa), TRANSPORT (đi lại), PHONE (điện thoại), ROLE (chức vụ), OTHER (khác)',
  amount DECIMAL(12,2) NOT NULL 
    COMMENT 'Số tiền phụ cấp',
  description TEXT 
    COMMENT 'Mô tả',
  
  -- Trạng thái
  status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE' 
    COMMENT 'Trạng thái: ACTIVE (đang áp dụng), INACTIVE (không áp dụng)',
  
  -- Timestamps
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Constraints và Indexes
  KEY idx_user_period (user_id, period),
  KEY idx_branch_period (branch_id, period),
  KEY idx_status (status),
  KEY idx_allowance_type (allowance_type),
  KEY idx_period (period),
  KEY idx_allowances_user_status (user_id, status),
  KEY idx_allowances_branch_status (branch_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Bảng phụ cấp - Lưu các khoản phụ cấp cho nhân viên';

-- Bảng PENALTY_CONFIG - Cấu hình mức phạt (Tùy chọn)
-- Thiết kế đạt 3NF: scope được tính từ branch_id (NULL = SYSTEM, có giá trị = BRANCH)
DROP TABLE IF EXISTS penalty_config;
CREATE TABLE penalty_config (
  config_id INT PRIMARY KEY AUTO_INCREMENT,
  branch_id INT DEFAULT NULL 
    COMMENT 'NULL = SYSTEM scope (toàn bộ), có giá trị = BRANCH scope (chi nhánh cụ thể)',
  name VARCHAR(100) NOT NULL 
    COMMENT 'Tên template (ví dụ: Phạt không đi làm)',
  penalty_type VARCHAR(50) NOT NULL 
    COMMENT 'Loại phạt (ví dụ: NO_SHOW, LATE_15MIN, LATE_30MIN)',
  amount DECIMAL(12,2) NOT NULL 
    COMMENT 'Số tiền phạt',
  description TEXT 
    COMMENT 'Mô tả',
  created_by INT DEFAULT NULL 
    COMMENT 'Admin user_id',
  is_active BOOLEAN DEFAULT TRUE 
    COMMENT 'Có đang áp dụng không',
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_penalty_type_branch (penalty_type, branch_id) 
    COMMENT 'Mỗi penalty_type chỉ có 1 config cho mỗi branch (hoặc NULL cho SYSTEM)',
  KEY idx_is_active (is_active),
  KEY idx_branch_id (branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Bảng cấu hình mức phạt - Lưu các mức phạt mặc định. Scope = SYSTEM nếu branch_id NULL, BRANCH nếu branch_id có giá trị';

-- Insert dữ liệu mẫu cho penalty_config (SYSTEM scope - branch_id = NULL)
INSERT INTO penalty_config (name, penalty_type, amount, description, branch_id, is_active) VALUES
('Phạt không đi làm', 'NO_SHOW', 100000, 'Phạt không đi làm (NO_SHOW)', NULL, TRUE),
('Phạt đi muộn 15 phút', 'LATE_15MIN', 30000, 'Phạt đi muộn 15 phút', NULL, TRUE),
('Phạt đi muộn 30 phút', 'LATE_30MIN', 50000, 'Phạt đi muộn 30 phút', NULL, TRUE),
('Phạt về sớm', 'EARLY_LEAVE', 50000, 'Phạt về sớm', NULL, TRUE),
('Nghỉ không phép', 'UNPAID_LEAVE', 0, 'Nghỉ không phép (tính theo lương ngày)', NULL, TRUE);

-- Bảng ALLOWANCE_TEMPLATES - Template phụ cấp
-- Thiết kế đạt 3NF: scope được tính từ branch_id (NULL = SYSTEM, có giá trị = BRANCH)
DROP TABLE IF EXISTS allowance_templates;
CREATE TABLE allowance_templates (
  template_id INT PRIMARY KEY AUTO_INCREMENT,
  branch_id INT DEFAULT NULL 
    COMMENT 'NULL = SYSTEM scope (toàn bộ), có giá trị = BRANCH scope (chi nhánh cụ thể)',
  name VARCHAR(100) NOT NULL 
    COMMENT 'Tên template (ví dụ: Phụ cấp ăn trưa)',
  allowance_type ENUM('MEAL', 'TRANSPORT', 'PHONE', 'ROLE', 'OTHER') NOT NULL,
  amount DECIMAL(12,2) NOT NULL 
    COMMENT 'Số tiền mẫu',
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT NOT NULL 
    COMMENT 'Admin user_id',
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_branch_id (branch_id),
  KEY idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Bảng template phụ cấp - Admin tạo, Manager có thể apply. Scope = SYSTEM nếu branch_id NULL, BRANCH nếu branch_id có giá trị';

-- Bảng BONUS_TEMPLATES - Template thưởng
-- Thiết kế đạt 3NF: scope được tính từ branch_id (NULL = SYSTEM, có giá trị = BRANCH)
DROP TABLE IF EXISTS bonus_templates;
CREATE TABLE bonus_templates (
  template_id INT PRIMARY KEY AUTO_INCREMENT,
  branch_id INT DEFAULT NULL 
    COMMENT 'NULL = SYSTEM scope (toàn bộ), có giá trị = BRANCH scope (chi nhánh cụ thể)',
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Bảng template thưởng - Admin tạo, Manager có thể apply. Scope = SYSTEM nếu branch_id NULL, BRANCH nếu branch_id có giá trị';

-- Cập nhật bảng allowances để track template
ALTER TABLE allowances 
  ADD COLUMN source_template_id INT DEFAULT NULL 
    COMMENT 'ID của template được sử dụng (NULL = custom)',
  ADD KEY idx_source_template (source_template_id);

-- Cập nhật bảng bonuses để track template
ALTER TABLE bonuses 
  ADD COLUMN source_template_id INT DEFAULT NULL 
    COMMENT 'ID của template được sử dụng (NULL = custom)',
  ADD KEY idx_source_template (source_template_id);

-- Cập nhật bảng penalties để track template
ALTER TABLE penalties 
  ADD COLUMN source_template_id INT DEFAULT NULL 
    COMMENT 'ID của template/penalty_config được sử dụng (NULL = custom)',
  ADD KEY idx_source_template (source_template_id);

-- Bảng HOLIDAYS - Ngày lễ (Tùy chọn - để tính OT)
DROP TABLE IF EXISTS holidays;
CREATE TABLE holidays (
  holiday_id INT PRIMARY KEY AUTO_INCREMENT,
  holiday_date DATE NOT NULL 
    COMMENT 'Ngày lễ',
  holiday_name VARCHAR(255) NOT NULL 
    COMMENT 'Tên ngày lễ',
  is_national BOOLEAN DEFAULT TRUE 
    COMMENT 'Có phải ngày lễ quốc gia không',
  is_active BOOLEAN DEFAULT TRUE 
    COMMENT 'Có đang áp dụng không',
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_holiday_date (holiday_date),
  KEY idx_holiday_date (holiday_date),
  KEY idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Bảng ngày lễ - Lưu các ngày lễ để tính OT hệ số cao';

-- Insert một số ngày lễ mẫu (2024)
INSERT INTO holidays (holiday_date, holiday_name, is_national, is_active) VALUES
('2024-01-01', 'Tết Dương lịch', TRUE, TRUE),
('2024-02-10', 'Tết Nguyên Đán (Mùng 1)', TRUE, TRUE),
('2024-02-11', 'Tết Nguyên Đán (Mùng 2)', TRUE, TRUE),
('2024-02-12', 'Tết Nguyên Đán (Mùng 3)', TRUE, TRUE),
('2024-04-18', 'Giỗ Tổ Hùng Vương', TRUE, TRUE),
('2024-04-30', 'Ngày Giải phóng miền Nam', TRUE, TRUE),
('2024-05-01', 'Ngày Quốc tế Lao động', TRUE, TRUE),
('2024-09-02', 'Quốc khánh', TRUE, TRUE);
