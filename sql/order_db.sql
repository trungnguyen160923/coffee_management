-- order_db SQL
-- Tables: branches, cafe_tables, reservations, reservation_tables, orders, order_details, reviews

DROP DATABASE IF EXISTS order_db;
CREATE DATABASE order_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE order_db;

-- Branches
DROP TABLE IF EXISTS branches;
CREATE TABLE branches (
  branch_id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  address VARCHAR(255) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  manager_user_id INT DEFAULT NULL, -- loose reference to users/manager_profiles
  openhours TIME DEFAULT '08:00:00',
  endhours TIME DEFAULT '22:00:00',
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tables (physical tables in a branch)
DROP TABLE IF EXISTS cafe_tables;
CREATE TABLE cafe_tables (
  table_id INT NOT NULL AUTO_INCREMENT,
  branch_id INT NOT NULL,
  label VARCHAR(50) NOT NULL,
  capacity INT NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (table_id),
  KEY idx_tables_branch_id (branch_id),
  CONSTRAINT fk_tables_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reservations
DROP TABLE IF EXISTS reservations;
CREATE TABLE reservations (
  reservation_id INT NOT NULL AUTO_INCREMENT,
  customer_id INT DEFAULT NULL, -- loose reference to customer_profiles/user_id
  customer_name VARCHAR(50) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  branch_id INT NOT NULL,
  reserved_at DATETIME NOT NULL, -- when the reservation is scheduled for
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  party_size INT NOT NULL DEFAULT 1,
  notes VARCHAR(255) DEFAULT NULL,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (reservation_id),
  KEY idx_res_branch_id (branch_id),
  CONSTRAINT fk_res_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE,
  -- Ít nhất phải có customer_id hoặc (customer_name + phone)
  CONSTRAINT chk_customer_info CHECK (
    customer_id IS NOT NULL OR (customer_name IS NOT NULL AND phone IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reservation <-> Tables mapping
DROP TABLE IF EXISTS reservation_tables;
CREATE TABLE reservation_tables (
  id INT NOT NULL AUTO_INCREMENT,
  reservation_id INT NOT NULL,
  table_id INT NOT NULL,
  PRIMARY KEY (id),
  KEY idx_rt_reservation_id (reservation_id),
  KEY idx_rt_table_id (table_id),
  CONSTRAINT fk_rt_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id) ON DELETE CASCADE,
  CONSTRAINT fk_rt_table FOREIGN KEY (table_id) REFERENCES cafe_tables(table_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Orders
DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
  order_id INT NOT NULL AUTO_INCREMENT,
  customer_id INT DEFAULT NULL, -- loose reference to customer_profiles/user_id
  customer_name VARCHAR(50) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  branch_id INT NOT NULL,
  table_id INT DEFAULT NULL,
  reservation_id INT DEFAULT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'CREATED',
  payment_method VARCHAR(50) DEFAULT NULL,
  payment_status VARCHAR(50) DEFAULT 'PENDING',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id),
  KEY idx_orders_branch_id (branch_id),
  KEY idx_orders_table_id (table_id),
  KEY idx_orders_reservation_id (reservation_id),
  CONSTRAINT fk_orders_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE RESTRICT,
  CONSTRAINT fk_orders_table FOREIGN KEY (table_id) REFERENCES cafe_tables(table_id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id) ON DELETE SET NULL,
  -- Ít nhất phải có customer_id hoặc (customer_name + phone)
  CONSTRAINT chk_customer_info_1 CHECK (
    customer_id IS NOT NULL OR (customer_name IS NOT NULL AND phone IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Order details (line items)
DROP TABLE IF EXISTS order_details;
CREATE TABLE order_details (
  id INT NOT NULL AUTO_INCREMENT,
  order_id INT NOT NULL,
  product_id INT NOT NULL, -- loose reference to catalog_db.products
  size_id INT DEFAULT NULL, -- loose reference to catalog_db.sizes/product_sizes
  qty DECIMAL(12,2) NOT NULL DEFAULT 1.00,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  line_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  note VARCHAR(255) DEFAULT NULL,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_od_order_id (order_id),
  CONSTRAINT fk_od_order FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reviews (product/branch reviews)
DROP TABLE IF EXISTS reviews;
CREATE TABLE reviews (
  review_id INT NOT NULL AUTO_INCREMENT,
  product_id INT DEFAULT NULL, -- loose reference to catalog_db.products
  customer_id INT DEFAULT NULL, -- loose reference to customer_profiles/user_id
  branch_id INT DEFAULT NULL,
  rating TINYINT NOT NULL DEFAULT 5, -- 1..5
  comment TEXT DEFAULT NULL,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (review_id),
  KEY idx_reviews_branch_id (branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Example seeds (optional)
INSERT INTO branches (name, address, phone, openhours, endhours) 
VALUES ('Main Branch', '123 Coffee St', '+84123456789', '08:00:00', '22:00:00');
CREATE TABLE IF NOT EXISTS carts (
  cart_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_carts_user_id (user_id)
);

-- cart_items
CREATE TABLE IF NOT EXISTS cart_items (
  cart_item_id INT PRIMARY KEY AUTO_INCREMENT,
  cart_id INT NOT NULL,
  product_id INT NOT NULL,
  product_detail_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_cart_items_cart_id (cart_id),
  KEY idx_cart_items_product_id (product_id),
  KEY idx_cart_items_pd_id (product_detail_id),
  CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) REFERENCES carts(cart_id) ON DELETE CASCADE
);
