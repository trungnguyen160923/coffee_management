-- =============================================
-- DATABASE SCHEMA FOR ANALYTICS SERVICE (Core)
-- =============================================

-- Nên tạo database riêng cho service này nếu chưa có
CREATE DATABASE IF NOT EXISTS analytics_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE analytics_db;

-- =============================================
-- 1. Bảng Input: Dữ liệu Metrics Hàng Ngày
--    (Cung cấp dữ liệu để train và predict)
-- =============================================
CREATE TABLE daily_branch_metrics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Khóa chính tự tăng',
    branch_id INT NOT NULL COMMENT 'ID của chi nhánh (nên đồng bộ kiểu dữ liệu với service khác)',
    report_date DATE NOT NULL COMMENT 'Ngày ghi nhận metrics',

    -- Các cột chỉ số (features) dùng để train/predict:
    -- Revenue & Orders
    total_revenue DECIMAL(15, 2) COMMENT 'Tổng doanh thu trong ngày',
    order_count INT COMMENT 'Tổng số đơn hàng trong ngày',
    avg_order_value DECIMAL(10, 2) COMMENT 'Giá trị đơn hàng trung bình',
    
    -- Customer Metrics
    customer_count INT COMMENT 'Số lượng khách hàng',
    repeat_customers INT COMMENT 'Số khách hàng quay lại',
    new_customers INT COMMENT 'Số khách hàng mới',
    
    -- Product Metrics  
    unique_products_sold INT COMMENT 'Số sản phẩm khác nhau đã bán',
    top_selling_product_id INT COMMENT 'ID sản phẩm bán chạy nhất',
    product_diversity_score DECIMAL(5, 4) COMMENT 'Điểm đa dạng sản phẩm (0-1)',
    
    -- Time-based Features
    peak_hour INT COMMENT 'Giờ cao điểm (0-23)',
    day_of_week INT COMMENT 'Thứ trong tuần (1-7)',
    is_weekend BOOLEAN COMMENT 'Có phải cuối tuần không',
    
    -- Operational Metrics
    avg_preparation_time_seconds INT COMMENT 'Thời gian chuẩn bị trung bình (giây)',
    staff_efficiency_score DECIMAL(5, 4) COMMENT 'Điểm hiệu quả nhân viên (0-1)',
    
    -- Quality & Cost
    avg_review_score DOUBLE COMMENT 'Điểm đánh giá trung bình',
    material_cost DECIMAL(15, 2) COMMENT 'Chi phí nguyên vật liệu',
    waste_percentage DECIMAL(5, 4) COMMENT 'Tỷ lệ lãng phí (0-1)',
    
    -- Inventory Metrics
    low_stock_products INT COMMENT 'Số sản phẩm sắp hết hàng',
    out_of_stock_products INT COMMENT 'Số sản phẩm hết hàng',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo bản ghi',

    -- Ràng buộc: Đảm bảo mỗi chi nhánh chỉ có 1 bản ghi metrics/ngày
    UNIQUE KEY uk_branch_date (branch_id, report_date),

    -- Indexes để tăng tốc truy vấn
    INDEX idx_branch_id (branch_id),
    INDEX idx_report_date (report_date)

) COMMENT 'Bảng lưu trữ các chỉ số hoạt động chính của chi nhánh theo ngày';

