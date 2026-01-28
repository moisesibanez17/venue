-- Migration: Replace MercadoPago with Stripe in purchases table
-- Date: 2026-01-27

-- Add Stripe columns
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);

-- Create indexes for Stripe columns
CREATE INDEX IF NOT EXISTS idx_purchases_stripe_session 
ON purchases(stripe_session_id);

CREATE INDEX IF NOT EXISTS idx_purchases_stripe_payment_intent 
ON purchases(stripe_payment_intent_id);

-- Drop MercadoPago columns (if they exist)
ALTER TABLE purchases 
DROP COLUMN IF EXISTS mercadopago_payment_id,
DROP COLUMN IF EXISTS mercadopago_preference_id;

-- Drop old MercadoPago index
DROP INDEX IF EXISTS idx_purchases_mp_payment;

-- Add comments
COMMENT ON COLUMN purchases.stripe_session_id IS 'Stripe Checkout Session ID';
COMMENT ON COLUMN purchases.stripe_payment_intent_id IS 'Stripe Payment Intent ID';
