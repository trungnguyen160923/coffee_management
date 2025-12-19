-- =============================================
-- SEED DATA - Dữ liệu mẫu cho hệ thống
-- =============================================
-- File này chứa dữ liệu mẫu để test hệ thống
-- Chạy sau khi đã chạy các file SQL khởi tạo database
-- =============================================

-- =============================================
-- 1. AUTH_DB - Users
-- =============================================

USE auth_db;

-- Admin user
-- Password: admin123 (đã hash: $2a$10$wSc.72JcNP.WGb6pCh/2.umEbTVqBJm7tc75NOS60ERUEd.tvG1AS)
INSERT INTO users (user_id, email, password, fullname, phone_number, role_id) VALUES
(1, 'admin@coffee.com', '$2a$10$wSc.72JcNP.WGb6pCh/2.umEbTVqBJm7tc75NOS60ERUEd.tvG1AS', 'Administrator', '0901234567', 1);

-- Manager 1 (cho Branch 1)
INSERT INTO users (user_id, email, password, fullname, phone_number, role_id) VALUES
(2, 'manager1@coffee.com', '$2a$10$wSc.72JcNP.WGb6pCh/2.umEbTVqBJm7tc75NOS60ERUEd.tvG1AS', 'Nguyễn Văn Quản Lý', '0901234568', 2);

-- Manager 2 (cho Branch 2)
INSERT INTO users (user_id, email, password, fullname, phone_number, role_id) VALUES
(3, 'manager2@coffee.com', '$2a$10$wSc.72JcNP.WGb6pCh/2.umEbTVqBJm7tc75NOS60ERUEd.tvG1AS', 'Trần Thị Quản Lý', '0901234569', 2);


-- =============================================
-- 2. PROFILE_DB - Admin & Manager Profiles
-- =============================================

USE profile_db;

-- Admin profile
INSERT INTO admin_profiles (user_id, admin_level, notes) VALUES
(1, 1, 'System Administrator - Full access to all features');

-- Manager 1 profile (Branch 1)
INSERT INTO manager_profiles (user_id, branch_id, hire_date, identity_card) VALUES
(2, 1, '2024-01-01', '001234567890');

-- Manager 2 profile (Branch 2)
INSERT INTO manager_profiles (user_id, branch_id, hire_date, identity_card) VALUES
(3, 2, '2024-01-15', '001234567891');


-- =============================================
-- 3. ORDER_DB - Branches
-- =============================================

USE order_db;

-- Update branch mẫu đã có (nếu có) hoặc tạo mới
-- Xóa branch mẫu cũ nếu có
DELETE FROM branches WHERE branch_id IN (1, 2);

-- Branch 1 - Chi nhánh trung tâm
INSERT INTO branches (branch_id, name, address, phone, manager_user_id, openhours, endhours, open_days, latitude, longitude) VALUES
(1, 'Chi Nhánh Trung Tâm', '123 Đường Nguyễn Huệ, Quận 1, TP.HCM', '0281234567', 2, '07:00:00', '22:00:00', '1,2,3,4,5,6,7', 10.7769, 106.7009);

-- Branch 2 - Chi nhánh quận 7
INSERT INTO branches (branch_id, name, address, phone, manager_user_id, openhours, endhours, open_days, latitude, longitude) VALUES
(2, 'Chi Nhánh Quận 7', '456 Đường Nguyễn Thị Thập, Quận 7, TP.HCM', '0281234568', 3, '07:00:00', '22:00:00', '1,2,3,4,5,6,7', 10.7299, 106.7174);

-- Tạo một số bàn mẫu cho mỗi chi nhánh
-- Branch 1 - 10 bàn
INSERT INTO cafe_tables (branch_id, label, capacity, status) VALUES
(1, 'T1', 2, 'AVAILABLE'),
(1, 'T2', 4, 'AVAILABLE'),
(1, 'T3', 4, 'AVAILABLE'),
(1, 'T4', 6, 'AVAILABLE'),
(1, 'T5', 2, 'AVAILABLE'),
(1, 'T6', 4, 'AVAILABLE'),
(1, 'T7', 8, 'AVAILABLE'),
(1, 'T8', 2, 'AVAILABLE'),
(1, 'T9', 4, 'AVAILABLE'),
(1, 'T10', 6, 'AVAILABLE');

-- Branch 2 - 8 bàn
INSERT INTO cafe_tables (branch_id, label, capacity, status) VALUES
(2, 'T1', 2, 'AVAILABLE'),
(2, 'T2', 4, 'AVAILABLE'),
(2, 'T3', 4, 'AVAILABLE'),
(2, 'T4', 6, 'AVAILABLE'),
(2, 'T5', 2, 'AVAILABLE'),
(2, 'T6', 4, 'AVAILABLE'),
(2, 'T7', 4, 'AVAILABLE'),
(2, 'T8', 6, 'AVAILABLE');


-- =============================================
-- 4. CATALOG_DB - Categories, Sizes, Ingredients, Recipes, Suppliers
-- =============================================

USE catalog_db;

-- Bàn (catalog_db.tables) cho 2 chi nhánh để khớp schema mới thêm
-- Lưu ý: bảng này không có FK sang order_db.branches (cross-DB), chỉ seed dữ liệu mẫu
DELETE FROM `tables` WHERE branch_id IN (1, 2);
INSERT INTO `tables` (branch_id, label, capacity, status) VALUES
(1, 'T1', 2, 'AVAILABLE'),
(1, 'T2', 4, 'AVAILABLE'),
(1, 'T3', 4, 'AVAILABLE'),
(1, 'T4', 6, 'AVAILABLE'),
(1, 'T5', 2, 'AVAILABLE'),
(1, 'T6', 4, 'AVAILABLE'),
(1, 'T7', 8, 'AVAILABLE'),
(1, 'T8', 2, 'AVAILABLE'),
(1, 'T9', 4, 'AVAILABLE'),
(1, 'T10', 6, 'AVAILABLE'),
(2, 'T1', 2, 'AVAILABLE'),
(2, 'T2', 4, 'AVAILABLE'),
(2, 'T3', 4, 'AVAILABLE'),
(2, 'T4', 6, 'AVAILABLE'),
(2, 'T5', 2, 'AVAILABLE'),
(2, 'T6', 4, 'AVAILABLE'),
(2, 'T7', 4, 'AVAILABLE'),
(2, 'T8', 6, 'AVAILABLE');

