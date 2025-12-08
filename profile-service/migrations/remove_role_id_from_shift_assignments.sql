-- Migration: Remove role_id column from shift_assignments table
-- Date: 2024-01-XX
-- Description: Remove role_id column as staff will work with all their roles in a shift

-- Step 1: Drop the index on role_id if it exists
ALTER TABLE shift_assignments DROP INDEX IF EXISTS idx_assignments_role;

-- Step 2: Drop the role_id column
ALTER TABLE shift_assignments DROP COLUMN IF EXISTS role_id;

