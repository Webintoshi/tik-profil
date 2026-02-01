-- ============================================
-- FastFood Stock Management Migration
-- FAZ 1: Critical Security Enhancement
-- ============================================

-- Add stock column to ff_products table
ALTER TABLE ff_products 
ADD COLUMN IF NOT EXISTS stock integer DEFAULT 999;

-- Add stock tracking columns for better inventory management
ALTER TABLE ff_products 
ADD COLUMN IF NOT EXISTS track_stock boolean DEFAULT false;

-- Add index for efficient stock queries
CREATE INDEX IF NOT EXISTS ff_products_stock_idx 
ON ff_products(business_id, in_stock, stock);

-- Add index for stock tracking queries
CREATE INDEX IF NOT EXISTS ff_products_track_stock_idx 
ON ff_products(business_id, track_stock);

-- Update existing products:
-- If in_stock = true, set stock to 999 (unlimited/default)
-- If in_stock = false, set stock to 0
UPDATE ff_products 
SET stock = CASE 
    WHEN in_stock = true THEN 999 
    ELSE 0 
END
WHERE stock IS NULL;

-- Add stock reservation table for concurrent order handling
-- Uses text for IDs to match existing schema pattern
CREATE TABLE IF NOT EXISTS ff_stock_reservations (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    product_id text NOT NULL REFERENCES ff_products(id) ON DELETE CASCADE,
    business_id text NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    quantity integer NOT NULL CHECK (quantity > 0),
    session_id text NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now(),
    
    -- Ensure unique reservation per product per session
    CONSTRAINT unique_product_session UNIQUE (product_id, session_id)
);

-- Index for cleaning up expired reservations
CREATE INDEX IF NOT EXISTS ff_stock_reservations_expires_idx 
ON ff_stock_reservations(expires_at);

-- Index for business lookups
CREATE INDEX IF NOT EXISTS ff_stock_reservations_business_idx 
ON ff_stock_reservations(business_id);

-- Add comment for documentation
COMMENT ON COLUMN ff_products.stock IS 'Available stock quantity. 999 means unlimited/default stock.';
COMMENT ON COLUMN ff_products.track_stock IS 'Whether to actively track and limit stock for this product';
COMMENT ON TABLE ff_stock_reservations IS 'Temporary stock reservations during checkout process to prevent overselling';

-- Create function to cleanup expired reservations (can be called by a cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_stock_reservations()
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM ff_stock_reservations 
    WHERE expires_at < now();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_expired_stock_reservations() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_stock_reservations() TO service_role;