-- Categories (bổ sung thêm nếu chưa có)
INSERT INTO categories (category_id, name, description) VALUES
(1, 'Coffee', 'Các loại cà phê'),
(2, 'Tea', 'Các loại trà'),
(3, 'Snacks', 'Đồ ăn vặt'),
(4, 'Desserts', 'Đồ tráng miệng'),
(5, 'Beverages', 'Đồ uống khác')
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description);

-- Sizes
INSERT INTO sizes (size_id, name, description) VALUES
(1, 'S', 'Size nhỏ - 250ml'),
(2, 'M', 'Size vừa - 350ml'),
(3, 'L', 'Size lớn - 500ml'),
(4, 'XL', 'Size rất lớn - 700ml')
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description);

-- Suppliers
INSERT INTO suppliers (supplier_id, name, contact_name, phone, email, address, note) VALUES
(1, 'Nhà Cung Cấp Cà Phê Việt Nam', 'Nguyễn Văn A', '0912345678', 'contact@coffeevn.com', '123 Đường Cà Phê, TP.HCM', 'Nhà cung cấp cà phê chính'),
(2, 'Công Ty Nguyên Liệu F&B', 'Trần Thị B', '0912345679', 'contact@fnb.com', '456 Đường Nguyên Liệu, TP.HCM', 'Cung cấp nguyên liệu đa dạng'),
(3, 'Nhà Cung Cấp Sữa & Kem', 'Lê Văn C', '0912345680', 'contact@milkcream.com', '789 Đường Sữa, TP.HCM', 'Chuyên sữa tươi và kem'),
(4, 'Công Ty Đường & Gia Vị', 'Phạm Thị D', '0912345681', 'contact@sugar.com', '321 Đường Đường, TP.HCM', 'Cung cấp đường và gia vị')
ON DUPLICATE KEY UPDATE name=VALUES(name), contact_name=VALUES(contact_name);

-- Ingredients
INSERT INTO ingredients (ingredient_id, name, unit_code, unit_price, supplier_id) VALUES
(1, 'Cà phê Arabica', 'kg', 250000.0000, 1),
(2, 'Cà phê Robusta', 'kg', 180000.0000, 1),
(3, 'Sữa tươi', 'l', 35000.0000, 3),
(4, 'Kem tươi', 'l', 45000.0000, 3),
(5, 'Đường trắng', 'kg', 25000.0000, 4),
(6, 'Đường nâu', 'kg', 30000.0000, 4),
(7, 'Trà xanh', 'kg', 200000.0000, 2),
(8, 'Trà đen', 'kg', 150000.0000, 2),
(9, 'Trà oolong', 'kg', 220000.0000, 2),
(10, 'Siro vanilla', 'l', 80000.0000, 2),
(11, 'Siro caramel', 'l', 85000.0000, 2),
(12, 'Siro chocolate', 'l', 90000.0000, 2),
(13, 'Whipped cream', 'l', 55000.0000, 3),
(14, 'Bột cacao', 'kg', 120000.0000, 2),
(15, 'Bánh quy', 'pcs', 5000.0000, 2),
(16, 'Kem vanilla', 'l', 40000.0000, 3),
(17, 'Kem chocolate', 'l', 42000.0000, 3),
(18, 'Đá viên', 'kg', 5000.0000, 2),
(19, 'Nước lọc', 'l', 10000.0000, 2),
(20, 'Lá bạc hà', 'kg', 150000.0000, 2)
ON DUPLICATE KEY UPDATE name=VALUES(name), unit_code=VALUES(unit_code);

-- Products (một số sản phẩm mẫu)
INSERT INTO products (product_id, name, image_url, category_id, sku, description, active) VALUES
(1, 'Cà Phê Đen', NULL, 1, 'CF001', 'Cà phê đen truyền thống Việt Nam', TRUE),
(2, 'Cà Phê Sữa', NULL, 1, 'CF002', 'Cà phê pha với sữa đặc', TRUE),
(3, 'Cappuccino', NULL, 1, 'CF003', 'Cà phê espresso với sữa và bọt sữa', TRUE),
(4, 'Latte', NULL, 1, 'CF004', 'Cà phê espresso với nhiều sữa', TRUE),
(5, 'Americano', NULL, 1, 'CF005', 'Espresso pha loãng với nước nóng', TRUE),
(6, 'Trà Đào', NULL, 2, 'TE001', 'Trà đen với đào tươi', TRUE),
(7, 'Trà Chanh', NULL, 2, 'TE002', 'Trà xanh với chanh tươi', TRUE),
(8, 'Trà Sữa', NULL, 2, 'TE003', 'Trà đen với sữa và đường', TRUE),
(9, 'Bánh Mì Nướng', NULL, 3, 'SN001', 'Bánh mì nướng giòn với bơ', TRUE),
(10, 'Bánh Croissant', NULL, 3, 'SN002', 'Bánh sừng bò Pháp', TRUE),
(11, 'Tiramisu', NULL, 4, 'DE001', 'Bánh tiramisu Ý', TRUE),
(12, 'Cheesecake', NULL, 4, 'DE002', 'Bánh phô mai New York', TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name), category_id=VALUES(category_id);

-- Product Details (kích thước và giá)
-- Cà Phê Đen
INSERT INTO product_details (product_id, size_id, price, active) VALUES
(1, 1, 25000, TRUE),
(1, 2, 30000, TRUE),
(1, 3, 35000, TRUE);

-- Cà Phê Sữa
INSERT INTO product_details (product_id, size_id, price, active) VALUES
(2, 1, 30000, TRUE),
(2, 2, 35000, TRUE),
(2, 3, 40000, TRUE);

-- Cappuccino
INSERT INTO product_details (product_id, size_id, price, active) VALUES
(3, 1, 45000, TRUE),
(3, 2, 55000, TRUE),
(3, 3, 65000, TRUE);

