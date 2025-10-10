-- catalog_db SQL extracted and adapted from your schema
-- Tables: categories, products, sizes, product_sizes, recipes, recipe_items,
--         ingredients, suppliers, purchase_orders, purchase_order_details, stocks
-- create_at and update_at use CURRENT_TIMESTAMP defaults.
-- Decimal columns use scale 2 (DECIMAL(12,2)).
-- Note: keep references internal to this DB; references to branches/users are loose.

DROP DATABASE IF EXISTS catalog_db;
CREATE DATABASE catalog_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE catalog_db;

-- Categories
DROP TABLE IF EXISTS categories;
CREATE TABLE `categories` (
  `category_id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) DEFAULT null,
  `create_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS sizes;
CREATE TABLE `sizes` (
  `size_id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `description` VARCHAR(255) DEFAULT null,
  `create_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS products;
CREATE TABLE `products` (
  `product_id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `image_url` VARCHAR(255) DEFAULT null,
  `category_id` INT DEFAULT null,
  `sku` VARCHAR(100) DEFAULT null,
  `description` TEXT DEFAULT null,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `create_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS product_details;
CREATE TABLE `product_details` (
  `pd_id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  `product_id` INT NOT NULL,
  `size_id` INT NULL,
  `price` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `create_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS suppliers;
CREATE TABLE `suppliers` (
  `supplier_id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `contact_name` VARCHAR(150) DEFAULT null,
  `phone` VARCHAR(20) DEFAULT null,
  `email` VARCHAR(100) DEFAULT null,
  `address` VARCHAR(255) DEFAULT null,
  `note` VARCHAR(255) DEFAULT null,
  `create_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS units;
CREATE TABLE `units` (
  `code` VARCHAR(20) PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL,
  `dimension` VARCHAR(20) NOT NULL,
  `factor_to_base` DECIMAL(18,8) NOT NULL,
  `base_unit_code` VARCHAR(20) NOT NULL,
  `create_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS ingredients;
CREATE TABLE `ingredients` (
  `ingredient_id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `unit_code` VARCHAR(20) NOT NULL,
  `unit_price` DECIMAL(12,4) NOT NULL DEFAULT 0,
  `supplier_id` INT DEFAULT null,
  `create_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS recipes;
CREATE TABLE `recipes` (
  `recipe_id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `pd_id` INT DEFAULT null,
  `version` INT NOT NULL DEFAULT 1,
  `description` TEXT DEFAULT null,
  `yield` DECIMAL(12,4) DEFAULT 1,
  `instructions` TEXT NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  `create_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS recipe_items;
CREATE TABLE `recipe_items` (
  `id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  `recipe_id` INT NOT NULL,
  `ingredient_id` INT NOT NULL,
  `qty` DECIMAL(12,4) NOT NULL DEFAULT 0,
  `unit_code` VARCHAR(20) NOT NULL,
  `note` VARCHAR(255) DEFAULT null,
  `create_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS purchase_orders;
CREATE TABLE `purchase_orders` (
  `po_id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  `po_number` VARCHAR(100) UNIQUE NOT NULL,
  `supplier_id` INT NOT NULL,
  `branch_id` INT DEFAULT null,
  `status` VARCHAR(50) NOT NULL DEFAULT 'CREATED',
  `total_amount` DECIMAL(12,4) NOT NULL DEFAULT 0,
  `expected_delivery_at` DATETIME NULL,
  `sent_at` DATETIME NULL,
  `confirmed_at` DATETIME NULL,
  `supplier_response` TEXT DEFAULT NULL,
  `create_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS purchase_order_details;
CREATE TABLE `purchase_order_details` (
  `id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  `po_id` INT NOT NULL,
  `ingredient_id` INT NOT NULL,
  `unit_code` VARCHAR(20) NOT NULL,
  `qty` DECIMAL(12,4) NOT NULL DEFAULT 0,
  `unit_price` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `line_total` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `create_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS stocks;
CREATE TABLE `stocks` (
  `stock_id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  `ingredient_id` INT NOT NULL,
  `branch_id` INT DEFAULT null,
  `quantity` DECIMAL(12,4) NOT NULL DEFAULT 0,
  `unit_code` VARCHAR(20) NOT NULL,
  `threshold` DECIMAL(12,4) NOT NULL DEFAULT 0,
  `last_updated` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX `idx_products_category_id` ON `products` (`category_id`);

CREATE UNIQUE INDEX `ux_products_sku` ON `products` (`sku`);

CREATE INDEX `idx_ps_product_id` ON `product_details` (`product_id`);

CREATE INDEX `idx_ps_size_id` ON `product_details` (`size_id`);

CREATE INDEX `idx_ingredients_supplier_id` ON `ingredients` (`supplier_id`);

CREATE INDEX `idx_recipes_product_id` ON `recipes` (`pd_id`);
CREATE INDEX `idx_recipes_category_id` ON `recipes` (`category_id`);

CREATE INDEX `idx_ri_recipe_id` ON `recipe_items` (`recipe_id`);

CREATE INDEX `idx_ri_ingredient_id` ON `recipe_items` (`ingredient_id`);

CREATE INDEX `idx_po_supplier_id` ON `purchase_orders` (`supplier_id`);

CREATE INDEX `idx_pod_po_id` ON `purchase_order_details` (`po_id`);

CREATE INDEX `idx_pod_ingredient_id` ON `purchase_order_details` (`ingredient_id`);

CREATE INDEX `idx_stocks_ingredient_id` ON `stocks` (`ingredient_id`);

ALTER TABLE `products` ADD CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE `product_details` ADD CONSTRAINT `fk_pd_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE;

ALTER TABLE `product_details` ADD CONSTRAINT `fk_pd_size` FOREIGN KEY (`size_id`) REFERENCES `sizes` (`size_id`) ON DELETE RESTRICT;

ALTER TABLE `ingredients` ADD CONSTRAINT `fk_ingredients_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE `recipes` ADD CONSTRAINT `fk_recipes_pd` FOREIGN KEY (`pd_id`) REFERENCES `product_details` (`pd_id`) ON DELETE CASCADE;

ALTER TABLE `recipe_items` ADD CONSTRAINT `fk_ri_recipe` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`recipe_id`) ON DELETE CASCADE;

ALTER TABLE `recipe_items` ADD CONSTRAINT `fk_ri_ingredient` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`ingredient_id`) ON DELETE RESTRICT;

ALTER TABLE `purchase_orders` ADD CONSTRAINT `fk_po_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE `purchase_order_details` ADD CONSTRAINT `fk_pod_po` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`po_id`) ON DELETE CASCADE;

ALTER TABLE `purchase_order_details` ADD CONSTRAINT `fk_pod_ingredient` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`ingredient_id`) ON DELETE RESTRICT;

ALTER TABLE `stocks` ADD CONSTRAINT `fk_stocks_ingredient` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`ingredient_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE ingredients ADD CONSTRAINT fk_ingredients_unit_code FOREIGN KEY (unit_code) REFERENCES units(code) ON DELETE RESTRICT;

ALTER TABLE recipe_items ADD CONSTRAINT fk_recipe_items_unit_code FOREIGN KEY (unit_code) REFERENCES units(code) ON DELETE RESTRICT;

ALTER TABLE stocks ADD CONSTRAINT fk_stocks_unit_code FOREIGN KEY (unit_code) REFERENCES units(code) ON DELETE RESTRICT;

ALTER TABLE purchase_order_details ADD CONSTRAINT fk_pod_unit_code FOREIGN KEY (unit_code) REFERENCES units(code) ON DELETE RESTRICT;

ALTER TABLE units ADD CONSTRAINT fk_units_base_unit FOREIGN KEY (base_unit_code) REFERENCES units(code) ON DELETE CASCADE;

ALTER TABLE sizes ADD UNIQUE uq_sizes_name (name);

ALTER TABLE categories ADD UNIQUE uq_categories_name (name);

ALTER TABLE product_details ADD UNIQUE uq_product_size (product_id, size_id);

ALTER TABLE recipes ADD UNIQUE uq_recipe_version (pd_id, version);

ALTER TABLE stocks ADD UNIQUE uq_stock_ingredient_branch (ingredient_id, branch_id);


-- Inventory and receiving tables

-- Inventory transactions: audit trail for stock movements
DROP TABLE IF EXISTS inventory_transactions;
CREATE TABLE inventory_transactions (
  id            BIGINT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  branch_id     INT NOT NULL,
  ingredient_id INT NOT NULL,
  txn_type      ENUM('RECEIPT','ISSUE','ADJUST_IN','ADJUST_OUT','RETURN_TO_SUPPLIER') NOT NULL,
  qty_in        DECIMAL(12,4) NOT NULL DEFAULT 0,
  qty_out       DECIMAL(12,4) NOT NULL DEFAULT 0,
  unit_code     VARCHAR(20) NOT NULL,
  unit_price    DECIMAL(12,4) NOT NULL DEFAULT 0,
  line_total    DECIMAL(12,2) NOT NULL DEFAULT 0,
  ref_type      VARCHAR(50) NOT NULL,
  ref_id        VARCHAR(100) NOT NULL,
  before_qty    DECIMAL(12,4) NOT NULL DEFAULT 0,
  after_qty     DECIMAL(12,4) NOT NULL DEFAULT 0,
  conversion_factor DECIMAL(18,8) NULL ,
  ref_detail_id BIGINT NULL ,
  note          VARCHAR(255) DEFAULT NULL,
  create_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (qty_in >= 0),
  CHECK (qty_out >= 0),
  CHECK (unit_price >= 0),
  CHECK (before_qty >= 0),
  CHECK (after_qty >= 0)
);

CREATE INDEX idx_it_branch_ing ON inventory_transactions(branch_id, ingredient_id, create_at);
CREATE INDEX idx_it_ref ON inventory_transactions(ref_type, ref_id);
CREATE INDEX idx_it_ref_full ON inventory_transactions(ref_type, ref_id, ref_detail_id);

ALTER TABLE inventory_transactions
  ADD CONSTRAINT fk_it_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_it_unit FOREIGN KEY (unit_code) REFERENCES units(code) ON DELETE RESTRICT;


-- Goods receipts: header for receipts created from purchase orders
DROP TABLE IF EXISTS goods_receipts;
CREATE TABLE goods_receipts (
  grn_id       BIGINT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  grn_number   VARCHAR(100) UNIQUE NOT NULL,
  received_by  INT NOT NULL,
  po_id        INT NOT NULL,
  supplier_id  INT NOT NULL,
  branch_id    INT NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  received_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  create_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gr_po ON goods_receipts(po_id);
CREATE INDEX idx_gr_branch ON goods_receipts(branch_id, received_at);

ALTER TABLE goods_receipts
  ADD CONSTRAINT fk_gr_po FOREIGN KEY (po_id) REFERENCES purchase_orders(po_id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_gr_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE RESTRICT;


-- Goods receipt details: per-line receipt data (supports partial receive, discrepancies, lot info)
DROP TABLE IF EXISTS goods_receipt_details;
CREATE TABLE goods_receipt_details (
  id               BIGINT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  grn_id           BIGINT NOT NULL,
  po_id            INT NOT NULL,
  po_detail_id     INT NOT NULL,
  ingredient_id    INT NOT NULL,
  unit_code_input  VARCHAR(20) NOT NULL,
  qty_input        DECIMAL(12,4) NOT NULL DEFAULT 0,
  conversion_factor DECIMAL(18,8) NOT NULL DEFAULT 1.0,
  qty_base         DECIMAL(12,4) NOT NULL DEFAULT 0,  -- quantity in base unit
  unit_price       DECIMAL(12,4) NOT NULL DEFAULT 0,
  line_total       DECIMAL(12,2) NOT NULL DEFAULT 0,
  lot_number       VARCHAR(100) DEFAULT NULL,
  mfg_date         DATE DEFAULT NULL,
  exp_date         DATE DEFAULT NULL,
  status           ENUM('OK','SHORT','OVER','DAMAGE') NOT NULL DEFAULT 'OK',
  note             VARCHAR(255) DEFAULT NULL,
  create_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (qty_input >= 0),
  CHECK (conversion_factor > 0),
  CHECK (qty_base >= 0),
  CHECK (unit_price >= 0)
);

CREATE INDEX idx_grd_grn ON goods_receipt_details(grn_id);
CREATE INDEX idx_grd_po ON goods_receipt_details(po_id, po_detail_id);
CREATE INDEX idx_grd_ing ON goods_receipt_details(ingredient_id);

ALTER TABLE goods_receipt_details
  ADD CONSTRAINT fk_grd_grn FOREIGN KEY (grn_id) REFERENCES goods_receipts(grn_id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_grd_po FOREIGN KEY (po_id) REFERENCES purchase_orders(po_id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_grd_pod FOREIGN KEY (po_detail_id) REFERENCES purchase_order_details(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_grd_ing FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_grd_unit_input FOREIGN KEY (unit_code_input) REFERENCES units(code) ON DELETE RESTRICT;

-- Link inventory_transactions.ref_detail_id to goods_receipt_details (optional, nullable)
ALTER TABLE inventory_transactions
  ADD CONSTRAINT fk_it_ref_detail FOREIGN KEY (ref_detail_id) REFERENCES goods_receipt_details(id) ON DELETE SET NULL;


-- Inventory costs (weighted average per branch + ingredient)
DROP TABLE IF EXISTS inventory_costs;
CREATE TABLE inventory_costs (
  branch_id     INT NOT NULL,
  ingredient_id INT NOT NULL,
  avg_cost      DECIMAL(12,4) NOT NULL DEFAULT 0,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY(branch_id, ingredient_id),
  CHECK (avg_cost >= 0)
);

ALTER TABLE inventory_costs
  ADD CONSTRAINT fk_ic_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id) ON DELETE RESTRICT;

-- Ensure branch+ingredient pair exists in stocks (composite FK)
ALTER TABLE inventory_costs
  ADD CONSTRAINT fk_ic_stock_pair FOREIGN KEY (ingredient_id, branch_id)
  REFERENCES stocks(ingredient_id, branch_id) ON DELETE CASCADE;

-- Purchase order status history (audit trail)
DROP TABLE IF EXISTS purchase_order_status_history;
CREATE TABLE purchase_order_status_history (
  id          BIGINT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  po_id       INT NOT NULL,
  from_status VARCHAR(50) NOT NULL,
  to_status   VARCHAR(50) NOT NULL,
  changed_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  changed_by  VARCHAR(100) DEFAULT NULL,
  note        VARCHAR(255) DEFAULT NULL
);

CREATE INDEX idx_posh_po ON purchase_order_status_history(po_id, changed_at);

ALTER TABLE purchase_order_status_history
  ADD CONSTRAINT fk_posh_po FOREIGN KEY (po_id) REFERENCES purchase_orders(po_id) ON DELETE CASCADE;

-- Outbox logs for sending PO to supplier (email/API)
DROP TABLE IF EXISTS po_outbox_logs;
CREATE TABLE po_outbox_logs (
  id          BIGINT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  po_id       INT NOT NULL,
  to_email    VARCHAR(200) NOT NULL,
  cc          VARCHAR(500) DEFAULT NULL,
  subject     VARCHAR(200) DEFAULT NULL,
  sent_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status      VARCHAR(50) NOT NULL DEFAULT 'SENT',
  message_id  VARCHAR(200) DEFAULT NULL,
  error       VARCHAR(500) DEFAULT NULL,
  create_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_poo_po ON po_outbox_logs(po_id, sent_at);

ALTER TABLE po_outbox_logs
  ADD CONSTRAINT fk_poo_po FOREIGN KEY (po_id) REFERENCES purchase_orders(po_id) ON DELETE CASCADE;

-- Return Goods tables
DROP TABLE IF EXISTS return_goods;
CREATE TABLE return_goods (
  return_id       INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  return_number   VARCHAR(100) UNIQUE NOT NULL,
  received_by     INT NOT NULL,
  po_id           INT NOT NULL,
  supplier_id     INT NOT NULL,
  branch_id       INT NOT NULL,
  status          VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  total_amount    DECIMAL(12,4) NOT NULL DEFAULT 0,
  return_reason   TEXT DEFAULT NULL,
  approved_at     DATETIME NULL,
  returned_at     DATETIME NULL,
  create_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_rg_po ON return_goods(po_id);
CREATE INDEX idx_rg_supplier ON return_goods(supplier_id);
CREATE INDEX idx_rg_branch ON return_goods(branch_id);
CREATE INDEX idx_rg_status ON return_goods(status);

ALTER TABLE return_goods
  ADD CONSTRAINT fk_rg_po FOREIGN KEY (po_id) REFERENCES purchase_orders(po_id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_rg_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE RESTRICT;

DROP TABLE IF EXISTS return_goods_details;
CREATE TABLE return_goods_details (
  id              INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  return_id       INT NOT NULL,
  ingredient_id   INT NOT NULL,
  unit_code       VARCHAR(20) NOT NULL,
  qty             DECIMAL(12,4) NOT NULL DEFAULT 0,
  unit_price      DECIMAL(12,2) NOT NULL DEFAULT 0,
  line_total      DECIMAL(12,2) NOT NULL DEFAULT 0,
  return_reason   TEXT DEFAULT NULL,
  create_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_rgd_return ON return_goods_details(return_id);
CREATE INDEX idx_rgd_ingredient ON return_goods_details(ingredient_id);

ALTER TABLE return_goods_details
  ADD CONSTRAINT fk_rgd_return FOREIGN KEY (return_id) REFERENCES return_goods(return_id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_rgd_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_rgd_unit FOREIGN KEY (unit_code) REFERENCES units(code) ON DELETE RESTRICT;

-- Extend purchase_orders with communication & ETA fields


-- Per-ingredient unit-to-unit conversions (most generic)
DROP TABLE IF EXISTS ingredient_unit_conversions;
CREATE TABLE ingredient_unit_conversions (
  id             BIGINT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  ingredient_id  INT NOT NULL,
  from_unit_code VARCHAR(20) NOT NULL,
  to_unit_code   VARCHAR(20) NOT NULL,
  conversion_factor DECIMAL(18,8) NOT NULL,  -- qty_target = qty_source * factor
  note           VARCHAR(255) DEFAULT NULL,
  scope ENUM('GLOBAL', 'BRANCH') NOT NULL,
  branch_id INT DEFAULT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  create_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_ing_units UNIQUE (ingredient_id, from_unit_code, to_unit_code),
  CHECK (conversion_factor > 0)
);

CREATE INDEX idx_iuc_ing ON ingredient_unit_conversions(ingredient_id);

ALTER TABLE ingredient_unit_conversions
  ADD CONSTRAINT fk_iuc_ing  FOREIGN KEY (ingredient_id)  REFERENCES ingredients(ingredient_id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_iuc_from FOREIGN KEY (from_unit_code) REFERENCES units(code)                  ON DELETE RESTRICT,
  ADD CONSTRAINT fk_iuc_to   FOREIGN KEY (to_unit_code)   REFERENCES units(code)                  ON DELETE RESTRICT;


-- Example seeds (optional)
INSERT INTO categories (name, description) VALUES ('Coffee', 'Coffee drinks'), ('Tea', 'Tea drinks'), ('Snacks', 'Food & snacks');

-- Units data
INSERT INTO units (code, name, dimension, factor_to_base, base_unit_code) VALUES 
('kg', 'Kilogram', 'MASS', 1.00000000, 'kg'),
('g', 'Gram', 'MASS', 0.00100000, 'kg'),
('lb', 'Pound', 'MASS', 0.45359237, 'kg'),
('oz', 'Ounce', 'MASS', 0.02834952, 'kg'),
('l', 'Liter', 'VOLUME', 1.00000000, 'l'),
('ml', 'Milliliter', 'VOLUME', 0.00100000, 'l'),
('cup', 'Cup', 'VOLUME', 0.23658824, 'l'),
('tbsp', 'Tablespoon', 'VOLUME', 0.01478676, 'l'),
('tsp', 'Teaspoon', 'VOLUME', 0.00492892, 'l'),
('pcs', 'Pieces', 'COUNT', 1.00000000, 'pcs'),
('box', 'Box', 'COUNT', 1.00000000, 'pcs'),
('pack', 'Pack', 'COUNT', 1.00000000, 'pcs');

-- Sample conversions per ingredient (adjust ingredient_id to your data)
-- Example: Coffee beans (ingredient_id=1): 1 box = 5.0 kg
--          Condensed milk (ingredient_id=2): 1 pack = 12.0 l
--          Sugar (ingredient_id=3): 1 box = 10.0 kg
-- NOTE: Ensure corresponding ingredient rows exist before running these inserts.
-- INSERT INTO ingredient_unit_conversions (ingredient_id, from_unit_code, to_unit_code, factor, note)
-- VALUES
--   (1, 'box', 'kg', 5.00000000, 'Coffee beans: box to kg'),
--   (2, 'pack', 'l', 12.00000000, 'Condensed milk: pack to liter'),
--   (3, 'box', 'kg', 10.00000000, 'Sugar: box to kg');
