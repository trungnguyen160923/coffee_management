-- Database schema for AI Analytics Service
-- Create database if not exists
CREATE DATABASE IF NOT EXISTS analytics_db_report CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE analytics_db_report;

-- Table for storing AI-generated reports
CREATE TABLE IF NOT EXISTS ai_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    report_date DATETIME NOT NULL,
    tool_type VARCHAR(50) NULL,
    
    -- Report content
    analysis TEXT NOT NULL,
    summary JSON NULL,
    recommendations JSON NULL,
    raw_data JSON NULL,
    
    -- Metadata
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Status flags
    is_sent BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at DATETIME NULL,
    
    -- Additional metadata
    query TEXT NULL,
    ai_model VARCHAR(100) NULL,
    processing_time_ms INT NULL,
    
    -- Indexes for better query performance
    INDEX idx_branch_id (branch_id),
    INDEX idx_report_date (report_date),
    INDEX idx_branch_date (branch_id, report_date),
    INDEX idx_is_sent (is_sent),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

