create extension if not exists "pgcrypto";

create table if not exists ecommerce_categories (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    name text not null,
    name_en text,
    icon text,
    image_url text,
    sort_order integer default 0,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists ecommerce_categories_business_id_idx on ecommerce_categories(business_id);
create index if not exists ecommerce_categories_active_idx on ecommerce_categories(is_active);

create table if not exists ecommerce_products (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    category_id text not null,
    name text not null,
    name_en text,
    description text,
    description_en text,
    price numeric not null,
    image_url text,
    is_active boolean default true,
    in_stock boolean default true,
    is_featured boolean default false,
    is_premium boolean default false,
    tags text[] default array[]::text[],
    sort_order integer default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists ecommerce_products_business_id_idx on ecommerce_products(business_id);
create index if not exists ecommerce_products_category_id_idx on ecommerce_products(category_id);
create index if not exists ecommerce_products_active_idx on ecommerce_products(is_active);
create index if not exists ecommerce_products_featured_idx on ecommerce_products(is_featured);
create index if not exists ecommerce_products_premium_idx on ecommerce_products(is_premium);

create table if not exists ecommerce_orders (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    order_number text unique,
    customer_name text,
    customer_email text,
    customer_phone text,
    customer_address text,
    items jsonb,
    subtotal numeric default 0,
    shipping_fee numeric default 0,
    total numeric default 0,
    payment_method text,
    payment_status text default 'pending',
    order_status text default 'pending',
    customer_note text,
    coupon_id text,
    coupon_code text,
    coupon_discount numeric default 0,
    internal_note text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists ecommerce_orders_business_id_idx on ecommerce_orders(business_id);
create index if not exists ecommerce_orders_status_idx on ecommerce_orders(order_status);
create index if not exists ecommerce_orders_created_at_idx on ecommerce_orders(created_at);
create index if not exists ecommerce_orders_customer_phone_idx on ecommerce_orders(customer_phone);

create table if not exists ecommerce_customers (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    name text not null,
    email text,
    phone text,
    address text,
    city text,
    country text,
    postal_code text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists ecommerce_customers_business_id_idx on ecommerce_customers(business_id);
create index if not exists ecommerce_customers_email_idx on ecommerce_customers(email);
create index if not exists ecommerce_customers_phone_idx on ecommerce_customers(phone);

create table if not exists ecommerce_coupons (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    code text not null unique,
    title text not null,
    description text,
    discount_type text not null,
    discount_value numeric default 0,
    max_discount_amount numeric,
    min_order_amount numeric default 0,
    max_usage_count integer default 0,
    usage_per_user integer default 0,
    current_usage_count integer default 0,
    valid_from timestamptz,
    valid_until timestamptz,
    is_active boolean default true,
    is_public boolean default true,
    is_first_order_only boolean default false,
    applicable_category_ids text[] default array[]::text[],
    applicable_product_ids text[] default array[]::text[],
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists ecommerce_coupons_business_id_idx on ecommerce_coupons(business_id);
create index if not exists ecommerce_coupons_code_idx on ecommerce_coupons(code);
create index if not exists ecommerce_coupons_active_idx on ecommerce_coupons(is_active);

create table if not exists ecommerce_settings (
    business_id text primary key,
    store_name text default 'Mağazam',
    store_description text,
    currency text default 'TRY',
    currency_symbol text default '₺',
    min_order_amount numeric default 0,
    free_shipping_threshold numeric,
    tax_rate numeric default 0,
    shipping_options jsonb,
    payment_methods jsonb,
    order_notifications jsonb,
    stock_settings jsonb,
    checkout_settings jsonb,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
