DO $migration_guard$
DECLARE
    v_required_table text;
BEGIN
    FOREACH v_required_table IN ARRAY ARRAY[
        'ff_orders',
        'ff_coupons',
        'ff_coupon_usages',
        'ff_products'
    ] LOOP
        IF to_regclass(format('public.%I', v_required_table)) IS NULL THEN
            RAISE EXCEPTION 'FASTFOOD_ORDER_ATOMICITY_REQUIRED_TABLE_MISSING: %', v_required_table;
        END IF;
    END LOOP;
END
$migration_guard$;

DO $$
BEGIN
    IF to_regclass('public.ff_orders') IS NOT NULL THEN
        ALTER TABLE ff_orders
            ADD COLUMN IF NOT EXISTS idempotency_key text,
            ADD COLUMN IF NOT EXISTS idempotency_fingerprint text;

        CREATE UNIQUE INDEX IF NOT EXISTS idx_ff_orders_business_idempotency
            ON ff_orders (business_id, idempotency_key)
            WHERE idempotency_key IS NOT NULL;
    END IF;

    IF to_regclass('public.ff_coupon_usages') IS NOT NULL THEN
        ALTER TABLE ff_coupon_usages
            ADD COLUMN IF NOT EXISTS app_user_id uuid;

        IF to_regclass('public.app_users') IS NOT NULL AND NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conrelid = 'public.ff_coupon_usages'::regclass
              AND conname = 'ff_coupon_usages_app_user_id_fkey'
        ) THEN
            ALTER TABLE ff_coupon_usages
                ADD CONSTRAINT ff_coupon_usages_app_user_id_fkey
                FOREIGN KEY (app_user_id) REFERENCES app_users(id) ON DELETE SET NULL;
        END IF;

        CREATE INDEX IF NOT EXISTS idx_ff_coupon_usages_customer_owner
            ON ff_coupon_usages (coupon_id, app_user_id, customer_phone);
    END IF;
END $$;

DO $migration$
BEGIN
    IF to_regclass('public.ff_orders') IS NOT NULL
       AND to_regclass('public.ff_coupons') IS NOT NULL
       AND to_regclass('public.ff_coupon_usages') IS NOT NULL THEN
        EXECUTE $sql$