-- Latte
INSERT INTO product_details (product_id, size_id, price, active) VALUES
(4, 1, 50000, TRUE),
(4, 2, 60000, TRUE),
(4, 3, 70000, TRUE);

-- Americano
INSERT INTO product_details (product_id, size_id, price, active) VALUES
(5, 1, 40000, TRUE),
(5, 2, 50000, TRUE),
(5, 3, 60000, TRUE);

-- Trà Đào
INSERT INTO product_details (product_id, size_id, price, active) VALUES
(6, 1, 35000, TRUE),
(6, 2, 45000, TRUE),
(6, 3, 55000, TRUE);

-- Trà Chanh
INSERT INTO product_details (product_id, size_id, price, active) VALUES
(7, 1, 30000, TRUE),
(7, 2, 40000, TRUE),
(7, 3, 50000, TRUE);

-- Trà Sữa
INSERT INTO product_details (product_id, size_id, price, active) VALUES
(8, 1, 40000, TRUE),
(8, 2, 50000, TRUE),
(8, 3, 60000, TRUE);

-- Bánh Mì Nướng (không có size)
INSERT INTO product_details (product_id, size_id, price, active) VALUES
(9, NULL, 25000, TRUE);

-- Bánh Croissant (không có size)
INSERT INTO product_details (product_id, size_id, price, active) VALUES
(10, NULL, 30000, TRUE);

-- Tiramisu (không có size)
INSERT INTO product_details (product_id, size_id, price, active) VALUES
(11, NULL, 80000, TRUE);

-- Cheesecake (không có size)
INSERT INTO product_details (product_id, size_id, price, active) VALUES
(12, NULL, 75000, TRUE);

-- =============================================
-- RECIPES - Công thức cho TẤT CẢ product_details
-- =============================================
-- Lưu ý: pd_id được tính dựa trên thứ tự insert product_details
-- Product 1: pd_id 1,2,3 | Product 2: pd_id 4,5,6 | Product 3: pd_id 7,8,9 | Product 4: pd_id 10,11,12
-- Product 5: pd_id 13,14,15 | Product 6: pd_id 16,17,18 | Product 7: pd_id 19,20,21 | Product 8: pd_id 22,23,24
-- Product 9: pd_id 25 | Product 10: pd_id 26 | Product 11: pd_id 27 | Product 12: pd_id 28

-- =============================================
-- Product 1: Cà Phê Đen (pd_id 1,2,3 - S, M, L)
-- =============================================
INSERT INTO recipes (recipe_id, name, pd_id, version, description, yield, instructions, status) VALUES
(1, 'Cà Phê Đen Size S', 1, 1, 'Công thức cà phê đen size S (250ml)', 1.0, 
'1. Pha 20ml cà phê đen\n2. Thêm 180ml nước nóng\n3. Khuấy đều\n4. Thêm đá nếu khách yêu cầu', 'ACTIVE'),
(2, 'Cà Phê Đen Size M', 2, 1, 'Công thức cà phê đen size M (350ml)', 1.0, 
'1. Pha 30ml cà phê đen\n2. Thêm 250ml nước nóng\n3. Khuấy đều\n4. Thêm đá nếu khách yêu cầu', 'ACTIVE'),
(3, 'Cà Phê Đen Size L', 3, 1, 'Công thức cà phê đen size L (500ml)', 1.0, 
'1. Pha 40ml cà phê đen\n2. Thêm 380ml nước nóng\n3. Khuấy đều\n4. Thêm đá nếu khách yêu cầu', 'ACTIVE');

INSERT INTO recipe_items (recipe_id, ingredient_id, qty, unit_code, note) VALUES
(1, 2, 0.02, 'kg', 'Cà phê Robusta'), (1, 19, 0.18, 'l', 'Nước lọc'), (1, 18, 0.08, 'kg', 'Đá viên'),
(2, 2, 0.03, 'kg', 'Cà phê Robusta'), (2, 19, 0.25, 'l', 'Nước lọc'), (2, 18, 0.1, 'kg', 'Đá viên'),
(3, 2, 0.04, 'kg', 'Cà phê Robusta'), (3, 19, 0.38, 'l', 'Nước lọc'), (3, 18, 0.15, 'kg', 'Đá viên');

-- =============================================
-- Product 2: Cà Phê Sữa (pd_id 4,5,6 - S, M, L)
-- =============================================
INSERT INTO recipes (recipe_id, name, pd_id, version, description, yield, instructions, status) VALUES
(4, 'Cà Phê Sữa Size S', 4, 1, 'Công thức cà phê sữa size S (250ml)', 1.0, 
'1. Pha 20ml cà phê đen\n2. Thêm 15ml sữa đặc\n3. Khuấy đều\n4. Thêm đá nếu khách yêu cầu', 'ACTIVE'),
(5, 'Cà Phê Sữa Size M', 5, 1, 'Công thức cà phê sữa size M (350ml)', 1.0, 
'1. Pha 30ml cà phê đen\n2. Thêm 20ml sữa đặc\n3. Khuấy đều\n4. Thêm đá nếu khách yêu cầu', 'ACTIVE'),
(6, 'Cà Phê Sữa Size L', 6, 1, 'Công thức cà phê sữa size L (500ml)', 1.0, 
'1. Pha 40ml cà phê đen\n2. Thêm 30ml sữa đặc\n3. Khuấy đều\n4. Thêm đá nếu khách yêu cầu', 'ACTIVE');

INSERT INTO recipe_items (recipe_id, ingredient_id, qty, unit_code, note) VALUES
(4, 2, 0.02, 'kg', 'Cà phê Robusta'), (4, 3, 0.015, 'l', 'Sữa tươi'), (4, 5, 0.008, 'kg', 'Đường trắng'), (4, 18, 0.08, 'kg', 'Đá viên'),
(5, 2, 0.03, 'kg', 'Cà phê Robusta'), (5, 3, 0.02, 'l', 'Sữa tươi'), (5, 5, 0.01, 'kg', 'Đường trắng'), (5, 18, 0.1, 'kg', 'Đá viên'),
(6, 2, 0.04, 'kg', 'Cà phê Robusta'), (6, 3, 0.03, 'l', 'Sữa tươi'), (6, 5, 0.015, 'kg', 'Đường trắng'), (6, 18, 0.15, 'kg', 'Đá viên');

