-- auth_db SQL (MySQL-friendly)
DROP DATABASE IF EXISTS auth_db;
CREATE DATABASE auth_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE auth_db;

-- Roles table
DROP TABLE IF EXISTS roles;
CREATE TABLE roles (
  role_id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE,
  PRIMARY KEY (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users table (create_at / update_at default values)
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  user_id INT NOT NULL AUTO_INCREMENT,
  email VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL,
  fullname VARCHAR(100) NOT NULL,
  phone_number VARCHAR(15) DEFAULT NULL,
  role_id INT NOT NULL,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  KEY idx_users_role_id (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE users
  ADD CONSTRAINT fk_users_role
  FOREIGN KEY (role_id) REFERENCES roles(role_id)
  ON UPDATE NO ACTION ON DELETE NO ACTION;

-- Invalidated tokens table
DROP TABLE IF EXISTS invalidated_tokens;
CREATE TABLE invalidated_tokens (
  id VARCHAR(255) NOT NULL, -- JWT ID (jti) hoặc token string
  expiry_time DATETIME NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Example seed
INSERT INTO roles (name) VALUES ('ADMIN'), ('MANAGER'), ('STAFF'), ('CUSTOMER');

-- Event: tự động xóa token hết hạn lúc 00:00 hằng ngày
DROP EVENT IF EXISTS ev_clean_invalidated_tokens;
CREATE EVENT ev_clean_invalidated_tokens
ON SCHEDULE EVERY 1 DAY
STARTS TIMESTAMP(CURRENT_DATE, '00:00:00')
DO
  DELETE FROM invalidated_tokens
  WHERE expiry_time < NOW();