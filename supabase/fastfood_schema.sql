create extension if not exists "pgcrypto";

create table if not exists businesses (
    id text primary key default gen_random_uuid()::text,
    name text,
    email text,
    slug text unique,
    previous_slugs text[] default array[]::text[],
    phone text,
    whatsapp text,
    status text default 'active',
    package text default 'starter',
    modules text[] default array[]::text[],
    owner text,
    industry_id text,
    industry_label text,
    plan_id text,
    logo text,
    cover text,
    slogan text,
    about text,
    subscription_status text,
    subscription_start_date timestamptz,
    subscription_end_date timestamptz,
    package_id text,
    is_frozen boolean default false,
    frozen_at timestamptz,
    frozen_remaining_days integer,
    data jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists businesses_slug_lower_idx on businesses (lower(slug));
create index if not exists businesses_owner_idx on businesses (owner);
create index if not exists businesses_status_idx on businesses (status);

alter table businesses add column if not exists email text;
alter table businesses add column if not exists previous_slugs text[] default array[]::text[];
alter table businesses add column if not exists status text default 'active';
alter table businesses add column if not exists package text default 'starter';
alter table businesses add column if not exists modules text[] default array[]::text[];
alter table businesses add column if not exists owner text;
alter table businesses add column if not exists industry_id text;
alter table businesses add column if not exists industry_label text;
alter table businesses add column if not exists plan_id text;
alter table businesses add column if not exists logo text;
alter table businesses add column if not exists cover text;
alter table businesses add column if not exists slogan text;
alter table businesses add column if not exists about text;
alter table businesses add column if not exists subscription_status text;
alter table businesses add column if not exists subscription_start_date timestamptz;
alter table businesses add column if not exists subscription_end_date timestamptz;
alter table businesses add column if not exists package_id text;
alter table businesses add column if not exists is_frozen boolean default false;
alter table businesses add column if not exists frozen_at timestamptz;
alter table businesses add column if not exists frozen_remaining_days integer;

create table if not exists ff_categories (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    name text not null,
    icon text,
    sort_order integer default 0,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists ff_categories_business_id_idx on ff_categories (business_id);

create table if not exists ff_products (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    category_id text not null,
    name text not null,
    description text,
    price numeric not null,
    image_url text,
    is_active boolean default true,
    in_stock boolean default true,
    extra_group_ids text[] default array[]::text[],
    sort_order integer default 0,
    sizes jsonb,
    prep_time integer,
    tax_rate numeric,
    allergens text[] default array[]::text[],
    discount_price numeric,
    discount_until timestamptz,
    tags text[] default array[]::text[],
    calories integer,
    spicy_level integer,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists ff_products_business_id_idx on ff_products (business_id);
create index if not exists ff_products_category_id_idx on ff_products (category_id);

create table if not exists ff_extra_groups (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    name text not null,
    selection_type text default 'single',
    is_required boolean default false,
    max_selections integer default 1,
    sort_order integer default 0,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists ff_extra_groups_business_id_idx on ff_extra_groups (business_id);

create table if not exists ff_extras (
    id text primary key default gen_random_uuid()::text,
    group_id text not null,
    name text not null,
    price_modifier numeric default 0,
    is_default boolean default false,
    image_url text,
    sort_order integer default 0,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists ff_extras_group_id_idx on ff_extras (group_id);

create table if not exists ff_campaigns (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    title text not null,
    description text,
    emoji text,
    is_active boolean default true,
    valid_until timestamptz,
    sort_order integer default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists ff_campaigns_business_id_idx on ff_campaigns (business_id);

create table if not exists ff_coupons (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    code text not null,
    title text not null,
    description text,
    emoji text,
    discount_type text not null,
    discount_value numeric default 0,
    max_discount_amount numeric,
    bogo_type text,
    bogo_buy_quantity integer,
    bogo_get_quantity integer,
    bogo_discount_percent numeric,
    min_order_amount numeric default 0,
    max_usage_count integer default 0,
    usage_per_user integer default 0,
    current_usage_count integer default 0,
    valid_from timestamptz,
    valid_until timestamptz,
    is_active boolean default true,
    applicable_to text default 'all',
    applicable_category_ids text[] default array[]::text[],
    applicable_product_ids text[] default array[]::text[],
    is_public boolean default true,
    is_first_order_only boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists ff_coupons_business_id_idx on ff_coupons (business_id);
create index if not exists ff_coupons_code_idx on ff_coupons (code);

create table if not exists ff_coupon_usages (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    coupon_id text not null,
    code text,
    customer_phone text,
    order_id text,
    discount_amount numeric default 0,
    used_at timestamptz default now(),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists ff_coupon_usages_coupon_id_idx on ff_coupon_usages (coupon_id);
create index if not exists ff_coupon_usages_customer_phone_idx on ff_coupon_usages (customer_phone);

create table if not exists ff_settings (
    business_id text primary key,
    delivery_enabled boolean default true,
    pickup_enabled boolean default true,
    min_order_amount numeric default 0,
    delivery_fee numeric default 0,
    free_delivery_above numeric default 0,
    estimated_delivery_time text,
    cash_payment boolean default true,
    card_on_delivery boolean default true,
    online_payment boolean default false,
    working_hours jsonb,
    use_business_hours boolean default true,
    whatsapp_number text,
    notifications jsonb,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists ff_orders (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    order_number text,
    customer_name text,
    customer_phone text,
    customer_address text,
    delivery_type text,
    payment_method text,
    items jsonb,
    subtotal numeric default 0,
    delivery_fee numeric default 0,
    total numeric default 0,
    customer_note text,
    coupon_id text,
    coupon_code text,
    coupon_discount numeric default 0,
    status text default 'pending',
    status_history jsonb,
    internal_note text,
    business_name text,
    customer jsonb,
    delivery jsonb,
    payment jsonb,
    coupon jsonb,
    pricing jsonb,
    qr_code text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists ff_orders_business_id_idx on ff_orders (business_id);
create index if not exists ff_orders_status_idx on ff_orders (status);
create index if not exists ff_orders_created_at_idx on ff_orders (created_at);
create index if not exists ff_orders_table_id_idx on ff_orders (table_id);

alter table ff_orders add column if not exists table_id text;

create table if not exists fb_tables (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    name text not null,
    scan_count integer default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists fb_tables_business_id_idx on fb_tables (business_id);

create table if not exists fb_categories (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    name text not null,
    name_en text,
    icon text,
    image text,
    sort_order integer default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists fb_categories_business_id_idx on fb_categories (business_id);

create table if not exists fb_products (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    category_id text not null,
    name text not null,
    name_en text,
    description text,
    description_en text,
    price numeric default 0,
    image text,
    in_stock boolean default true,
    sort_order integer default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists fb_products_business_id_idx on fb_products (business_id);
create index if not exists fb_products_category_id_idx on fb_products (category_id);

create table if not exists fb_settings (
    business_id text primary key,
    cart_enabled boolean default true,
    whatsapp_order_enabled boolean default true,
    call_waiter_enabled boolean default true,
    style_id text default 'modern',
    accent_color_id text default 'emerald',
    show_avatar boolean default true,
    waiter_call_enabled boolean default true,
    wifi_password text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

do $$
declare
    legacy_table text := 'fire' || 'store_documents';
begin
    if to_regclass('public.' || legacy_table) is not null and to_regclass('public.app_documents') is null then
        execute format('alter table public.%I rename to app_documents', legacy_table);
    end if;
end $$;

create table if not exists app_documents (
    collection text not null,
    id text not null default gen_random_uuid()::text,
    data jsonb not null default '{}'::jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    primary key (collection, id)
);

create index if not exists app_documents_collection_idx on app_documents (collection);
