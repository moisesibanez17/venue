-- Migration: Add Stripe session tracking to purchases table
-- Date: 2026-01-27

-- Add stripe_session_id column to purchases table
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_purchases_stripe_session 
ON purchases(stripe_session_id);

-- Add comment
COMMENT ON COLUMN purchases.stripe_session_id IS 'Stripe Checkout Session ID for tracking payments';