-- =============================================
-- 2. Bảng Model: Lưu trữ Model Đã Train
--    (Lưu "bộ não" đã học của Isolation Forest)
-- =============================================
CREATE TABLE ml_models (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Khóa chính tự tăng',
    model_name VARCHAR(255) NOT NULL COMMENT 'Tên định danh cho model (vd: iforest_anomaly_branch_123)',
    model_version VARCHAR(50) NOT NULL COMMENT 'Phiên bản của model (vd: v1.0, v1.1)',
    model_type VARCHAR(100) DEFAULT 'ISOLATION_FOREST' COMMENT 'Loại thuật toán (vd: ISOLATION_FOREST, PROPHET)',

    -- Cột quan trọng: Lưu trữ trạng thái model đã train
    model_data LONGBLOB NOT NULL COMMENT 'Dữ liệu nhị phân của đối tượng model đã được serialize',

    -- Metadata bổ sung (quan trọng cho quản lý)
    hyperparameters TEXT COMMENT 'Các siêu tham số dùng khi train (dạng JSON, vd: {"ntrees": 100, "subSampleSize": 256})',
    feature_list TEXT COMMENT 'Danh sách các features đã dùng để train (dạng JSON)',
    training_data_start_date DATE COMMENT 'Ngày bắt đầu dữ liệu training',
    training_data_end_date DATE COMMENT 'Ngày kết thúc dữ liệu training',
    training_samples_count INT COMMENT 'Số lượng mẫu dữ liệu training',
    
    -- Model Performance Metrics
    accuracy_score DECIMAL(5, 4) COMMENT 'Độ chính xác của model (0-1)',
    precision_score DECIMAL(5, 4) COMMENT 'Precision score (0-1)',
    recall_score DECIMAL(5, 4) COMMENT 'Recall score (0-1)',
    f1_score DECIMAL(5, 4) COMMENT 'F1 score (0-1)',
    
    -- Training Data Statistics
    training_data_stats TEXT COMMENT 'Thống kê dữ liệu training (mean, std, min, max) dạng JSON',
    
    -- Model Lifecycle
    trained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm model được train/lưu',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Cờ đánh dấu model đang được sử dụng chính thức',
    is_production BOOLEAN DEFAULT FALSE COMMENT 'Cờ đánh dấu model đang chạy production',
    created_by VARCHAR(100) COMMENT 'Người tạo model',

    -- Ràng buộc: Cho phép nhiều version cùng tên model
    UNIQUE KEY uk_model_name_version (model_name, model_version),
    
    -- Indexes để tăng tốc truy vấn
    INDEX idx_model_name (model_name),
    INDEX idx_is_active (is_active)

) COMMENT 'Bảng lưu trữ các mô hình Machine Learning đã được train';


-- =============================================
-- 3. Bảng Output: Kết quả Phát hiện Bất thường
--    (Lưu kết quả dự đoán của model)
-- =============================================
CREATE TABLE anomaly_results (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Khóa chính tự tăng',
    metric_id BIGINT COMMENT 'FK liên kết đến bản ghi trong daily_branch_metrics được phân tích',
    branch_id BIGINT NOT NULL COMMENT 'ID chi nhánh được phân tích',
    analysis_date DATE NOT NULL COMMENT 'Ngày của dữ liệu được phân tích',
    model_id BIGINT COMMENT 'FK liên kết đến model trong ml_models đã dùng để phân tích',

    -- Kết quả dự đoán
    is_anomaly BOOLEAN NOT NULL COMMENT 'Kết quả: true nếu là bất thường, false nếu bình thường',
    anomaly_score DOUBLE COMMENT 'Điểm số bất thường do model chấm (0-1, càng cao càng bất thường)',
    confidence_level DECIMAL(5, 4) COMMENT 'Độ tin cậy của dự đoán (0-1)',
    
    -- Business Logic
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') COMMENT 'Mức độ nghiêm trọng',
    status ENUM('DETECTED', 'INVESTIGATING', 'RESOLVED', 'IGNORED') DEFAULT 'DETECTED' COMMENT 'Trạng thái xử lý',
    
    -- Context Information
    affected_features TEXT COMMENT 'Danh sách features bị ảnh hưởng (JSON)',
    baseline_values TEXT COMMENT 'Giá trị baseline để so sánh (JSON)',
    actual_values TEXT COMMENT 'Giá trị thực tế (JSON)',
    
    -- Resolution Tracking
    resolved_at TIMESTAMP NULL COMMENT 'Thời điểm giải quyết',
    resolved_by VARCHAR(100) COMMENT 'Người giải quyết',
    resolution_notes TEXT COMMENT 'Ghi chú về cách giải quyết',

    analysis_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm chạy phân tích',

    -- Khóa ngoại
    FOREIGN KEY (metric_id) REFERENCES daily_branch_metrics(id) ON DELETE SET NULL, -- Hoặc ON DELETE CASCADE tùy logic
    FOREIGN KEY (model_id) REFERENCES ml_models(id) ON DELETE SET NULL,

    -- Indexes
    INDEX idx_branch_analysis_date (branch_id, analysis_date),
    INDEX idx_is_anomaly (is_anomaly),
    INDEX idx_analysis_date (analysis_date)

) COMMENT 'Bảng lưu trữ kết quả dự đoán bất thường từ mô hình ML';

