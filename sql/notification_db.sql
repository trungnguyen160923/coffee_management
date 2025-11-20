-- notification_db SQL schema
DROP DATABASE IF EXISTS notification_db;
CREATE DATABASE notification_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE notification_db;

-- Table: notification_templates (template metadata + content)
CREATE TABLE notification_templates (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL COMMENT 'Tên template hiển thị trong CMS',
  code VARCHAR(100) NOT NULL UNIQUE COMMENT 'Mã template dùng bởi service khi render',
  channel ENUM('EMAIL','SMS','PUSH','WEBSOCKET') NOT NULL COMMENT 'Kênh gửi thông báo',
  subject VARCHAR(255) DEFAULT NULL COMMENT 'Tiêu đề (áp dụng cho email/push)',
  content TEXT NOT NULL COMMENT 'Nội dung template, cho phép placeholder ${variable}',
  variables JSON DEFAULT NULL COMMENT 'Danh sách biến yêu cầu để render template',
  is_active TINYINT(1) DEFAULT 1 COMMENT '1: đang sử dụng, 0: ngừng dùng',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: notifications (lưu instance thông báo)
CREATE TABLE notifications (
  id VARCHAR(36) NOT NULL COMMENT 'UUID thông báo',
  user_id INT NOT NULL COMMENT 'Người nhận (tham chiếu auth/profile service)',
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
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_user (user_id),
  KEY idx_notifications_status (status)
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

-- Seed mẫu template cơ bản
INSERT INTO notification_templates (name, code, channel, subject, content, variables)
VALUES
('Order Confirmation Email', 'ORDER_CONFIRMATION_EMAIL', 'EMAIL',
 'Đơn hàng #${orderCode} đã được tạo',
 '<p>Xin chào ${customerName},</p><p>Bạn đã đặt thành công đơn #${orderCode} với tổng tiền ${totalAmount}.</p>',
 '["customerName","orderCode","totalAmount"]');