-- =============================================
-- Product 3: Cappuccino (pd_id 7,8,9 - S, M, L)
-- =============================================
INSERT INTO recipes (recipe_id, name, pd_id, version, description, yield, instructions, status) VALUES
(7, 'Cappuccino Size S', 7, 1, 'Công thức Cappuccino size S (250ml)', 1.0,
'1. Pha 20ml espresso\n2. Đánh 100ml sữa nóng tạo bọt\n3. Đổ sữa vào cà phê\n4. Tạo hình latte art', 'ACTIVE'),
(8, 'Cappuccino Size M', 8, 1, 'Công thức Cappuccino size M (350ml)', 1.0,
'1. Pha 30ml espresso\n2. Đánh 150ml sữa nóng tạo bọt\n3. Đổ sữa vào cà phê\n4. Tạo hình latte art', 'ACTIVE'),
(9, 'Cappuccino Size L', 9, 1, 'Công thức Cappuccino size L (500ml)', 1.0,
'1. Pha 40ml espresso\n2. Đánh 200ml sữa nóng tạo bọt\n3. Đổ sữa vào cà phê\n4. Tạo hình latte art', 'ACTIVE');

INSERT INTO recipe_items (recipe_id, ingredient_id, qty, unit_code, note) VALUES
(7, 1, 0.015, 'kg', 'Cà phê Arabica'), (7, 3, 0.1, 'l', 'Sữa tươi'), (7, 13, 0.03, 'l', 'Whipped cream'),
(8, 1, 0.02, 'kg', 'Cà phê Arabica'), (8, 3, 0.15, 'l', 'Sữa tươi'), (8, 13, 0.05, 'l', 'Whipped cream'),
(9, 1, 0.025, 'kg', 'Cà phê Arabica'), (9, 3, 0.2, 'l', 'Sữa tươi'), (9, 13, 0.08, 'l', 'Whipped cream');

-- =============================================
-- Product 4: Latte (pd_id 10,11,12 - S, M, L)
-- =============================================
INSERT INTO recipes (recipe_id, name, pd_id, version, description, yield, instructions, status) VALUES
(10, 'Latte Size S', 10, 1, 'Công thức Latte size S (250ml)', 1.0,
'1. Pha 20ml espresso\n2. Đánh 150ml sữa nóng (không tạo bọt nhiều)\n3. Đổ sữa vào cà phê từ từ\n4. Có thể thêm siro tùy chọn', 'ACTIVE'),
(11, 'Latte Size M', 11, 1, 'Công thức Latte size M (350ml)', 1.0,
'1. Pha 30ml espresso\n2. Đánh 200ml sữa nóng (không tạo bọt nhiều)\n3. Đổ sữa vào cà phê từ từ\n4. Có thể thêm siro tùy chọn', 'ACTIVE'),
(12, 'Latte Size L', 12, 1, 'Công thức Latte size L (500ml)', 1.0,
'1. Pha 40ml espresso\n2. Đánh 300ml sữa nóng (không tạo bọt nhiều)\n3. Đổ sữa vào cà phê từ từ\n4. Có thể thêm siro tùy chọn', 'ACTIVE');

INSERT INTO recipe_items (recipe_id, ingredient_id, qty, unit_code, note) VALUES
(10, 1, 0.015, 'kg', 'Cà phê Arabica'), (10, 3, 0.15, 'l', 'Sữa tươi'),
(11, 1, 0.02, 'kg', 'Cà phê Arabica'), (11, 3, 0.2, 'l', 'Sữa tươi'),
(12, 1, 0.025, 'kg', 'Cà phê Arabica'), (12, 3, 0.3, 'l', 'Sữa tươi');

-- =============================================
-- Product 5: Americano (pd_id 13,14,15 - S, M, L)
-- =============================================
INSERT INTO recipes (recipe_id, name, pd_id, version, description, yield, instructions, status) VALUES
(13, 'Americano Size S', 13, 1, 'Công thức Americano size S (250ml)', 1.0,
'1. Pha 20ml espresso\n2. Thêm 180ml nước nóng\n3. Khuấy đều', 'ACTIVE'),
(14, 'Americano Size M', 14, 1, 'Công thức Americano size M (350ml)', 1.0,
'1. Pha 30ml espresso\n2. Thêm 250ml nước nóng\n3. Khuấy đều', 'ACTIVE'),
(15, 'Americano Size L', 15, 1, 'Công thức Americano size L (500ml)', 1.0,
'1. Pha 40ml espresso\n2. Thêm 380ml nước nóng\n3. Khuấy đều', 'ACTIVE');

INSERT INTO recipe_items (recipe_id, ingredient_id, qty, unit_code, note) VALUES
(13, 1, 0.015, 'kg', 'Cà phê Arabica'), (13, 19, 0.18, 'l', 'Nước lọc'),
(14, 1, 0.02, 'kg', 'Cà phê Arabica'), (14, 19, 0.25, 'l', 'Nước lọc'),
(15, 1, 0.025, 'kg', 'Cà phê Arabica'), (15, 19, 0.38, 'l', 'Nước lọc');

-- =============================================
-- Product 6: Trà Đào (pd_id 16,17,18 - S, M, L)
-- =============================================
INSERT INTO recipes (recipe_id, name, pd_id, version, description, yield, instructions, status) VALUES
(16, 'Trà Đào Size S', 16, 1, 'Công thức trà đào size S (250ml)', 1.0,
'1. Pha 4g trà đen với 150ml nước nóng\n2. Để nguội\n3. Thêm đào tươi cắt lát\n4. Thêm đá và đường', 'ACTIVE'),
(17, 'Trà Đào Size M', 17, 1, 'Công thức trà đào size M (350ml)', 1.0,
'1. Pha 5g trà đen với 200ml nước nóng\n2. Để nguội\n3. Thêm đào tươi cắt lát\n4. Thêm đá và đường', 'ACTIVE'),
(18, 'Trà Đào Size L', 18, 1, 'Công thức trà đào size L (500ml)', 1.0,
'1. Pha 6g trà đen với 300ml nước nóng\n2. Để nguội\n3. Thêm đào tươi cắt lát\n4. Thêm đá và đường', 'ACTIVE');

