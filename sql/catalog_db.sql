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
CREATE TABLE categories (
  category_id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sizes (e.g., S, M, L)
DROP TABLE IF EXISTS sizes;
CREATE TABLE sizes (
  size_id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (size_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Products
DROP TABLE IF EXISTS products;
CREATE TABLE products (
  product_id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  category_id INT DEFAULT NULL,
  sku VARCHAR(100) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  base_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (product_id),
  KEY idx_products_category_id (category_id),
  UNIQUE KEY ux_products_sku (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE products
  ADD CONSTRAINT fk_products_category
  FOREIGN KEY (category_id) REFERENCES categories(category_id)
  ON UPDATE NO ACTION ON DELETE SET NULL;

-- Product sizes (price overrides per size)
DROP TABLE IF EXISTS product_sizes;
CREATE TABLE product_sizes (
  id INT NOT NULL AUTO_INCREMENT,
  product_id INT NOT NULL,
  size_id INT NOT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ps_product_id (product_id),
  KEY idx_ps_size_id (size_id),
  CONSTRAINT fk_ps_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
  CONSTRAINT fk_ps_size FOREIGN KEY (size_id) REFERENCES sizes(size_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Suppliers
DROP TABLE IF EXISTS suppliers;
CREATE TABLE suppliers (
  supplier_id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  contact_name VARCHAR(150) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  email VARCHAR(100) DEFAULT NULL,
  address VARCHAR(255) DEFAULT NULL,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ingredients
DROP TABLE IF EXISTS ingredients;
CREATE TABLE ingredients (
  ingredient_id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  unit VARCHAR(50) DEFAULT 'unit',
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  supplier_id INT DEFAULT NULL,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (ingredient_id),
  KEY idx_ingredients_supplier_id (supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE ingredients
  ADD CONSTRAINT fk_ingredients_supplier
  FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
  ON UPDATE NO ACTION ON DELETE SET NULL;

-- Recipes
DROP TABLE IF EXISTS recipes;
CREATE TABLE recipes (
  recipe_id INT NOT NULL AUTO_INCREMENT,
  product_id INT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  description TEXT DEFAULT NULL,
  yield DECIMAL(12,2) DEFAULT 1.00,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (recipe_id),
  KEY idx_recipes_product_id (product_id),
  CONSTRAINT fk_recipes_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Recipe items (ingredient list for each recipe)
DROP TABLE IF EXISTS recipe_items;
CREATE TABLE recipe_items (
  id INT NOT NULL AUTO_INCREMENT,
  recipe_id INT NOT NULL,
  ingredient_id INT NOT NULL,
  qty DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  unit VARCHAR(50) DEFAULT NULL,
  note VARCHAR(255) DEFAULT NULL,
  create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ri_recipe_id (recipe_id),
  KEY idx_ri_ingredient_id (ingredient_id),
  CONSTRAINT fk_ri_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id) ON DELETE CASCADE,
  CONSTRAINT fk_ri_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Purchase orders
DROP TABLE IF EXISTS purchase_orders;
CREATE TABLE purchase_orders (
  po_id INT NOT NULL AUTO_INCREMENT,
  po_number VARCHAR(100) NOT NULL UNIQUE,
  supplier_id INT NOT NULL,
  branch_id INT DEFAULT NULL, -- loose reference to branches in order_db
  status VARCHAR(50) NOT NULL DEFAULT 'CREATED',
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (po_id),
  KEY idx_po_supplier_id (supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4_COLLATE=utf8mb4_unicode_ci;

ALTER TABLE purchase_orders
  ADD CONSTRAINT fk_po_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
  ON UPDATE NO ACTION ON DELETE RESTRICT;

-- Purchase order details
DROP TABLE IF EXISTS purchase_order_details;
CREATE TABLE purchase_order_details (
  id INT NOT NULL AUTO_INCREMENT,
  po_id INT NOT NULL,
  ingredient_id INT NOT NULL,
  qty DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  line_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (id),
  KEY idx_pod_po_id (po_id),
  KEY idx_pod_ingredient_id (ingredient_id),
  CONSTRAINT fk_pod_po FOREIGN KEY (po_id) REFERENCES purchase_orders(po_id) ON DELETE CASCADE,
  CONSTRAINT fk_pod_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4_COLLATE=utf8mb4_unicode_ci;

-- Stocks (per branch)
DROP TABLE IF EXISTS stocks;
CREATE TABLE stocks (
  stock_id INT NOT NULL AUTO_INCREMENT,
  ingredient_id INT NOT NULL,
  branch_id INT DEFAULT NULL, -- loose reference to branches in order_db
  quantity DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  unit VARCHAR(50) DEFAULT NULL,
  threshold DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (stock_id),
  KEY idx_stocks_ingredient_id (ingredient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4_COLLATE=utf8mb4_unicode_ci;

ALTER TABLE stocks
  ADD CONSTRAINT fk_stocks_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id)
  ON UPDATE NO ACTION ON DELETE CASCADE;

-- Example seeds (optional)
INSERT INTO categories (name, description) VALUES ('Coffee', 'Coffee drinks'), ('Tea', 'Tea drinks'), ('Snacks', 'Food & snacks');
