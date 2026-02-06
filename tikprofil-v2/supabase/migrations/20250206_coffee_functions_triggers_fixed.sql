-- ============================================
-- TIKPROFIL COFFEE SHOP MODULE - FUNCTIONS & TRIGGERS (FIXED)
-- business_id: UUID -> TEXT
-- ============================================

-- UPDATED AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_coffee_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at column
DROP TRIGGER IF EXISTS update_coffee_categories_updated_at ON coffee_categories;
CREATE TRIGGER update_coffee_categories_updated_at
    BEFORE UPDATE ON coffee_categories
    FOR EACH ROW EXECUTE FUNCTION update_coffee_updated_at();

DROP TRIGGER IF EXISTS update_coffee_sizes_updated_at ON coffee_sizes;
CREATE TRIGGER update_coffee_sizes_updated_at
    BEFORE UPDATE ON coffee_sizes
    FOR EACH ROW EXECUTE FUNCTION update_coffee_updated_at();

DROP TRIGGER IF EXISTS update_coffee_extra_groups_updated_at ON coffee_extra_groups;
CREATE TRIGGER update_coffee_extra_groups_updated_at
    BEFORE UPDATE ON coffee_extra_groups
    FOR EACH ROW EXECUTE FUNCTION update_coffee_updated_at();

DROP TRIGGER IF EXISTS update_coffee_extras_updated_at ON coffee_extras;
CREATE TRIGGER update_coffee_extras_updated_at
    BEFORE UPDATE ON coffee_extras
    FOR EACH ROW EXECUTE FUNCTION update_coffee_updated_at();

DROP TRIGGER IF EXISTS update_coffee_products_updated_at ON coffee_products;
CREATE TRIGGER update_coffee_products_updated_at
    BEFORE UPDATE ON coffee_products
    FOR EACH ROW EXECUTE FUNCTION update_coffee_updated_at();

DROP TRIGGER IF EXISTS update_coffee_orders_updated_at ON coffee_orders;
CREATE TRIGGER update_coffee_orders_updated_at
    BEFORE UPDATE ON coffee_orders
    FOR EACH ROW EXECUTE FUNCTION update_coffee_updated_at();

DROP TRIGGER IF EXISTS update_coffee_coupons_updated_at ON coffee_coupons;
CREATE TRIGGER update_coffee_coupons_updated_at
    BEFORE UPDATE ON coffee_coupons
    FOR EACH ROW EXECUTE FUNCTION update_coffee_updated_at();

DROP TRIGGER IF EXISTS update_coffee_loyalty_customers_updated_at ON coffee_loyalty_customers;
CREATE TRIGGER update_coffee_loyalty_customers_updated_at
    BEFORE UPDATE ON coffee_loyalty_customers
    FOR EACH ROW EXECUTE FUNCTION update_coffee_updated_at();

DROP TRIGGER IF EXISTS update_coffee_settings_updated_at ON coffee_settings;
CREATE TRIGGER update_coffee_settings_updated_at
    BEFORE UPDATE ON coffee_settings
    FOR EACH ROW EXECUTE FUNCTION update_coffee_updated_at();

DROP TRIGGER IF EXISTS update_coffee_tables_updated_at ON coffee_tables;
CREATE TRIGGER update_coffee_tables_updated_at
    BEFORE UPDATE ON coffee_tables
    FOR EACH ROW EXECUTE FUNCTION update_coffee_updated_at();

DROP TRIGGER IF EXISTS update_coffee_subscriptions_updated_at ON coffee_subscriptions;
CREATE TRIGGER update_coffee_subscriptions_updated_at
    BEFORE UPDATE ON coffee_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_coffee_updated_at();

-- ORDER NUMBER GENERATOR
CREATE OR REPLACE FUNCTION generate_coffee_order_number(p_business_id TEXT)
RETURNS TEXT AS $$
DECLARE
    v_date TEXT := TO_CHAR(NOW(), 'YYMMDD');
    v_sequence INTEGER;
    v_order_number TEXT;
BEGIN
    SELECT COUNT(*) INTO v_sequence
    FROM coffee_orders
    WHERE business_id = p_business_id
    AND DATE(created_at) = CURRENT_DATE;

    v_sequence := v_sequence + 1;

    v_order_number := 'COF-' || v_date || '-' || LPAD(v_sequence::TEXT, 3, '0');

    RETURN v_order_number;
END;
$$ LANGUAGE plpgsql;

