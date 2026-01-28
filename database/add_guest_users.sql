-- Migration: Add guest user support
-- Date: 2026-01-27

-- Make password_hash nullable for guest users
ALTER TABLE users 
ALTER COLUMN password_hash DROP NOT NULL;

-- Add is_guest column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT FALSE;

-- Add index for guest users
CREATE INDEX IF NOT EXISTS idx_users_is_guest 
ON users(is_guest);

-- Add comment
COMMENT ON COLUMN users.is_guest IS 'Indicates if user is a guest (no password required)';
COMMENT ON COLUMN users.password_hash IS 'Password hash - NULL for guest users';
