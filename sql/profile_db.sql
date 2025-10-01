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
  position VARCHAR(100) NOT NULL,
  hire_date DATE NOT NULL,
  salary DECIMAL(12,2) NOT NULL DEFAULT 0.00,
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
