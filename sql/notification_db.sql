-- notification_db SQL schema
DROP DATABASE IF EXISTS notification_db;
CREATE DATABASE notification_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE notification_db;

CREATE TABLE notification_templates (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL COMMENT 'Tên template hiển thị trong CMS',
  code VARCHAR(100) NOT NULL UNIQUE COMMENT 'Mã template dùng bởi service khi render',
  channel ENUM('EMAIL','SMS','PUSH','WEBSOCKET') NOT NULL COMMENT 'Kênh gửi thông báo',
  subject VARCHAR(255) DEFAULT NULL COMMENT 'Tiêu đề (áp dụng cho email/push)',
  content TEXT NOT NULL COMMENT 'Nội dung template, cho phép placeholder ${variable}',
  variables JSON DEFAULT NULL COMMENT 'Danh sách biến yêu cầu để render template',
  default_target_role VARCHAR(20) DEFAULT NULL COMMENT 'ROLE mặc định: STAFF, CUSTOMER, MANAGER, NULL = tất cả',
  scope ENUM('USER','BRANCH','SYSTEM') NOT NULL DEFAULT 'USER' COMMENT 'Phạm vi: theo user, theo chi nhánh, hay hệ thống',
  frontend_type VARCHAR(50) DEFAULT NULL COMMENT 'Tên enum NotificationType ở frontend (ví dụ: ORDER_CREATED)',
  is_active TINYINT(1) DEFAULT 1 COMMENT '1: đang sử dụng, 0: ngừng dùng',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: notifications (lưu instance thông báo)
CREATE TABLE notifications (
  id VARCHAR(36) NOT NULL COMMENT 'UUID thông báo',
  user_id INT DEFAULT NULL COMMENT 'Người nhận (tham chiếu auth/profile service). NULL cho branch-level notifications',
  target_role VARCHAR(20) DEFAULT NULL COMMENT 'Vai trò người nhận (STAFF, MANAGER, NULL cho tất cả)',
  channel ENUM('EMAIL','SMS','PUSH','WEBSOCKET') NOT NULL COMMENT 'Kênh thực tế được gửi',
  template_code VARCHAR(100) DEFAULT NULL COMMENT 'Template đã dùng để render',
  title VARCHAR(255) DEFAULT NULL COMMENT 'Tiêu đề hiển thị (email/push/in-app)',
  content TEXT NOT NULL COMMENT 'Nội dung cuối cùng đã render',
  status ENUM('PENDING','SENT','FAILED','DELIVERED') NOT NULL DEFAULT 'PENDING' COMMENT 'Trạng thái gửi',
  is_read BOOLEAN DEFAULT FALSE COMMENT 'Đã đọc hay chưa (cho in-app notifications)',
  read_at DATETIME DEFAULT NULL COMMENT 'Thời gian đọc thông báo',
  metadata JSON DEFAULT NULL COMMENT 'Thông tin thêm: requestId, error message, payload gốc',
  sent_at DATETIME DEFAULT NULL COMMENT 'Ghi nhận thời gian gửi thành công',
  delivered_at DATETIME DEFAULT NULL COMMENT 'Thời gian client xác nhận đã nhận',
  branch_id INT DEFAULT NULL COMMENT 'Chi nhánh gửi thông báo (NULL cho user-level notifications)',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_user (user_id),
  KEY idx_notifications_branch (branch_id),
  KEY idx_notifications_status (status),
  KEY idx_notifications_target_role (target_role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: user_notification_preferences (tùy chọn từng người dùng)
CREATE TABLE user_notification_preferences (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE COMMENT 'User áp dụng cấu hình này',
  email_enabled TINYINT(1) DEFAULT 1 COMMENT 'Bật/tắt email chung',
  sms_enabled TINYINT(1) DEFAULT 0 COMMENT 'Bật/tắt SMS',
  push_enabled TINYINT(1) DEFAULT 1 COMMENT 'Bật/tắt push/mobile',
  websocket_enabled TINYINT(1) DEFAULT 1 COMMENT 'Bật/tắt real-time/WebSocket/in-app',
  push_sound_enabled TINYINT(1) DEFAULT 1 COMMENT 'Bật/tắt âm thanh cho push notifications',
  push_vibration_enabled TINYINT(1) DEFAULT 1 COMMENT 'Bật/tắt rung cho push notifications (mobile)',
  order_notifications TINYINT(1) DEFAULT 1 COMMENT 'Nhận thông báo liên quan đơn hàng',
  inventory_notifications TINYINT(1) DEFAULT 0 COMMENT 'Nhận cảnh báo tồn kho (chủ yếu cho manager)',
  system_notifications TINYINT(1) DEFAULT 1 COMMENT 'Nhận thông báo hệ thống/chung',
  quiet_hours_from TIME DEFAULT NULL COMMENT 'Giờ bắt đầu không làm phiền',
  quiet_hours_to TIME DEFAULT NULL COMMENT 'Giờ kết thúc không làm phiền',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Push subscriptions for Web Push API
CREATE TABLE push_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT 'ID của user đăng ký push',
    endpoint VARCHAR(500) NOT NULL COMMENT 'Push service endpoint URL',
    p256dh_key VARCHAR(255) NOT NULL COMMENT 'Public key cho encryption (P-256 DH)',
    auth_key VARCHAR(255) NOT NULL COMMENT 'Authentication secret key',
    user_agent VARCHAR(255) COMMENT 'User agent của browser',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời gian đăng ký',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời gian cập nhật',
    UNIQUE KEY unique_user_endpoint (user_id, endpoint(255)),
    KEY idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO notification_templates (name, code, channel, subject, content, variables, default_target_role, scope, frontend_type)
VALUES
('Order Confirmation Email', 'ORDER_CONFIRMATION_EMAIL', 'EMAIL',
'Đơn hàng #${orderCode} đã được tạo',
'<p>Xin chào ${customerName},</p><p>Bạn đã đặt thành công đơn #${orderCode} với tổng tiền ${totalAmount}.</p>',
'["customerName","orderCode","totalAmount"]',
NULL, 'USER', NULL),

('Low Stock Alert Email', 'LOW_STOCK_ALERT_EMAIL', 'EMAIL',
'Cảnh báo tồn kho thấp - ${ingredientName}',
CONCAT(
'<p>Chi nhánh: <strong>${branchName}</strong></p>',
'<p>Nguyên liệu: <strong>${ingredientName}</strong></p>',
'<p>Số lượng còn lại: <strong>${availableQuantity} ${unitCode}</strong></p>',
'<p>Ngưỡng cảnh báo: <strong>${threshold} ${unitCode}</strong></p>',
'<p>Vui lòng kiểm tra và lập phiếu nhập hàng sớm.</p>'
),
'["branchName","ingredientName","availableQuantity","threshold","unitCode"]', -- ĐÃ SỬA DÒNG NÀY
'MANAGER', 'BRANCH', NULL),

('Out Of Stock Alert Email', 'OUT_OF_STOCK_ALERT_EMAIL', 'EMAIL',
'Hết hàng - ${ingredientName}',
CONCAT(
'<p>Chi nhánh: <strong>${branchName}</strong></p>',
'<p>Nguyên liệu: <strong>${ingredientName}</strong></p>',
'<p>Tình trạng: <strong>Hết hàng</strong></p>',
'<p>Vui lòng ưu tiên nhập kho ngay để tránh gián đoạn kinh doanh.</p>'
),
'["branchName","ingredientName"]',
'MANAGER', 'BRANCH', NULL);

-- Seed thêm template WebSocket cho in-app notifications
INSERT INTO notification_templates (name, code, channel, subject, content, variables, default_target_role, scope, frontend_type)
VALUES
('Order Created Websocket', 'ORDER_CREATED_WS', 'WEBSOCKET',
'Đơn hàng mới #${orderId}',
'Khách: ${customerName} • Đơn #${orderId} • Tổng tiền: ${totalAmount}đ',
'["orderId","customerName","totalAmount","branchId"]',
'STAFF', 'BRANCH', 'ORDER_CREATED'),
('Order Completed Websocket', 'ORDER_COMPLETED_WS', 'WEBSOCKET',
'Đơn hàng #${orderId} đã hoàn thành',
'Đơn hàng #${orderId} của bạn đã được hoàn thành. Tổng tiền: ${totalAmount}đ',
'["orderId","totalAmount","branchId"]',
'CUSTOMER', 'USER', 'ORDER_STATUS_UPDATED');

-- Reservation WebSocket templates (đặt bàn)
INSERT INTO notification_templates (name, code, channel, subject, content, variables, default_target_role, scope, frontend_type)
VALUES
('Reservation Created Websocket', 'RESERVATION_CREATED_WS', 'WEBSOCKET',
'Đặt bàn mới #${reservationId}',
'Khách: ${customerName} • Đặt bàn #${reservationId} • Số người: ${partySize} • Thời gian: ${reservedAt}',
'["reservationId","customerName","partySize","reservedAt","branchId"]',
'STAFF', 'BRANCH', 'RESERVATION_CREATED'),
('Reservation Confirmed Websocket', 'RESERVATION_CONFIRMED_WS', 'WEBSOCKET',
'Đặt bàn #${reservationId} đã được xác nhận',
'Đặt bàn #${reservationId} của bạn tại chi nhánh ${branchName} lúc ${reservedAt} đã được xác nhận.',
'["reservationId","branchName","reservedAt","branchId"]',
'CUSTOMER', 'USER', 'RESERVATION_CREATED'),
('Reservation Cancelled Websocket', 'RESERVATION_CANCELLED_WS', 'WEBSOCKET',
'Đặt bàn #${reservationId} đã bị hủy',
'Đặt bàn #${reservationId} của bạn tại chi nhánh ${branchName} lúc ${reservedAt} đã bị hủy.',
'["reservationId","branchName","reservedAt","branchId"]',
'CUSTOMER', 'USER', 'RESERVATION_CREATED');

-- Order cancelled WebSocket template
INSERT INTO notification_templates (name, code, channel, subject, content, variables, default_target_role, scope, frontend_type)
VALUES
('Order Cancelled Websocket', 'ORDER_CANCELLED_WS', 'WEBSOCKET',
'Đơn hàng #${orderId} đã bị hủy',
'Đơn hàng #${orderId} của bạn đã bị hủy. Tổng tiền: ${totalAmount}đ',
'["orderId","totalAmount","branchId"]',
'CUSTOMER', 'USER', 'ORDER_STATUS_UPDATED');

-- Purchase Order Supplier WebSocket templates
INSERT INTO notification_templates (name, code, channel, subject, content, variables, default_target_role, scope, frontend_type)
VALUES
('PO Supplier Confirmed Websocket', 'PO_SUPPLIER_CONFIRMED_WS', 'WEBSOCKET',
'Nhà cung cấp đã xác nhận PO ${poNumber}',
'Nhà cung cấp ${supplierName} đã xác nhận đơn mua hàng ${poNumber} cho chi nhánh ${branchName}. Tổng giá trị: ${totalAmount} VND. Dự kiến giao: ${expectedDeliveryAt}.',
'["poId","poNumber","branchId","branchName","supplierName","totalAmount","expectedDeliveryAt","status"]',
'MANAGER', 'BRANCH', 'SYSTEM_ALERT'),
('PO Supplier Cancelled Websocket', 'PO_SUPPLIER_CANCELLED_WS', 'WEBSOCKET',
'Nhà cung cấp đã hủy PO ${poNumber}',
'Nhà cung cấp ${supplierName} đã hủy đơn mua hàng ${poNumber} cho chi nhánh ${branchName}. Lý do: ${supplierResponse}.',
'["poId","poNumber","branchId","branchName","supplierName","totalAmount","supplierResponse","status"]',
'MANAGER', 'BRANCH', 'SYSTEM_ALERT');

-- Inventory WebSocket templates for managers
INSERT INTO notification_templates (name, code, channel, subject, content, variables, default_target_role, scope, frontend_type)
VALUES
('Low Stock Alert Websocket (Manager)', 'LOW_STOCK_ALERT_WS', 'WEBSOCKET',
'Cảnh báo tồn kho thấp - ${ingredientName}',
'Chi nhánh ${branchName} đang có tồn kho thấp cho nguyên liệu ${ingredientName} (${availableQuantity} ${unitCode}). Ngưỡng cảnh báo: ${threshold} ${unitCode}.',
'["branchId","branchName","ingredientId","ingredientName","unitCode","unitName","availableQuantity","threshold","severity","detectedAt"]',
'MANAGER', 'BRANCH', 'LOW_STOCK_ALERT'),
('Out Of Stock Alert Websocket (Manager)', 'OUT_OF_STOCK_ALERT_WS', 'WEBSOCKET',
'Cảnh báo hết hàng - ${ingredientName}',
'Chi nhánh ${branchName} đã hết hàng nguyên liệu ${ingredientName}. Vui lòng kiểm tra và lập đơn mua hàng sớm.',
'["branchId","branchName","ingredientId","ingredientName","unitCode","unitName","availableQuantity","threshold","detectedAt"]',
'MANAGER', 'BRANCH', 'OUT_OF_STOCK_ALERT');

