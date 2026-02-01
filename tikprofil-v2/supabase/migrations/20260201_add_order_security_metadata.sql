-- ============================================
-- FastFood Order Security Metadata
-- FAZ 1: Security enhancement for audit trail
-- ============================================

-- Add security metadata to ff_orders table
ALTER TABLE ff_orders 
ADD COLUMN IF NOT EXISTS price_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_at timestamptz,
ADD COLUMN IF NOT EXISTS client_ip text,
ADD COLUMN IF NOT EXISTS user_agent text;

-- Index for security audits
CREATE INDEX IF NOT EXISTS ff_orders_verified_idx 
ON ff_orders(price_verified, verified_at);

-- Index for fraud detection
CREATE INDEX IF NOT EXISTS ff_orders_client_ip_idx 
ON ff_orders(client_ip, created_at);

-- Add comments for documentation
COMMENT ON COLUMN ff_orders.price_verified IS 'Whether order prices were verified server-side';
COMMENT ON COLUMN ff_orders.verified_at IS 'Timestamp of price verification';
COMMENT ON COLUMN ff_orders.client_ip IS 'Client IP address for fraud detection';
COMMENT ON COLUMN ff_orders.user_agent IS 'Client user agent for analytics';

-- ============================================
-- Stock Restore Function (Transaction-safe)
-- ============================================

CREATE OR REPLACE FUNCTION restore_order_stock(
    p_items jsonb,
    p_business_id text
) RETURNS void AS $$
DECLARE
    v_item jsonb;
BEGIN
    -- Process each item in a transaction
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        UPDATE ff_products
        SET 
            stock = stock + COALESCE((v_item->>'quantity')::integer, 0),
            in_stock = true
        WHERE 
            id = (v_item->>'product_id')::text 
            AND business_id = p_business_id
            AND track_stock = true;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION restore_order_stock(jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_order_stock(jsonb, text) TO service_role;

-- ============================================
-- Order Stock Decrement Function (Transaction-safe)
-- ============================================

CREATE OR REPLACE FUNCTION decrement_order_stock(
    p_items jsonb,
    p_business_id text
) RETURNS TABLE (
    product_id text,
    product_name text,
    requested_quantity integer,
    available_stock integer,
    success boolean
) AS $$
DECLARE
    v_item jsonb;
    v_product_record record;
    v_current_stock integer;
BEGIN
    -- First pass: Check all stocks
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT id, name, stock, track_stock 
        INTO v_product_record
        FROM ff_products
        WHERE id = (v_item->>'product_id')::text 
          AND business_id = p_business_id;
        
        -- If product not found or doesn't track stock, skip
        IF v_product_record IS NULL OR v_product_record.track_stock = false THEN
            CONTINUE;
        END IF;
        
        v_current_stock := COALESCE(v_product_record.stock, 0);
        
        -- Return stock check result
        RETURN QUERY SELECT 
            v_product_record.id::text,
            v_product_record.name::text,
            COALESCE((v_item->>'quantity')::integer, 0),
            v_current_stock,
            v_current_stock >= COALESCE((v_item->>'quantity')::integer, 0);
    END LOOP;
    
    -- Second pass: Actually decrement if all checks passed
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        UPDATE ff_products
        SET 
            stock = stock - COALESCE((v_item->>'quantity')::integer, 0),
            in_stock = (stock - COALESCE((v_item->>'quantity')::integer, 0)) > 0
        WHERE 
            id = (v_item->>'product_id')::text 
            AND business_id = p_business_id
            AND track_stock = true;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION decrement_order_stock(jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_order_stock(jsonb, text) TO service_role;
