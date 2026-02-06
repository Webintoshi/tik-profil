-- ============================================
-- TIKPROFIL COFFEE SHOP MODULE - RLS POLICIES (FIXED)
-- business_id: UUID -> TEXT
-- Fixed: auth.uid() type casting for TEXT comparison
-- ============================================

-- SERVICE ROLE POLICIES
CREATE POLICY "Service role can manage coffee_categories"
ON coffee_categories FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage coffee_sizes"
ON coffee_sizes FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage coffee_extra_groups"
ON coffee_extra_groups FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage coffee_extras"
ON coffee_extras FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage coffee_products"
ON coffee_products FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage coffee_product_extras"
ON coffee_product_extras FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage coffee_orders"
ON coffee_orders FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage coffee_order_items"
ON coffee_order_items FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage coffee_coupons"
ON coffee_coupons FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage coffee_loyalty_customers"
ON coffee_loyalty_customers FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage coffee_loyalty_transactions"
ON coffee_loyalty_transactions FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage coffee_settings"
ON coffee_settings FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage coffee_tables"
ON coffee_tables FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage coffee_call_waiter"
ON coffee_call_waiter FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage coffee_subscriptions"
ON coffee_subscriptions FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage coffee_subscription_usage"
ON coffee_subscription_usage FOR ALL USING (auth.role() = 'service_role');

-- BUSINESS OWNER POLICIES
-- Cast auth.uid()::text for comparison with business_id TEXT type

CREATE POLICY "Business owners can view their coffee_categories"
ON coffee_categories FOR SELECT
USING (business_id IN (SELECT id::text FROM businesses WHERE owner = auth.uid()));

CREATE POLICY "Business owners can insert their coffee_categories"
ON coffee_categories FOR INSERT
WITH CHECK (business_id IN (SELECT id::text FROM businesses WHERE owner = auth.uid()));

CREATE POLICY "Business owners can update their coffee_categories"
ON coffee_categories FOR UPDATE
USING (business_id IN (SELECT id::text FROM businesses WHERE owner = auth.uid()));

CREATE POLICY "Business owners can delete their coffee_categories"
ON coffee_categories FOR DELETE
USING (business_id IN (SELECT id::text FROM businesses WHERE owner = auth.uid()));

CREATE POLICY "Business owners can manage their coffee_sizes"
ON coffee_sizes FOR ALL
USING (business_id IN (SELECT id::text FROM businesses WHERE owner = auth.uid()));

CREATE POLICY "Business owners can manage their coffee_extra_groups"
ON coffee_extra_groups FOR ALL
USING (business_id IN (SELECT id::text FROM businesses WHERE owner = auth.uid()));

CREATE POLICY "Business owners can manage their coffee_extras"
ON coffee_extras FOR ALL
USING (business_id IN (SELECT id::text FROM businesses WHERE owner = auth.uid()));

CREATE POLICY "Business owners can manage their coffee_products"
ON coffee_products FOR ALL
USING (business_id IN (SELECT id::text FROM businesses WHERE owner = auth.uid()));

CREATE POLICY "Business owners can manage their coffee_product_extras"
ON coffee_product_extras FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM coffee_products
        WHERE coffee_products.id = coffee_product_extras.product_id
        AND coffee_products.business_id IN (SELECT id::text FROM businesses WHERE owner = auth.uid())
    )
);

CREATE POLICY "Business owners can manage their coffee_orders"
ON coffee_orders FOR ALL
USING (business_id IN (SELECT id::text FROM businesses WHERE owner = auth.uid()));

CREATE POLICY "Business owners can insert coffee_orders"
ON coffee_orders FOR INSERT
WITH CHECK (business_id IN (SELECT id::text FROM businesses WHERE owner = auth.uid()));

CREATE POLICY "Business owners can manage their coffee_order_items"
ON coffee_order_items FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM coffee_orders
        WHERE coffee_orders.id = coffee_order_items.order_id
        AND coffee_orders.business_id IN (SELECT id::text FROM businesses WHERE owner = auth.uid())
    )
);

CREATE POLICY "Business owners can manage their coffee_coupons"
ON coffee_coupons FOR ALL
USING (business_id IN (SELECT id::text FROM businesses WHERE owner = auth.uid()));

CREATE POLICY "Business owners can manage their coffee_loyalty_customers"
ON coffee_loyalty_customers FOR ALL
USING (business_id IN (SELECT id::text FROM businesses WHERE owner = auth.uid()));

CREATE POLICY "Business owners can manage their coffee_loyalty_transactions"
ON coffee_loyalty_transactions FOR ALL
USING (business_id IN (SELECT id::text FROM businesses WHERE owner = auth.uid()));

CREATE POLICY "Business owners can manage their coffee_settings"
ON coffee_settings FOR ALL
USING (business_id IN (SELECT id::text FROM businesses WHERE owner = auth.uid()));

CREATE POLICY "Business owners can manage their coffee_tables"
ON coffee_tables FOR ALL
USING (business_id IN (SELECT id::text FROM businesses WHERE owner = auth.uid()));

CREATE POLICY "Business owners can manage their coffee_call_waiter"
ON coffee_call_waiter FOR ALL
USING (business_id IN (SELECT id::text FROM businesses WHERE owner = auth.uid()));

CREATE POLICY "Business owners can manage their coffee_subscriptions"
ON coffee_subscriptions FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM coffee_loyalty_customers
        WHERE coffee_loyalty_customers.id = coffee_subscriptions.customer_id
        AND coffee_loyalty_customers.business_id IN (SELECT id::text FROM businesses WHERE owner = auth.uid())
    )
);

CREATE POLICY "Business owners can manage their coffee_subscription_usage"
ON coffee_subscription_usage FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM coffee_subscriptions
        WHERE coffee_subscriptions.id = coffee_subscription_usage.subscription_id
        AND EXISTS (
            SELECT 1 FROM coffee_loyalty_customers
            WHERE coffee_loyalty_customers.id = coffee_subscriptions.customer_id
            AND coffee_loyalty_customers.business_id IN (SELECT id::text FROM businesses WHERE owner = auth.uid())
        )
    )
);

-- PUBLIC POLICIES
CREATE POLICY "Public can view active coffee_categories"
ON coffee_categories FOR SELECT
USING (is_active = true);

CREATE POLICY "Public can view active coffee_sizes"
ON coffee_sizes FOR SELECT
USING (is_active = true);

CREATE POLICY "Public can view active coffee_extras"
ON coffee_extras FOR SELECT
USING (is_active = true);

CREATE POLICY "Public can view active coffee_extra_groups"
ON coffee_extra_groups FOR SELECT
USING (is_active = true);

CREATE POLICY "Public can view available coffee_products"
ON coffee_products FOR SELECT
USING (is_active = true AND is_available = true);

CREATE POLICY "Public can view coffee_settings"
ON coffee_settings FOR SELECT
USING (true);