INSERT INTO recipe_items (recipe_id, ingredient_id, qty, unit_code, note) VALUES
(16, 8, 0.004, 'kg', 'Trà đen'), (16, 5, 0.015, 'kg', 'Đường trắng'), (16, 18, 0.1, 'kg', 'Đá viên'), (16, 19, 0.15, 'l', 'Nước lọc'),
(17, 8, 0.005, 'kg', 'Trà đen'), (17, 5, 0.02, 'kg', 'Đường trắng'), (17, 18, 0.15, 'kg', 'Đá viên'), (17, 19, 0.2, 'l', 'Nước lọc'),
(18, 8, 0.006, 'kg', 'Trà đen'), (18, 5, 0.025, 'kg', 'Đường trắng'), (18, 18, 0.2, 'kg', 'Đá viên'), (18, 19, 0.3, 'l', 'Nước lọc');

-- =============================================
-- Product 7: Trà Chanh (pd_id 19,20,21 - S, M, L)
-- =============================================
INSERT INTO recipes (recipe_id, name, pd_id, version, description, yield, instructions, status) VALUES
(19, 'Trà Chanh Size S', 19, 1, 'Công thức trà chanh size S (250ml)', 1.0,
'1. Pha 4g trà xanh với 150ml nước nóng\n2. Để nguội\n3. Thêm chanh tươi\n4. Thêm đá và đường', 'ACTIVE'),
(20, 'Trà Chanh Size M', 20, 1, 'Công thức trà chanh size M (350ml)', 1.0,
'1. Pha 5g trà xanh với 200ml nước nóng\n2. Để nguội\n3. Thêm chanh tươi\n4. Thêm đá và đường', 'ACTIVE'),
(21, 'Trà Chanh Size L', 21, 1, 'Công thức trà chanh size L (500ml)', 1.0,
'1. Pha 6g trà xanh với 300ml nước nóng\n2. Để nguội\n3. Thêm chanh tươi\n4. Thêm đá và đường', 'ACTIVE');

INSERT INTO recipe_items (recipe_id, ingredient_id, qty, unit_code, note) VALUES
(19, 7, 0.004, 'kg', 'Trà xanh'), (19, 5, 0.015, 'kg', 'Đường trắng'), (19, 18, 0.1, 'kg', 'Đá viên'), (19, 19, 0.15, 'l', 'Nước lọc'), (19, 20, 0.001, 'kg', 'Lá bạc hà'),
(20, 7, 0.005, 'kg', 'Trà xanh'), (20, 5, 0.02, 'kg', 'Đường trắng'), (20, 18, 0.15, 'kg', 'Đá viên'), (20, 19, 0.2, 'l', 'Nước lọc'), (20, 20, 0.002, 'kg', 'Lá bạc hà'),
(21, 7, 0.006, 'kg', 'Trà xanh'), (21, 5, 0.025, 'kg', 'Đường trắng'), (21, 18, 0.2, 'kg', 'Đá viên'), (21, 19, 0.3, 'l', 'Nước lọc'), (21, 20, 0.003, 'kg', 'Lá bạc hà');

-- =============================================
-- Product 8: Trà Sữa (pd_id 22,23,24 - S, M, L)
-- =============================================
INSERT INTO recipes (recipe_id, name, pd_id, version, description, yield, instructions, status) VALUES
(22, 'Trà Sữa Size S', 22, 1, 'Công thức trà sữa size S (250ml)', 1.0,
'1. Pha 4g trà đen với 150ml nước nóng\n2. Để nguội\n3. Thêm 50ml sữa và đường\n4. Khuấy đều', 'ACTIVE'),
(23, 'Trà Sữa Size M', 23, 1, 'Công thức trà sữa size M (350ml)', 1.0,
'1. Pha 5g trà đen với 200ml nước nóng\n2. Để nguội\n3. Thêm 80ml sữa và đường\n4. Khuấy đều', 'ACTIVE'),
(24, 'Trà Sữa Size L', 24, 1, 'Công thức trà sữa size L (500ml)', 1.0,
'1. Pha 6g trà đen với 300ml nước nóng\n2. Để nguội\n3. Thêm 120ml sữa và đường\n4. Khuấy đều', 'ACTIVE');

INSERT INTO recipe_items (recipe_id, ingredient_id, qty, unit_code, note) VALUES
(22, 8, 0.004, 'kg', 'Trà đen'), (22, 3, 0.05, 'l', 'Sữa tươi'), (22, 5, 0.015, 'kg', 'Đường trắng'), (22, 19, 0.15, 'l', 'Nước lọc'),
(23, 8, 0.005, 'kg', 'Trà đen'), (23, 3, 0.08, 'l', 'Sữa tươi'), (23, 5, 0.02, 'kg', 'Đường trắng'), (23, 19, 0.2, 'l', 'Nước lọc'),
(24, 8, 0.006, 'kg', 'Trà đen'), (24, 3, 0.12, 'l', 'Sữa tươi'), (24, 5, 0.025, 'kg', 'Đường trắng'), (24, 19, 0.3, 'l', 'Nước lọc');

-- =============================================
-- Product 9: Bánh Mì Nướng (pd_id 25 - không size)
-- =============================================
INSERT INTO recipes (recipe_id, name, pd_id, version, description, yield, instructions, status) VALUES
(25, 'Bánh Mì Nướng', 25, 1, 'Công thức bánh mì nướng', 1.0,
'1. Cắt bánh mì thành lát\n2. Phết bơ\n3. Nướng vàng đều 2 mặt\n4. Phục vụ nóng', 'ACTIVE');

INSERT INTO recipe_items (recipe_id, ingredient_id, qty, unit_code, note) VALUES
(25, 15, 2.0, 'pcs', 'Bánh quy/bánh mì');

-- =============================================
-- Product 10: Bánh Croissant (pd_id 26 - không size)
-- =============================================
INSERT INTO recipes (recipe_id, name, pd_id, version, description, yield, instructions, status) VALUES
(26, 'Bánh Croissant', 26, 1, 'Công thức bánh croissant', 1.0,
'1. Lấy bánh croissant từ kho\n2. Hâm nóng trong lò\n3. Phục vụ nóng kèm bơ', 'ACTIVE');

