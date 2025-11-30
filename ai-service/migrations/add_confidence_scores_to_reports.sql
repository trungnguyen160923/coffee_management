-- Migration: Add confidence scores to ai_reports table
-- Phase 4: Database Integration
-- Date: 2025-01-XX

-- Add confidence score columns to ai_reports table
ALTER TABLE ai_reports
ADD COLUMN data_quality_score FLOAT NULL COMMENT 'Data quality score (0.0-1.0)',
ADD COLUMN ml_confidence_score FLOAT NULL COMMENT 'ML confidence score (0.0-1.0)',
ADD COLUMN ai_quality_score FLOAT NULL COMMENT 'AI response quality score (0.0-1.0)',
ADD COLUMN overall_confidence_score FLOAT NULL COMMENT 'Overall confidence score (0.0-1.0)',
ADD COLUMN confidence_breakdown JSON NULL COMMENT 'Detailed confidence breakdown as JSON',
ADD COLUMN validation_flags JSON NULL COMMENT 'Validation warnings/flags as JSON';

-- Add indexes for better query performance (optional)
-- CREATE INDEX idx_data_quality_score ON ai_reports(data_quality_score);
-- CREATE INDEX idx_overall_confidence_score ON ai_reports(overall_confidence_score);

-- Verify the changes
-- SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
-- FROM INFORMATION_SCHEMA.COLUMNS
-- WHERE TABLE_SCHEMA = DATABASE()
--   AND TABLE_NAME = 'ai_reports'
--   AND COLUMN_NAME LIKE '%confidence%' OR COLUMN_NAME LIKE '%quality%';