-- STAMPS EARNED CALCULATOR
CREATE OR REPLACE FUNCTION calculate_coffee_stamps_earned(p_order_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_subtotal NUMERIC;
    v_setting_value INTEGER;
    v_stamps INTEGER;
BEGIN
    SELECT subtotal INTO v_subtotal
    FROM coffee_orders
    WHERE id = p_order_id;

    SELECT COALESCE(stamps_for_free_drink, 10) INTO v_setting_value
    FROM coffee_settings
    WHERE business_id = (SELECT business_id FROM coffee_orders WHERE id = p_order_id);

    v_stamps := FLOOR(v_subtotal / v_setting_value)::INTEGER;

    RETURN v_stamps;
END;
$$ LANGUAGE plpgsql;

-- POINTS EARNED CALCULATOR
CREATE OR REPLACE FUNCTION calculate_coffee_points_earned(p_order_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_subtotal NUMERIC;
    v_points_per_currency INTEGER;
    v_points INTEGER;
BEGIN
    SELECT subtotal INTO v_subtotal
    FROM coffee_orders
    WHERE id = p_order_id;

    SELECT COALESCE(points_per_currency, 10) INTO v_points_per_currency
    FROM coffee_settings
    WHERE business_id = (SELECT business_id FROM coffee_orders WHERE id = p_order_id);

    v_points := FLOOR(v_subtotal * v_points_per_currency)::INTEGER;

    RETURN v_points;
END;
$$ LANGUAGE plpgsql;

-- TIER CALCULATOR
CREATE OR REPLACE FUNCTION calculate_coffee_tier(p_customer_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_total_spent NUMERIC;
    v_bronze_threshold INTEGER;
    v_silver_threshold INTEGER;
    v_gold_threshold INTEGER;
    v_business_id TEXT;
BEGIN
    SELECT business_id, total_spent INTO v_business_id, v_total_spent
    FROM coffee_loyalty_customers
    WHERE id = p_customer_id;

    SELECT
        COALESCE(tier_bronze_threshold, 0),
        COALESCE(tier_silver_threshold, 500),
        COALESCE(tier_gold_threshold, 2000)
    INTO v_bronze_threshold, v_silver_threshold, v_gold_threshold
    FROM coffee_settings
    WHERE business_id = v_business_id;

    IF v_total_spent >= v_gold_threshold THEN
        RETURN 'gold';
    ELSIF v_total_spent >= v_silver_threshold THEN
        RETURN 'silver';
    ELSE
        RETURN 'bronze';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- LOYALTY REWARD TRIGGER
CREATE OR REPLACE FUNCTION award_coffee_loyalty()
RETURNS TRIGGER AS $$
DECLARE
    v_customer_id UUID;
    v_stamps INTEGER;
    v_points INTEGER;
    v_new_tier TEXT;
BEGIN
    IF NEW.status != 'completed' OR OLD.status = 'completed' THEN
        RETURN NEW;
    END IF;

    SELECT id INTO v_customer_id
    FROM coffee_loyalty_customers
    WHERE business_id = NEW.business_id
    AND customer_phone = NEW.customer_phone;

    IF v_customer_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_stamps := calculate_coffee_stamps_earned(NEW.id);
    v_points := calculate_coffee_points_earned(NEW.id);

    UPDATE coffee_loyalty_customers
    SET
        stamps_earned = stamps_earned + v_stamps,
        points_balance = points_balance + v_points,
        points_earned = points_earned + v_points,
        total_spent = total_spent + NEW.subtotal,
        visits_count = visits_count + 1,
        last_visit_at = NOW()
    WHERE id = v_customer_id;

    v_new_tier := calculate_coffee_tier(v_customer_id);
    UPDATE coffee_loyalty_customers
    SET tier = v_new_tier
    WHERE id = v_customer_id;

    INSERT INTO coffee_loyalty_transactions (
        business_id,
        customer_id,
        order_id,
        transaction_type,
        stamps_change,
        points_change,
        description
    ) VALUES (
        NEW.business_id,
        v_customer_id,
        NEW.id,
        'stamps_earned',
        v_stamps,
        0,
        'Order #' || NEW.order_number
    );

    IF v_points > 0 THEN
        INSERT INTO coffee_loyalty_transactions (
            business_id,
            customer_id,
            order_id,
            transaction_type,
            stamps_change,
            points_change,
            description
        ) VALUES (
            NEW.business_id,
            v_customer_id,
            NEW.id,
            'points_earned',
            0,
            v_points,
            'Order #' || NEW.order_number
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for loyalty rewards
DROP TRIGGER IF EXISTS coffee_order_loyalty_trigger ON coffee_orders;
CREATE TRIGGER coffee_order_loyalty_trigger
    AFTER UPDATE ON coffee_orders
    FOR EACH ROW EXECUTE FUNCTION award_coffee_loyalty();

-- ORDER NUMBER AUTO-GENERATE TRIGGER
CREATE OR REPLACE FUNCTION set_coffee_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        NEW.order_number := generate_coffee_order_number(NEW.business_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS coffee_order_number_trigger ON coffee_orders;
CREATE TRIGGER coffee_order_number_trigger
    BEFORE INSERT ON coffee_orders
    FOR EACH ROW EXECUTE FUNCTION set_coffee_order_number();

-- TABLE COMMENTS
COMMENT ON FUNCTION generate_coffee_order_number IS 'Generate unique order number: COF-YYMMDD-###';
COMMENT ON FUNCTION calculate_coffee_stamps_earned IS 'Calculate stamps to award for an order';
COMMENT ON FUNCTION calculate_coffee_points_earned IS 'Calculate loyalty points for an order';
COMMENT ON FUNCTION calculate_coffee_tier IS 'Determine customer tier based on spending';
COMMENT ON FUNCTION award_coffee_loyalty IS 'Automatically award loyalty rewards on order completion';
COMMENT ON FUNCTION set_coffee_order_number IS 'Auto-generate order number if not provided';