CREATE TABLE IF NOT EXISTS forecast_results (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Khóa chính tự tăng',
    branch_id INT NOT NULL COMMENT 'ID chi nhánh',
    forecast_date DATE NOT NULL COMMENT 'Ngày tạo forecast',
    forecast_start_date DATE NOT NULL COMMENT 'Ngày bắt đầu dự báo',
    forecast_end_date DATE NOT NULL COMMENT 'Ngày kết thúc dự báo',
    model_id BIGINT COMMENT 'FK liên kết đến model trong ml_models',
    
    -- Target metric và algorithm
    target_metric VARCHAR(50) NOT NULL COMMENT 'Metric được dự báo (order_count, total_revenue, etc.)',
    algorithm VARCHAR(50) NOT NULL COMMENT 'Thuật toán (PROPHET, LIGHTGBM, XGBOOST)',
    
    -- Kết quả dự báo (JSON)
    forecast_values TEXT COMMENT 'Kết quả dự báo dạng JSON: {"2025-11-09": 150, "2025-11-10": 165, ...}',
    confidence_intervals TEXT COMMENT 'Confidence intervals dạng JSON: {"2025-11-09": {"lower": 140, "upper": 160}, ...}',
    
    -- Performance metrics (nếu có validation)
    mae DECIMAL(15, 4) COMMENT 'Mean Absolute Error',
    mse DECIMAL(15, 4) COMMENT 'Mean Squared Error',
    rmse DECIMAL(15, 4) COMMENT 'Root Mean Squared Error',
    mape DECIMAL(10, 4) COMMENT 'Mean Absolute Percentage Error (%)',
    
    -- Metadata
    training_samples_count INT COMMENT 'Số lượng samples training',
    training_date_start DATE COMMENT 'Ngày bắt đầu training data',
    training_date_end DATE COMMENT 'Ngày kết thúc training data',
    forecast_horizon_days INT DEFAULT 7 COMMENT 'Số ngày dự báo',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo forecast',
    
    -- Khóa ngoại
    FOREIGN KEY (model_id) REFERENCES ml_models(id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_branch_forecast_date (branch_id, forecast_date),
    INDEX idx_target_metric (target_metric),
    INDEX idx_algorithm (algorithm),
    INDEX idx_forecast_date_range (forecast_start_date, forecast_end_date)
    
) COMMENT 'Bảng lưu trữ kết quả dự báo nhu cầu';

-- =============================================
-- 5. Bảng Báo Cáo AI: ai_reports
-- =============================================
CREATE TABLE IF NOT EXISTS ai_reports (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Khóa chính tự tăng',
    branch_id INT NOT NULL COMMENT 'ID chi nhánh',
    report_date DATETIME NOT NULL COMMENT 'Ngày tạo báo cáo',
    tool_type VARCHAR(50) NULL COMMENT 'Loại công cụ AI sử dụng',
    
    -- Report content
    analysis TEXT NOT NULL COMMENT 'Nội dung phân tích chi tiết',
    summary JSON NULL COMMENT 'Tóm tắt báo cáo dạng JSON',
    recommendations JSON NULL COMMENT 'Khuyến nghị dạng JSON',
    raw_data JSON NULL COMMENT 'Dữ liệu thô phục vụ báo cáo',
    
    -- Metadata
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm cập nhật',
    
    -- Status flags
    is_sent BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Đã gửi báo cáo hay chưa',
    sent_at DATETIME NULL COMMENT 'Thời điểm gửi báo cáo',
    
    -- Additional metadata
    query TEXT NULL COMMENT 'Truy vấn/dữ liệu đầu vào dùng để sinh báo cáo',
    ai_model VARCHAR(100) NULL COMMENT 'Tên model AI sử dụng',
    processing_time_ms INT NULL COMMENT 'Thời gian xử lý (ms)',
    
    -- Indexes for better query performance
    INDEX idx_branch_id (branch_id),
    INDEX idx_report_date (report_date),
    INDEX idx_branch_date (branch_id, report_date),
    INDEX idx_is_sent (is_sent),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT 'Bảng lưu trữ báo cáo AI được sinh tự động';

-- =============================================
-- 6. Bảng Hỗ Trợ: Cấu Hình Hệ Thống
-- =============================================

-- Bảng cấu hình hệ thống
CREATE TABLE system_configurations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Khóa chính tự tăng',
    config_key VARCHAR(100) NOT NULL UNIQUE COMMENT 'Tên cấu hình',
    config_value TEXT NOT NULL COMMENT 'Giá trị cấu hình',
    config_type ENUM('STRING', 'NUMBER', 'BOOLEAN', 'JSON') NOT NULL COMMENT 'Kiểu dữ liệu',
    description TEXT COMMENT 'Mô tả cấu hình',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_config_key (config_key)
) COMMENT 'Bảng lưu trữ cấu hình hệ thống';

-- =============================================
-- 7. Dữ Liệu Khởi Tạo
-- =============================================

-- Insert default system configurations
INSERT INTO system_configurations (config_key, config_value, config_type, description) VALUES
('anomaly_detection_enabled', 'true', 'BOOLEAN', 'Bật/tắt phát hiện bất thường'),
('anomaly_threshold', '0.1', 'NUMBER', 'Ngưỡng điểm bất thường'),
('daily_report_time', '08:00', 'STRING', 'Thời gian tạo báo cáo hàng ngày'),
('model_retrain_frequency', '7', 'NUMBER', 'Tần suất retrain model (ngày)'),
('max_anomaly_history_days', '90', 'NUMBER', 'Số ngày lưu trữ lịch sử anomalies');

-- =============================================
-- 8. Views & Utilities
-- =============================================

-- View tổng hợp anomalies
CREATE VIEW v_anomaly_summary AS
SELECT 
    ar.analysis_date,
    ar.branch_id,
    COUNT(*) as total_anomalies,
    COUNT(CASE WHEN ar.severity = 'CRITICAL' THEN 1 END) as critical_anomalies,
    COUNT(CASE WHEN ar.severity = 'HIGH' THEN 1 END) as high_anomalies,
    COUNT(CASE WHEN ar.status = 'RESOLVED' THEN 1 END) as resolved_anomalies,
    AVG(ar.anomaly_score) as avg_anomaly_score
FROM anomaly_results ar
WHERE ar.analysis_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY ar.analysis_date, ar.branch_id;

-- View tổng hợp forecasts
CREATE VIEW v_forecast_summary AS
SELECT 
    fr.forecast_date,
    fr.branch_id,
    fr.target_metric,
    fr.algorithm,
    fr.forecast_horizon_days,
    fr.training_samples_count,
    fr.mae,
    fr.rmse,
    fr.mape,
    fr.forecast_start_date,
    fr.forecast_end_date
FROM forecast_results fr
WHERE fr.forecast_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
ORDER BY fr.forecast_date DESC, fr.branch_id;

-- =============================================
-- END OF CORE SCHEMA
-- =============================================