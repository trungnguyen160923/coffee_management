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
  `create_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS ingredients;
CREATE TABLE `ingredients` (
  `ingredient_id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `unit` VARCHAR(50) DEFAULT 'unit',
  `unit_price` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `supplier_id` INT DEFAULT null,
  `create_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS recipes;
CREATE TABLE `recipes` (
  `recipe_id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  `pd_id` INT NOT NULL,
  `category_id` INT DEFAULT null,
  `version` INT NOT NULL DEFAULT 1,
  `description` TEXT DEFAULT null,
  `yield` DECIMAL(12,2) DEFAULT 1,
  `create_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS recipe_items;
CREATE TABLE `recipe_items` (
  `id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  `recipe_id` INT NOT NULL,
  `ingredient_id` INT NOT NULL,
  `qty` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `unit` VARCHAR(50) DEFAULT null,
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
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `create_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS purchase_order_details;
CREATE TABLE `purchase_order_details` (
  `id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  `po_id` INT NOT NULL,
  `ingredient_id` INT NOT NULL,
  `qty` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `unit_price` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `line_total` DECIMAL(12,2) NOT NULL DEFAULT 0
);

DROP TABLE IF EXISTS stocks;
CREATE TABLE `stocks` (
  `stock_id` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  `ingredient_id` INT NOT NULL,
  `branch_id` INT DEFAULT null,
  `quantity` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `unit` VARCHAR(50) DEFAULT null,
  `threshold` DECIMAL(12,2) NOT NULL DEFAULT 0,
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
ALTER TABLE `recipes` ADD CONSTRAINT `fk_recipes_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON DELETE SET NULL;

ALTER TABLE `recipe_items` ADD CONSTRAINT `fk_ri_recipe` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`recipe_id`) ON DELETE CASCADE;

ALTER TABLE `recipe_items` ADD CONSTRAINT `fk_ri_ingredient` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`ingredient_id`) ON DELETE RESTRICT;

ALTER TABLE `purchase_orders` ADD CONSTRAINT `fk_po_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE `purchase_order_details` ADD CONSTRAINT `fk_pod_po` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`po_id`) ON DELETE CASCADE;

ALTER TABLE `purchase_order_details` ADD CONSTRAINT `fk_pod_ingredient` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`ingredient_id`) ON DELETE RESTRICT;

ALTER TABLE `stocks` ADD CONSTRAINT `fk_stocks_ingredient` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`ingredient_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE sizes ADD UNIQUE uq_sizes_name (name);

ALTER TABLE categories ADD UNIQUE uq_categories_name (name);

ALTER TABLE product_details ADD UNIQUE uq_product_size (product_id, size_id);

ALTER TABLE recipes ADD UNIQUE uq_recipe_version (pd_id, version);

ALTER TABLE stocks ADD UNIQUE uq_stock_ingredient_branch (ingredient_id, branch_id);


-- Example seeds (optional)
INSERT INTO categories (name, description) VALUES ('Coffee', 'Coffee drinks'), ('Tea', 'Tea drinks'), ('Snacks', 'Food & snacks');