INSERT INTO recipe_items (recipe_id, ingredient_id, qty, unit_code, note) VALUES
(26, 15, 1.0, 'pcs', 'Bánh croissant');

-- =============================================
-- Product 11: Tiramisu (pd_id 27 - không size)
-- =============================================
INSERT INTO recipes (recipe_id, name, pd_id, version, description, yield, instructions, status) VALUES
(27, 'Tiramisu', 27, 1, 'Công thức tiramisu', 1.0,
'1. Chuẩn bị bánh tiramisu\n2. Rắc bột cacao\n3. Phục vụ lạnh', 'ACTIVE');

INSERT INTO recipe_items (recipe_id, ingredient_id, qty, unit_code, note) VALUES
(27, 14, 0.01, 'kg', 'Bột cacao'), (27, 3, 0.05, 'l', 'Sữa tươi'), (27, 16, 0.03, 'l', 'Kem vanilla');

-- =============================================
-- Product 12: Cheesecake (pd_id 28 - không size)
-- =============================================
INSERT INTO recipes (recipe_id, name, pd_id, version, description, yield, instructions, status) VALUES
(28, 'Cheesecake', 28, 1, 'Công thức cheesecake', 1.0,
'1. Chuẩn bị bánh cheesecake\n2. Thêm topping tùy chọn\n3. Phục vụ lạnh', 'ACTIVE');

INSERT INTO recipe_items (recipe_id, ingredient_id, qty, unit_code, note) VALUES
(28, 3, 0.08, 'l', 'Sữa tươi'), (28, 16, 0.05, 'l', 'Kem vanilla'), (28, 5, 0.02, 'kg', 'Đường trắng');


-- =============================================
-- 5. STOCKS - Tồn kho mẫu cho 2 chi nhánh
-- =============================================

USE catalog_db;

-- Stock cho Branch 1
INSERT INTO stocks (ingredient_id, branch_id, quantity, unit_code, threshold) VALUES
(1, 1, 50.0000, 'kg', 10.0000),
(2, 1, 80.0000, 'kg', 20.0000),
(3, 1, 100.0000, 'l', 30.0000),
(4, 1, 50.0000, 'l', 15.0000),
(5, 1, 200.0000, 'kg', 50.0000),
(6, 1, 50.0000, 'kg', 10.0000),
(7, 1, 20.0000, 'kg', 5.0000),
(8, 1, 30.0000, 'kg', 10.0000),
(9, 1, 15.0000, 'kg', 5.0000),
(10, 1, 20.0000, 'l', 5.0000),
(11, 1, 20.0000, 'l', 5.0000),
(12, 1, 20.0000, 'l', 5.0000),
(13, 1, 30.0000, 'l', 10.0000),
(14, 1, 25.0000, 'kg', 10.0000),
(15, 1, 500.0000, 'pcs', 100.0000),
(16, 1, 40.0000, 'l', 10.0000),
(17, 1, 40.0000, 'l', 10.0000),
(18, 1, 200.0000, 'kg', 50.0000),
(19, 1, 500.0000, 'l', 100.0000),
(20, 1, 5.0000, 'kg', 1.0000)
ON DUPLICATE KEY UPDATE quantity=VALUES(quantity);

-- Stock cho Branch 2
INSERT INTO stocks (ingredient_id, branch_id, quantity, unit_code, threshold) VALUES
(1, 2, 40.0000, 'kg', 10.0000),
(2, 2, 60.0000, 'kg', 20.0000),
(3, 2, 80.0000, 'l', 30.0000),
(4, 2, 40.0000, 'l', 15.0000),
(5, 2, 150.0000, 'kg', 50.0000),
(6, 2, 40.0000, 'kg', 10.0000),
(7, 2, 15.0000, 'kg', 5.0000),
(8, 2, 25.0000, 'kg', 10.0000),
(9, 2, 12.0000, 'kg', 5.0000),
(10, 2, 15.0000, 'l', 5.0000),
(11, 2, 15.0000, 'l', 5.0000),
(12, 2, 15.0000, 'l', 5.0000),
(13, 2, 25.0000, 'l', 10.0000),
(14, 2, 20.0000, 'kg', 10.0000),
(15, 2, 400.0000, 'pcs', 100.0000),
(16, 2, 30.0000, 'l', 10.0000),
(17, 2, 30.0000, 'l', 10.0000),
(18, 2, 150.0000, 'kg', 50.0000),
(19, 2, 400.0000, 'l', 100.0000),
(20, 2, 4.0000, 'kg', 1.0000)
ON DUPLICATE KEY UPDATE quantity=VALUES(quantity);


-- =============================================
-- 6. PROFILE_DB - Payroll Templates (Bonus, Penalty, Allowance)
-- =============================================

USE profile_db;

-- =====================================================
-- BONUS TEMPLATES - Mẫu thưởng
-- =====================================================

-- Xóa dữ liệu cũ nếu có (uncomment dòng này nếu muốn reset và tạo lại từ đầu)
-- DELETE FROM bonus_templates WHERE branch_id IS NULL;

-- Thưởng hiệu suất làm việc
-- Lưu ý: Nếu chạy nhiều lần sẽ tạo duplicate. Uncomment DELETE ở trên nếu muốn reset.
INSERT INTO bonus_templates (branch_id, name, bonus_type, amount, description, is_active, created_by) VALUES
-- PERFORMANCE - Thưởng hiệu suất
(NULL, 'Thưởng hiệu suất xuất sắc', 'PERFORMANCE', 500000, 'Thưởng cho nhân viên có hiệu suất làm việc xuất sắc trong tháng (doanh số cao, phục vụ tốt, không có khiếu nại)', TRUE, 1),
(NULL, 'Thưởng nhân viên của tháng', 'PERFORMANCE', 1000000, 'Thưởng cho nhân viên được bình chọn là nhân viên của tháng', TRUE, 1),
(NULL, 'Thưởng phục vụ tốt', 'PERFORMANCE', 200000, 'Thưởng cho nhân viên được khách hàng đánh giá tốt, không có khiếu nại', TRUE, 1),
(NULL, 'Thưởng làm thêm giờ', 'PERFORMANCE', 50000, 'Thưởng cho nhân viên sẵn sàng làm thêm giờ khi cần thiết', TRUE, 1),

