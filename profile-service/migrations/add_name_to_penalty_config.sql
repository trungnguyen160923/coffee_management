-- Migration: Add name column to penalty_config table
-- Date: 2025-12-13
-- Description: Add name field to penalty_config to match allowance_templates and bonus_templates structure

ALTER TABLE penalty_config 
  ADD COLUMN name VARCHAR(100) NOT NULL DEFAULT '' AFTER branch_id;

-- Update existing records with default names based on penalty_type
UPDATE penalty_config 
SET name = CASE 
  WHEN penalty_type = 'NO_SHOW' THEN 'Phạt không đi làm'
  WHEN penalty_type = 'LATE_15MIN' THEN 'Phạt đi muộn 15 phút'
  WHEN penalty_type = 'LATE_30MIN' THEN 'Phạt đi muộn 30 phút'
  WHEN penalty_type = 'EARLY_LEAVE' THEN 'Phạt về sớm'
  WHEN penalty_type = 'UNPAID_LEAVE' THEN 'Nghỉ không phép'
  ELSE CONCAT('Phạt: ', penalty_type)
END
WHERE name = '';

-- Remove default value after updating existing records
ALTER TABLE penalty_config 
  MODIFY COLUMN name VARCHAR(100) NOT NULL;

