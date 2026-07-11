DO $migration_guard$
DECLARE
    v_required_table text;
BEGIN
    FOREACH v_required_table IN ARRAY ARRAY[
        'ff_orders',
        'ff_coupons',
        'ff_coupon_usages',
        'ff_products',
        'ff_settings',
        'ff_extra_groups',
        'ff_extras',
        'fb_tables'
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

CREATE TABLE IF NOT EXISTS ff_order_notification_outbox (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    business_id text NOT NULL,
    order_id text NOT NULL,
    event_type text NOT NULL,
    idempotency_key text NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'sent')),
    attempt_count integer NOT NULL DEFAULT 0,
    available_at timestamptz NOT NULL DEFAULT now(),
    locked_at timestamptz,
    sent_at timestamptz,
    provider_message_id text,
    last_error text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (order_id, event_type),
    UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_ff_order_notification_outbox_pending
    ON ff_order_notification_outbox (status, available_at, created_at);

ALTER TABLE ff_order_notification_outbox ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION claim_fastfood_notification_outbox(p_limit integer DEFAULT 20)
RETURNS TABLE(
    id text,
    business_id text,
    order_id text,
    event_type text,
    idempotency_key text,
    attempt_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $claim$
BEGIN
    RETURN QUERY
    WITH candidates AS (
        SELECT pending.id
        FROM ff_order_notification_outbox pending
        WHERE (pending.status = 'pending' AND pending.available_at <= now())
           OR (pending.status = 'processing' AND pending.locked_at < now() - interval '5 minutes')
        ORDER BY pending.created_at
        FOR UPDATE SKIP LOCKED
        LIMIT greatest(1, least(COALESCE(p_limit, 20), 100))
    ), claimed AS (
        UPDATE ff_order_notification_outbox target
        SET status = 'processing',
            attempt_count = COALESCE(target.attempt_count, 0) + 1,
            locked_at = now(),
            updated_at = now()
        FROM candidates
        WHERE target.id = candidates.id
        RETURNING target.id, target.business_id, target.order_id, target.event_type,
            target.idempotency_key, target.attempt_count
    )
    SELECT claimed.id, claimed.business_id, claimed.order_id, claimed.event_type,
        claimed.idempotency_key, claimed.attempt_count
    FROM claimed;
END
$claim$;

REVOKE ALL ON TABLE ff_order_notification_outbox FROM PUBLIC;
REVOKE ALL ON FUNCTION claim_fastfood_notification_outbox(integer) FROM PUBLIC;

DO $outbox_grants$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT SELECT, UPDATE ON TABLE ff_order_notification_outbox TO service_role;
        GRANT EXECUTE ON FUNCTION claim_fastfood_notification_outbox(integer) TO service_role;
    END IF;
END
$outbox_grants$;

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
    v_settings ff_settings%ROWTYPE;
    v_product ff_products%ROWTYPE;
    v_group ff_extra_groups%ROWTYPE;
    v_extra ff_extras%ROWTYPE;
    v_item jsonb;
    v_authoritative_item jsonb;
    v_authoritative_items jsonb := '[]'::jsonb;
    v_authoritative_extras jsonb;
    v_selected_extra jsonb;
    v_selected_size jsonb;
    v_catalog_size jsonb;
    v_group_id text;
    v_table_id text;
    v_table_has_active boolean := false;
    v_quantity integer;
    v_selected_count integer;
    v_catalog_base_price numeric;
    v_catalog_unit_price numeric;
    v_catalog_line_total numeric;
    v_catalog_subtotal numeric := 0;
    v_catalog_delivery_fee numeric := 0;
    v_catalog_total numeric := 0;
    v_size_modifier numeric;
    v_extra_total numeric;
    v_legacy_free_delivery boolean := false;
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

    IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'CART_EMPTY';
    END IF;

    SELECT *
    INTO v_settings
    FROM ff_settings
    WHERE business_id = p_business_id
    LIMIT 1
    FOR SHARE;

    IF NOT FOUND OR v_settings.is_active IS FALSE THEN
        RAISE EXCEPTION 'ORDERING_DISABLED';
    END IF;
    IF v_settings.cart_enabled IS FALSE THEN
        RAISE EXCEPTION 'CART_DISABLED';
    END IF;
    IF p_delivery_type = 'table' THEN
        IF p_table_id IS NULL OR length(trim(p_table_id)) = 0 THEN
            RAISE EXCEPTION 'TABLE_REQUIRED';
        END IF;
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'fb_tables'
              AND column_name = 'is_active'
        ) INTO v_table_has_active;

        IF v_table_has_active THEN
            EXECUTE $table_lock$
                SELECT id::text
                FROM fb_tables
                WHERE id::text = $1
                  AND business_id = $2
                  AND is_active IS NOT FALSE
                LIMIT 1
                FOR SHARE
            $table_lock$
            INTO v_table_id
            USING p_table_id, p_business_id;
        ELSE
            SELECT id::text
            INTO v_table_id
            FROM fb_tables
            WHERE id::text = p_table_id
              AND business_id = p_business_id
            LIMIT 1
            FOR SHARE;
        END IF;

        IF v_table_id IS NULL THEN
            RAISE EXCEPTION 'TABLE_INVALID';
        END IF;
    END IF;
    IF p_delivery_type = 'delivery' AND v_settings.delivery_enabled IS FALSE THEN
        RAISE EXCEPTION 'DELIVERY_DISABLED';
    END IF;
    IF p_delivery_type = 'pickup' AND v_settings.pickup_enabled IS FALSE THEN
        RAISE EXCEPTION 'PICKUP_DISABLED';
    END IF;
    IF p_payment_method = 'cash' AND v_settings.cash_payment IS FALSE THEN
        RAISE EXCEPTION 'PAYMENT_DISABLED';
    END IF;
    IF p_payment_method = 'card' AND v_settings.card_on_delivery IS FALSE THEN
        RAISE EXCEPTION 'PAYMENT_DISABLED';
    END IF;
    IF p_payment_method = 'online' AND v_settings.online_payment IS NOT TRUE THEN
        RAISE EXCEPTION 'PAYMENT_DISABLED';
    END IF;
    IF p_delivery_type NOT IN ('delivery', 'pickup', 'table')
       OR p_payment_method NOT IN ('cash', 'card', 'online') THEN
        RAISE EXCEPTION 'VALIDATION_ERROR';
    END IF;

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) AS cart_item(value) LOOP
        IF COALESCE(v_item->>'productId', '') = ''
           OR COALESCE(v_item->>'quantity', '') !~ '^[1-9][0-9]*$'
           OR jsonb_typeof(COALESCE(v_item->'selectedExtras', '[]'::jsonb)) <> 'array' THEN
            RAISE EXCEPTION 'CATALOG_CHANGED';
        END IF;
        v_quantity := (v_item->>'quantity')::integer;

        SELECT *
        INTO v_product
        FROM ff_products
        WHERE business_id = p_business_id
          AND id::text = v_item->>'productId'
        LIMIT 1
        FOR SHARE;

        IF NOT FOUND OR v_product.is_active IS FALSE OR v_product.in_stock IS FALSE THEN
            RAISE EXCEPTION 'PRODUCT_UNAVAILABLE';
        END IF;

        v_catalog_base_price := round(CASE
            WHEN v_product.discount_price IS NOT NULL
             AND v_product.discount_until IS NOT NULL
             AND v_product.discount_until > v_now
                THEN v_product.discount_price
            ELSE v_product.price
        END, 2);
        v_size_modifier := 0;
        v_selected_size := v_item->'selectedSize';
        v_catalog_size := NULL;

        IF v_selected_size IS NOT NULL AND jsonb_typeof(v_selected_size) <> 'null' THEN
            IF jsonb_typeof(v_selected_size) <> 'object' THEN
                RAISE EXCEPTION 'CATALOG_CHANGED';
            END IF;
            SELECT size_option.value
            INTO v_catalog_size
            FROM jsonb_array_elements(CASE
                WHEN jsonb_typeof(v_product.sizes) = 'array' THEN v_product.sizes
                ELSE '[]'::jsonb
            END) AS size_option(value)
            WHERE size_option.value->>'id' = v_selected_size->>'id'
            LIMIT 1;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'CATALOG_CHANGED';
            END IF;
            v_size_modifier := COALESCE(
                NULLIF(v_catalog_size->>'priceModifier', '')::numeric,
                NULLIF(v_catalog_size->>'price_modifier', '')::numeric,
                0
            );
            IF NULLIF(v_selected_size->>'priceModifier', '') IS NULL
               OR abs((v_selected_size->>'priceModifier')::numeric - v_size_modifier) > 0.01 THEN
                RAISE EXCEPTION 'PRICE_MISMATCH';
            END IF;
        END IF;

        IF EXISTS (
            SELECT 1
            FROM jsonb_array_elements(COALESCE(v_item->'selectedExtras', '[]'::jsonb)) AS selected(value)
            GROUP BY selected.value->>'id'
            HAVING count(*) > 1
        ) THEN
            RAISE EXCEPTION 'EXTRA_SELECTION_INVALID';
        END IF;

        v_authoritative_extras := '[]'::jsonb;
        v_extra_total := 0;
        FOR v_selected_extra IN
            SELECT value FROM jsonb_array_elements(COALESCE(v_item->'selectedExtras', '[]'::jsonb)) AS selected(value)
        LOOP
            SELECT *
            INTO v_extra
            FROM ff_extras
            WHERE id::text = v_selected_extra->>'id'
            LIMIT 1
            FOR SHARE;

            IF NOT FOUND
               OR v_extra.is_active IS FALSE
               OR NOT (v_extra.group_id = ANY(COALESCE(v_product.extra_group_ids, ARRAY[]::text[]))) THEN
                RAISE EXCEPTION 'PRODUCT_UNAVAILABLE';
            END IF;
            IF NULLIF(v_selected_extra->>'priceModifier', '') IS NULL
               OR abs((v_selected_extra->>'priceModifier')::numeric - COALESCE(v_extra.price_modifier, 0)) > 0.01 THEN
                RAISE EXCEPTION 'PRICE_MISMATCH';
            END IF;
            v_extra_total := v_extra_total + COALESCE(v_extra.price_modifier, 0);
            v_authoritative_extras := v_authoritative_extras || jsonb_build_array(jsonb_build_object(
                'id', v_extra.id,
                'name', v_extra.name,
                'priceModifier', COALESCE(v_extra.price_modifier, 0)
            ));
        END LOOP;

        FOREACH v_group_id IN ARRAY COALESCE(v_product.extra_group_ids, ARRAY[]::text[]) LOOP
            SELECT *
            INTO v_group
            FROM ff_extra_groups
            WHERE business_id = p_business_id
              AND id::text = v_group_id
            LIMIT 1
            FOR SHARE;

            IF NOT FOUND OR v_group.is_active IS FALSE THEN
                RAISE EXCEPTION 'CATALOG_CHANGED';
            END IF;
            SELECT count(*)::integer
            INTO v_selected_count
            FROM jsonb_array_elements(COALESCE(v_item->'selectedExtras', '[]'::jsonb)) AS selected(value)
            INNER JOIN ff_extras selected_row ON selected_row.id::text = selected.value->>'id'
            WHERE selected_row.group_id = v_group.id;
            IF (v_group.is_required IS TRUE AND v_selected_count = 0)
               OR (v_group.selection_type = 'single' AND v_selected_count > 1)
               OR (COALESCE(v_group.max_selections, 0) > 0 AND v_selected_count > v_group.max_selections) THEN
                RAISE EXCEPTION 'EXTRA_SELECTION_INVALID';
            END IF;
        END LOOP;

        v_catalog_unit_price := round(v_catalog_base_price + v_size_modifier + v_extra_total, 2);
        v_catalog_line_total := round(v_catalog_unit_price * v_quantity, 2);
        IF NULLIF(v_item->>'unitPrice', '') IS NULL
           OR (abs((v_item->>'unitPrice')::numeric - v_catalog_unit_price) > 0.01
               AND abs((v_item->>'unitPrice')::numeric - v_catalog_base_price) > 0.01)
           OR NULLIF(v_item->>'totalPrice', '') IS NULL
           OR abs((v_item->>'totalPrice')::numeric - v_catalog_line_total) > 0.01 THEN
            RAISE EXCEPTION 'PRICE_MISMATCH';
        END IF;

        v_catalog_subtotal := v_catalog_subtotal + v_catalog_line_total;
        v_authoritative_item := jsonb_build_object(
            'productId', v_product.id,
            'productName', v_product.name,
            'quantity', v_quantity,
            'selectedExtras', v_authoritative_extras,
            'unitPrice', v_catalog_unit_price,
            'totalPrice', v_catalog_line_total
        );
        IF v_catalog_size IS NOT NULL THEN
            v_authoritative_item := v_authoritative_item || jsonb_build_object('selectedSize', jsonb_build_object(
                'id', v_catalog_size->>'id',
                'name', COALESCE(v_catalog_size->>'name', ''),
                'priceModifier', v_size_modifier
            ));
        END IF;
        v_authoritative_items := v_authoritative_items || jsonb_build_array(v_authoritative_item);
    END LOOP;

    v_catalog_subtotal := round(v_catalog_subtotal, 2);
    IF v_catalog_subtotal < COALESCE(v_settings.min_order_amount, 0) THEN
        RAISE EXCEPTION 'MINIMUM_ORDER';
    END IF;
    v_catalog_delivery_fee := CASE
        WHEN p_delivery_type = 'delivery'
         AND NOT (COALESCE(v_settings.free_delivery_above, 0) > 0
                  AND v_catalog_subtotal >= v_settings.free_delivery_above)
            THEN round(COALESCE(v_settings.delivery_fee, 0), 2)
        ELSE 0
    END;
    IF abs(p_subtotal - v_catalog_subtotal) > 0.01 THEN
        RAISE EXCEPTION 'PRICE_MISMATCH';
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
           OR COALESCE(v_coupon.min_order_amount, 0) > v_catalog_subtotal
           OR (COALESCE(v_coupon.max_usage_count, 0) > 0
               AND COALESCE(v_coupon.current_usage_count, 0) >= v_coupon.max_usage_count) THEN
            RAISE EXCEPTION 'COUPON_INVALID';
        END IF;

        IF v_coupon.applicable_to = 'products' AND NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements(v_authoritative_items) item
            WHERE item->>'productId' = ANY(COALESCE(v_coupon.applicable_product_ids, ARRAY[]::text[]))
        ) THEN
            RAISE EXCEPTION 'COUPON_INVALID';
        END IF;

        IF v_coupon.applicable_to = 'categories' AND NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements(v_authoritative_items) item
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
            v_coupon_discount := round(least(v_catalog_subtotal, COALESCE(v_coupon.discount_value, 0)), 2);
        ELSIF v_coupon.discount_type = 'percentage' THEN
            v_coupon_discount := round(v_catalog_subtotal * COALESCE(v_coupon.discount_value, 0) / 100, 2);
            IF COALESCE(v_coupon.max_discount_amount, 0) > 0 THEN
                v_coupon_discount := least(v_coupon_discount, v_coupon.max_discount_amount);
            END IF;
            v_coupon_discount := least(v_catalog_subtotal, v_coupon_discount);
        ELSIF v_coupon.discount_type = 'free_delivery' THEN
            v_coupon_discount := v_catalog_delivery_fee;
        ELSE
            RAISE EXCEPTION 'COUPON_INVALID';
        END IF;
    ELSIF p_coupon_id IS NOT NULL OR p_coupon_discount <> 0 THEN
        RAISE EXCEPTION 'COUPON_INVALID';
    END IF;

    v_catalog_total := round(greatest(0, v_catalog_subtotal + v_catalog_delivery_fee - v_coupon_discount), 2);
    v_legacy_free_delivery := p_coupon_code IS NOT NULL
        AND v_coupon.discount_type = 'free_delivery'
        AND abs(p_delivery_fee) <= 0.01
        AND abs(p_coupon_discount) <= 0.01
        AND abs(p_total - v_catalog_total) <= 0.01;
    IF (NOT v_legacy_free_delivery AND abs(v_catalog_delivery_fee - p_delivery_fee) > 0.01)
       OR (NOT v_legacy_free_delivery AND abs(v_coupon_discount - p_coupon_discount) > 0.01)
       OR abs(v_catalog_total - p_total) > 0.01 THEN
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
        p_delivery_type, p_payment_method, v_authoritative_items, v_catalog_subtotal, v_catalog_delivery_fee, v_catalog_total,
        COALESCE(p_customer_note, ''), v_coupon.id, v_coupon.code, v_coupon_discount,
        'pending', jsonb_build_array(jsonb_build_object('status', 'pending', 'timestamp', p_created_at)),
        CASE WHEN p_delivery_type = 'table'
            THEN jsonb_build_object('type', 'table', 'tableId', p_table_id)
            ELSE jsonb_build_object('type', p_delivery_type, 'address', COALESCE(p_customer_address, ''))
        END,
        jsonb_build_object('method', p_payment_method),
        jsonb_build_object('subtotal', v_catalog_subtotal, 'deliveryFee', v_catalog_delivery_fee, 'couponDiscount', v_coupon_discount, 'total', v_catalog_total),
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

    INSERT INTO ff_order_notification_outbox (
        business_id, order_id, event_type, idempotency_key, payload,
        status, attempt_count, available_at, created_at, updated_at
    ) VALUES (
        p_business_id,
        v_order_id,
        'order.created',
        'fastfood-order:' || v_order_id::text || ':created',
        jsonb_build_object(
            'businessId', p_business_id,
            'orderId', v_order_id,
            'status', 'pending'
        ),
        'pending', 0, p_created_at, p_created_at, p_created_at
    )
    ON CONFLICT (order_id, event_type) DO NOTHING;

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