-- STORE_TARGET - Thưởng đạt chỉ tiêu
(NULL, 'Thưởng đạt chỉ tiêu doanh số', 'STORE_TARGET', 300000, 'Thưởng khi chi nhánh đạt chỉ tiêu doanh số tháng', TRUE, 1),
(NULL, 'Thưởng vượt chỉ tiêu doanh số', 'STORE_TARGET', 500000, 'Thưởng khi chi nhánh vượt chỉ tiêu doanh số tháng', TRUE, 1),
(NULL, 'Thưởng đạt chỉ tiêu khách hàng', 'STORE_TARGET', 200000, 'Thưởng khi chi nhánh đạt chỉ tiêu số lượng khách hàng', TRUE, 1),

-- HOLIDAY - Thưởng lễ tết
(NULL, 'Thưởng Tết Nguyên Đán', 'HOLIDAY', 1000000, 'Thưởng Tết cho nhân viên làm việc trong dịp Tết Nguyên Đán', TRUE, 1),
(NULL, 'Thưởng ngày lễ quốc gia', 'HOLIDAY', 300000, 'Thưởng cho nhân viên làm việc vào ngày lễ quốc gia', TRUE, 1),
(NULL, 'Thưởng cuối năm', 'HOLIDAY', 500000, 'Thưởng cuối năm cho nhân viên có thâm niên và đóng góp tốt', TRUE, 1),

-- REFERRAL - Thưởng giới thiệu
(NULL, 'Thưởng giới thiệu nhân viên mới', 'REFERRAL', 500000, 'Thưởng khi giới thiệu được nhân viên mới và nhân viên đó làm việc trên 3 tháng', TRUE, 1),
(NULL, 'Thưởng giới thiệu khách hàng VIP', 'REFERRAL', 200000, 'Thưởng khi giới thiệu được khách hàng VIP (mua hàng thường xuyên)', TRUE, 1),

-- SPECIAL - Thưởng đặc biệt
(NULL, 'Thưởng đặc biệt - Sự kiện', 'SPECIAL', 300000, 'Thưởng đặc biệt cho nhân viên tham gia tổ chức sự kiện thành công', TRUE, 1),
(NULL, 'Thưởng đặc biệt - Đề xuất cải tiến', 'SPECIAL', 200000, 'Thưởng cho nhân viên có đề xuất cải tiến được áp dụng', TRUE, 1),
(NULL, 'Thưởng đặc biệt - Xử lý tình huống khó', 'SPECIAL', 250000, 'Thưởng cho nhân viên xử lý tốt các tình huống khó khăn', TRUE, 1);

-- =====================================================
-- PENALTY CONFIG - Cấu hình mức phạt
-- =====================================================

-- Xóa dữ liệu cũ nếu có (uncomment dòng này nếu muốn reset)
-- DELETE FROM penalty_config WHERE branch_id IS NULL;

-- Cập nhật/Thêm mẫu phạt cho coffee shop
-- Lưu ý: penalty_config có UNIQUE KEY (penalty_type, branch_id), nên dùng ON DUPLICATE KEY UPDATE
INSERT INTO penalty_config (branch_id, name, penalty_type, amount, description, is_active, created_by) VALUES
-- LATE - Đi muộn
(NULL, 'Phạt đi muộn 5-15 phút', 'LATE', 20000, 'Phạt đi muộn từ 5 đến 15 phút', TRUE, 1),
(NULL, 'Phạt đi muộn 15-30 phút', 'LATE', 40000, 'Phạt đi muộn từ 15 đến 30 phút', TRUE, 1),
(NULL, 'Phạt đi muộn trên 30 phút', 'LATE', 60000, 'Phạt đi muộn trên 30 phút', TRUE, 1),
(NULL, 'Phạt đi muộn quá 1 giờ', 'LATE', 100000, 'Phạt đi muộn quá 1 giờ (coi như nghỉ không phép nếu không có lý do)', TRUE, 1),

-- NO_SHOW - Không đi làm
(NULL, 'Phạt không đi làm (không báo trước)', 'NO_SHOW', 150000, 'Phạt không đi làm mà không báo trước cho quản lý', TRUE, 1),
(NULL, 'Phạt không đi làm (có báo nhưng không hợp lý)', 'NO_SHOW', 100000, 'Phạt không đi làm có báo nhưng lý do không hợp lý', TRUE, 1),

-- EARLY_LEAVE - Về sớm
(NULL, 'Phạt về sớm 15-30 phút', 'EARLY_LEAVE', 30000, 'Phạt về sớm từ 15 đến 30 phút không có lý do', TRUE, 1),
(NULL, 'Phạt về sớm trên 30 phút', 'EARLY_LEAVE', 50000, 'Phạt về sớm trên 30 phút không có lý do', TRUE, 1),

-- VIOLATION - Vi phạm
(NULL, 'Phạt vi phạm quy định phục vụ', 'VIOLATION', 50000, 'Phạt vi phạm quy định phục vụ khách hàng (thái độ không tốt, không tuân thủ quy trình)', TRUE, 1),
(NULL, 'Phạt vi phạm vệ sinh an toàn thực phẩm', 'VIOLATION', 100000, 'Phạt vi phạm quy định vệ sinh an toàn thực phẩm', TRUE, 1),
(NULL, 'Phạt làm hỏng thiết bị/máy móc', 'VIOLATION', 200000, 'Phạt làm hỏng thiết bị, máy móc do sơ suất', TRUE, 1),
(NULL, 'Phạt vi phạm đồng phục', 'VIOLATION', 20000, 'Phạt không mặc đồng phục hoặc mặc không đúng quy định', TRUE, 1),
(NULL, 'Phạt sử dụng điện thoại khi làm việc', 'VIOLATION', 30000, 'Phạt sử dụng điện thoại cá nhân khi đang phục vụ khách', TRUE, 1),

