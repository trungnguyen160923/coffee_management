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
  hourly_rate DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  overtime_rate DECIMAL(12,2) DEFAULT NULL,
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
  target_assignment_id INT DEFAULT NULL,
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
    REFERENCES shift_assignments(assignment_id) ON DELETE CASCADE,
  CONSTRAINT fk_shift_requests_target_assignment FOREIGN KEY (target_assignment_id)
    REFERENCES shift_assignments(assignment_id) ON DELETE SET NULL
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
