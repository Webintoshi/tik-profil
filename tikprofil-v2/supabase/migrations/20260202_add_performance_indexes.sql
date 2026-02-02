-- ============================================
-- Performance Indexes for FastFood Module
-- FAZ 4: Query optimization
-- ============================================

-- ============================================
-- 1. Orders table indexes
-- ============================================

-- Most common query: business_id + status + created_at (for order listing)
CREATE INDEX IF NOT EXISTS ff_orders_business_status_created_idx 
ON ff_orders(business_id, status, created_at DESC);

-- Customer lookup: business_id + customer_phone (for customer history)
CREATE INDEX IF NOT EXISTS ff_orders_business_phone_idx 
ON ff_orders(business_id, customer_phone);

-- Order number lookup (for admin search)
CREATE INDEX IF NOT EXISTS ff_orders_order_number_idx 
ON ff_orders(order_number);

-- Real-time subscription filter (already exists, verify)
CREATE INDEX IF NOT EXISTS ff_orders_business_id_idx 
ON ff_orders(business_id);

-- Cursor-based pagination: created_at DESC for efficient pagination
CREATE INDEX IF NOT EXISTS ff_orders_created_at_desc_idx 
ON ff_orders(created_at DESC);

-- Composite index for pending orders with pagination
CREATE INDEX IF NOT EXISTS ff_orders_pending_pagination_idx 
ON ff_orders(business_id, status, created_at DESC) 
WHERE status = 'pending';

-- ============================================
-- 2. Products table indexes
-- ============================================

-- Product listing: business_id + category_id + is_active
CREATE INDEX IF NOT EXISTS ff_products_business_category_active_idx 
ON ff_products(business_id, category_id, is_active);

-- Stock filter: business_id + in_stock + track_stock
CREATE INDEX IF NOT EXISTS ff_products_business_stock_idx 
ON ff_products(business_id, in_stock, track_stock) 
WHERE track_stock = true;

-- Active products lookup
CREATE INDEX IF NOT EXISTS ff_products_active_idx 
ON ff_products(business_id, is_active, in_stock);

-- ============================================
-- 3. Categories table indexes
-- ============================================

-- Category listing with sort order
CREATE INDEX IF NOT EXISTS ff_categories_business_sort_idx 
ON ff_categories(business_id, sort_order);

-- ============================================
-- 4. Coupons table indexes
-- ============================================

-- Coupon lookup by code: code + is_active
CREATE INDEX IF NOT EXISTS ff_coupons_code_active_idx 
ON ff_coupons(code, is_active) 
WHERE is_active = true;

-- Business coupons: business_id + is_active
CREATE INDEX IF NOT EXISTS ff_coupons_business_active_idx 
ON ff_orders(business_id, is_active);

-- Coupon valid date range lookup
CREATE INDEX IF NOT EXISTS ff_coupons_valid_dates_idx 
ON ff_coupons(valid_from, valid_until) 
WHERE is_active = true;

-- ============================================
-- 5. Extra groups and extras indexes
-- ============================================

-- Extra groups by business
CREATE INDEX IF NOT EXISTS ff_extra_groups_business_idx 
ON ff_extra_groups(business_id, is_active);

-- Extras by group
CREATE INDEX IF NOT EXISTS ff_extras_group_idx 
ON ff_extras(group_id, is_active);

-- ============================================
-- 6. Stock reservations (if table exists)
-- ============================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'ff_stock_reservations'
    ) THEN
        -- Stock reservations by order
        CREATE INDEX IF NOT EXISTS ff_stock_reservations_order_idx 
        ON ff_stock_reservations(order_id);
        
        -- Business stock reservations
        CREATE INDEX IF NOT EXISTS ff_stock_reservations_business_idx 
        ON ff_stock_reservations(business_id);
        
        -- Expired reservations cleanup
        CREATE INDEX IF NOT EXISTS ff_stock_reservations_expires_idx 
        ON ff_stock_reservations(expires_at) 
        WHERE expires_at < NOW();
    END IF;
END $$;

-- ============================================
-- 7. Campaigns indexes
-- ============================================

-- Active campaigns by business
CREATE INDEX IF NOT EXISTS ff_campaigns_business_active_idx 
ON ff_campaigns(business_id, is_active);

-- ============================================
-- Index Analysis & Verification Queries
-- ============================================

-- Check all FastFood indexes
COMMENT ON TABLE ff_orders IS 'FastFood orders with performance indexes for business_id, status, created_at';
COMMENT ON TABLE ff_products IS 'FastFood products with indexes for business_id, category_id, is_active';
COMMENT ON TABLE ff_categories IS 'FastFood categories with indexes for business_id, sort_order';
COMMENT ON TABLE ff_coupons IS 'FastFood coupons with indexes for code lookup and business filtering';

-- Verify indexes were created
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename LIKE 'ff_%'
ORDER BY tablename, indexname;