-- UNPAID_LEAVE - Nghỉ không phép
(NULL, 'Nghỉ không phép (tính theo lương ngày)', 'UNPAID_LEAVE', 0, 'Nghỉ không phép - trừ lương theo ngày (amount = 0, tính theo lương cơ bản)', TRUE, 1),

-- OTHER - Khác
(NULL, 'Phạt khác - Tùy trường hợp', 'OTHER', 50000, 'Phạt cho các trường hợp vi phạm khác (quản lý sẽ điều chỉnh amount)', TRUE, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  amount = VALUES(amount),
  description = VALUES(description),
  is_active = VALUES(is_active),
  update_at = CURRENT_TIMESTAMP;

-- =====================================================
-- ALLOWANCE TEMPLATES - Mẫu phụ cấp
-- =====================================================

-- Xóa dữ liệu cũ nếu có (uncomment dòng này nếu muốn reset và tạo lại từ đầu)
-- DELETE FROM allowance_templates WHERE branch_id IS NULL;

-- Phụ cấp cho nhân viên coffee shop
-- Lưu ý: Nếu chạy nhiều lần sẽ tạo duplicate. Uncomment DELETE ở trên nếu muốn reset.
INSERT INTO allowance_templates (branch_id, name, allowance_type, amount, description, is_active, created_by) VALUES
-- MEAL - Phụ cấp ăn
(NULL, 'Phụ cấp ăn trưa', 'MEAL', 30000, 'Phụ cấp ăn trưa cho nhân viên làm ca sáng/chiều', TRUE, 1),
(NULL, 'Phụ cấp ăn tối', 'MEAL', 35000, 'Phụ cấp ăn tối cho nhân viên làm ca tối', TRUE, 1),
(NULL, 'Phụ cấp ăn ca đêm', 'MEAL', 40000, 'Phụ cấp ăn cho nhân viên làm ca đêm (sau 22h)', TRUE, 1),

-- TRANSPORT - Phụ cấp đi lại
(NULL, 'Phụ cấp xăng xe', 'TRANSPORT', 200000, 'Phụ cấp xăng xe hàng tháng cho nhân viên đi xe máy', TRUE, 1),
(NULL, 'Phụ cấp đi lại (xe bus/grab)', 'TRANSPORT', 150000, 'Phụ cấp đi lại hàng tháng cho nhân viên đi xe bus hoặc grab', TRUE, 1),
(NULL, 'Phụ cấp đi lại ca đêm', 'TRANSPORT', 100000, 'Phụ cấp đi lại bổ sung cho nhân viên làm ca đêm (an toàn)', TRUE, 1),

-- PHONE - Phụ cấp điện thoại
(NULL, 'Phụ cấp điện thoại', 'PHONE', 100000, 'Phụ cấp điện thoại hàng tháng cho nhân viên', TRUE, 1),
(NULL, 'Phụ cấp điện thoại quản lý', 'PHONE', 200000, 'Phụ cấp điện thoại hàng tháng cho quản lý (liên lạc nhiều hơn)', TRUE, 1),

-- ROLE - Phụ cấp chức vụ
(NULL, 'Phụ cấp trưởng ca', 'ROLE', 500000, 'Phụ cấp chức vụ cho nhân viên làm trưởng ca', TRUE, 1),
(NULL, 'Phụ cấp phó quản lý', 'ROLE', 1000000, 'Phụ cấp chức vụ cho phó quản lý', TRUE, 1),
(NULL, 'Phụ cấp quản lý', 'ROLE', 2000000, 'Phụ cấp chức vụ cho quản lý chi nhánh', TRUE, 1),
(NULL, 'Phụ cấp barista chuyên nghiệp', 'ROLE', 300000, 'Phụ cấp cho barista có chứng chỉ hoặc kỹ năng đặc biệt', TRUE, 1),

-- OTHER - Phụ cấp khác
(NULL, 'Phụ cấp thâm niên (1-2 năm)', 'OTHER', 200000, 'Phụ cấp thâm niên cho nhân viên làm việc từ 1-2 năm', TRUE, 1),
(NULL, 'Phụ cấp thâm niên (2-5 năm)', 'OTHER', 400000, 'Phụ cấp thâm niên cho nhân viên làm việc từ 2-5 năm', TRUE, 1),
(NULL, 'Phụ cấp thâm niên (trên 5 năm)', 'OTHER', 600000, 'Phụ cấp thâm niên cho nhân viên làm việc trên 5 năm', TRUE, 1),
(NULL, 'Phụ cấp làm việc cuối tuần', 'OTHER', 50000, 'Phụ cấp bổ sung cho nhân viên làm việc vào cuối tuần', TRUE, 1),
(NULL, 'Phụ cấp làm việc ngày lễ', 'OTHER', 100000, 'Phụ cấp bổ sung cho nhân viên làm việc vào ngày lễ', TRUE, 1),
(NULL, 'Phụ cấp làm việc ca đêm', 'OTHER', 80000, 'Phụ cấp bổ sung cho nhân viên làm việc ca đêm (sau 22h)', TRUE, 1),
(NULL, 'Phụ cấp đào tạo', 'OTHER', 200000, 'Phụ cấp cho nhân viên tham gia đào tạo, nâng cao kỹ năng', TRUE, 1);


-- =============================================
-- HOÀN TẤT
-- =============================================
-- Dữ liệu mẫu đã được tạo thành công!
-- 
-- Tóm tắt:
-- - 1 Admin account (admin@coffee.com / admin123)
-- - 2 Manager accounts (manager1@coffee.com, manager2@coffee.com / admin123)
-- - 2 Branches với manager tương ứng và bàn mẫu
-- - 5 Categories, 4 Sizes
-- - 4 Suppliers
-- - 20 Ingredients
-- - 12 Products với product_details (28 product_details tổng cộng)
-- - 28 Recipes với recipe_items (TẤT CẢ product_details đều có recipe)
-- - Stock cho cả 2 branches
-- - 15 Bonus Templates (SYSTEM scope)
-- - 12 Penalty Configs (SYSTEM scope)
-- - 17 Allowance Templates (SYSTEM scope)
-- =============================================