CREATE OR REPLACE FUNCTION create_fastfood_order_atomic(
    p_idempotency_key text,
    p_idempotency_fingerprint text,
    p_app_user_id uuid,
    p_business_id text,
    p_business_name text,
    p_order_number text,
    p_customer_name text,
    p_customer_phone text,
    p_customer_address text,
    p_delivery_type text,
    p_payment_method text,
    p_items jsonb,
    p_subtotal numeric,
    p_delivery_fee numeric,
    p_coupon_discount numeric,
    p_total numeric,
    p_customer_note text,
    p_coupon_id text,
    p_coupon_code text,
    p_table_id text,
    p_created_at timestamptz
)
RETURNS TABLE(order_id text, order_number text, status text, was_created boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_existing ff_orders%ROWTYPE;
    v_coupon ff_coupons%ROWTYPE;
    v_coupon_discount numeric := 0;
    v_normalized_phone text := regexp_replace(COALESCE(p_customer_phone, ''), '\D', '', 'g');
    v_order_id ff_orders.id%TYPE;
    v_now timestamptz := now();
    v_usage_count bigint := 0;
BEGIN
    IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) < 16 THEN
        RAISE EXCEPTION 'IDEMPOTENCY_KEY_INVALID';
    END IF;
    IF p_idempotency_fingerprint IS NULL OR p_idempotency_fingerprint !~ '^[a-f0-9]{64}$' THEN
        RAISE EXCEPTION 'IDEMPOTENCY_FINGERPRINT_INVALID';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(p_business_id || ':' || p_idempotency_key, 0));

    SELECT *
    INTO v_existing
    FROM ff_orders
    WHERE business_id = p_business_id
      AND idempotency_key = p_idempotency_key
    LIMIT 1;

    IF FOUND THEN
        IF v_existing.idempotency_fingerprint <> p_idempotency_fingerprint THEN
            RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
        END IF;
        RETURN QUERY SELECT v_existing.id::text, v_existing.order_number::text, 'pending'::text, false;
        RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(
        p_business_id || ':customer-phone:' || v_normalized_phone,
        0
    ));
    IF p_app_user_id IS NOT NULL THEN
        PERFORM pg_advisory_xact_lock(hashtextextended(
            p_business_id || ':customer-user:' || p_app_user_id::text,
            0
        ));
    END IF;

    IF p_coupon_code IS NOT NULL THEN
        SELECT *
        INTO v_coupon
        FROM ff_coupons
        WHERE business_id = p_business_id
          AND upper(code) = upper(p_coupon_code)
        LIMIT 1
        FOR UPDATE;

        IF NOT FOUND
           OR v_coupon.is_active IS FALSE
           OR (p_coupon_id IS NOT NULL AND v_coupon.id::text <> p_coupon_id)
           OR (v_coupon.valid_from IS NOT NULL AND v_coupon.valid_from > v_now)
           OR (v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < v_now)
           OR COALESCE(v_coupon.min_order_amount, 0) > p_subtotal
           OR (COALESCE(v_coupon.max_usage_count, 0) > 0
               AND COALESCE(v_coupon.current_usage_count, 0) >= v_coupon.max_usage_count) THEN
            RAISE EXCEPTION 'COUPON_INVALID';
        END IF;

        IF v_coupon.applicable_to = 'products' AND NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements(p_items) item
            WHERE item->>'productId' = ANY(COALESCE(v_coupon.applicable_product_ids, ARRAY[]::text[]))
        ) THEN
            RAISE EXCEPTION 'COUPON_INVALID';
        END IF;

        IF v_coupon.applicable_to = 'categories' AND NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements(p_items) item
            INNER JOIN ff_products product ON product.id::text = item->>'productId'
            WHERE product.category_id = ANY(COALESCE(v_coupon.applicable_category_ids, ARRAY[]::text[]))
        ) THEN
            RAISE EXCEPTION 'COUPON_INVALID';
        END IF;

        IF COALESCE(v_coupon.usage_per_user, 0) > 0 THEN
            SELECT count(*)
            INTO v_usage_count
            FROM ff_coupon_usages usage
            WHERE usage.coupon_id = v_coupon.id
              AND (
                  (p_app_user_id IS NOT NULL AND usage.app_user_id = p_app_user_id)
                  OR regexp_replace(COALESCE(usage.customer_phone, ''), '\D', '', 'g') = v_normalized_phone
              );
            IF v_usage_count >= v_coupon.usage_per_user THEN
                RAISE EXCEPTION 'COUPON_USER_LIMIT';
            END IF;
        END IF;

        IF v_coupon.is_first_order_only IS TRUE AND EXISTS (
            SELECT 1
            FROM ff_orders previous_order
            WHERE previous_order.business_id = p_business_id
              AND (
                  (p_app_user_id IS NOT NULL AND previous_order.app_user_id = p_app_user_id)
                  OR regexp_replace(COALESCE(previous_order.customer_phone, ''), '\D', '', 'g') = v_normalized_phone
              )
        ) THEN
            RAISE EXCEPTION 'COUPON_FIRST_ORDER_ONLY';
        END IF;

        IF v_coupon.discount_type = 'fixed' THEN
            v_coupon_discount := round(least(p_subtotal, COALESCE(v_coupon.discount_value, 0)), 2);
        ELSIF v_coupon.discount_type = 'percentage' THEN
            v_coupon_discount := round(p_subtotal * COALESCE(v_coupon.discount_value, 0) / 100, 2);
            IF COALESCE(v_coupon.max_discount_amount, 0) > 0 THEN
                v_coupon_discount := least(v_coupon_discount, v_coupon.max_discount_amount);
            END IF;
            v_coupon_discount := least(p_subtotal, v_coupon_discount);
        ELSIF v_coupon.discount_type = 'free_delivery' THEN
            v_coupon_discount := p_delivery_fee;
        ELSE
            RAISE EXCEPTION 'COUPON_INVALID';
        END IF;
    ELSIF p_coupon_id IS NOT NULL OR p_coupon_discount <> 0 THEN
        RAISE EXCEPTION 'COUPON_INVALID';
    END IF;

    IF abs(v_coupon_discount - p_coupon_discount) > 0.01
       OR abs((p_subtotal + p_delivery_fee - v_coupon_discount) - p_total) > 0.01 THEN
        RAISE EXCEPTION 'PRICE_MISMATCH';
    END IF;

    INSERT INTO ff_orders (
        app_user_id, business_id, business_name, order_number,
        customer_name, customer_phone, customer_address,
        delivery_type, payment_method, items, subtotal, delivery_fee, total,
        customer_note, coupon_id, coupon_code, coupon_discount,
        status, status_history, delivery, payment, pricing, table_id,
        idempotency_key, idempotency_fingerprint, created_at, updated_at
    ) VALUES (
        p_app_user_id, p_business_id, p_business_name, p_order_number,
        p_customer_name, v_normalized_phone, COALESCE(p_customer_address, ''),
        p_delivery_type, p_payment_method, p_items, p_subtotal, p_delivery_fee, p_total,
        COALESCE(p_customer_note, ''), v_coupon.id, v_coupon.code, v_coupon_discount,
        'pending', jsonb_build_array(jsonb_build_object('status', 'pending', 'timestamp', p_created_at)),
        CASE WHEN p_delivery_type = 'table'
            THEN jsonb_build_object('type', 'table', 'tableId', p_table_id)
            ELSE jsonb_build_object('type', p_delivery_type, 'address', COALESCE(p_customer_address, ''))
        END,
        jsonb_build_object('method', p_payment_method),
        jsonb_build_object('subtotal', p_subtotal, 'deliveryFee', p_delivery_fee, 'couponDiscount', v_coupon_discount, 'total', p_total),
        p_table_id, p_idempotency_key, p_idempotency_fingerprint, p_created_at, p_created_at
    )
    RETURNING id INTO v_order_id;

    IF p_coupon_code IS NOT NULL THEN
        UPDATE ff_coupons
        SET current_usage_count = COALESCE(current_usage_count, 0) + 1,
            updated_at = p_created_at
        WHERE id = v_coupon.id;

        INSERT INTO ff_coupon_usages (
            business_id, coupon_id, order_id, app_user_id,
            customer_phone, discount_amount, used_at
        ) VALUES (
            p_business_id, v_coupon.id, v_order_id, p_app_user_id,
            v_normalized_phone, v_coupon_discount, p_created_at
        );
    END IF;

    RETURN QUERY SELECT v_order_id::text, p_order_number, 'pending'::text, true;
END
$function$;
$sql$;

        EXECUTE 'REVOKE ALL ON FUNCTION create_fastfood_order_atomic(text,text,uuid,text,text,text,text,text,text,text,text,jsonb,numeric,numeric,numeric,numeric,text,text,text,text,timestamptz) FROM PUBLIC';
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
            EXECUTE 'GRANT EXECUTE ON FUNCTION create_fastfood_order_atomic(text,text,uuid,text,text,text,text,text,text,text,text,jsonb,numeric,numeric,numeric,numeric,text,text,text,text,timestamptz) TO service_role';
        END IF;
    END IF;
END
$migration$;
