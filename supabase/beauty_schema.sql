create extension if not exists "pgcrypto";

create table if not exists beauty_categories (
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

create index if not exists beauty_categories_business_id_idx on beauty_categories(business_id);
create index if not exists beauty_categories_active_idx on beauty_categories(is_active);

create table if not exists beauty_services (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    category_id text not null,
    name text not null,
    name_en text,
    description text,
    description_en text,
    price numeric not null,
    duration_minutes integer,
    image_url text,
    is_active boolean default true,
    is_featured boolean default false,
    tags text[] default array[]::text[],
    sort_order integer default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists beauty_services_business_id_idx on beauty_services(business_id);
create index if not exists beauty_services_category_id_idx on beauty_services(category_id);
create index if not exists beauty_services_active_idx on beauty_services(is_active);
create index if not exists beauty_services_featured_idx on beauty_services(is_featured);

create table if not exists beauty_staff (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    name text not null,
    title text,
    image_url text,
    phone text,
    email text,
    specializations text[] default array[]::text[],
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists beauty_staff_business_id_idx on beauty_staff(business_id);
create index if not exists beauty_staff_active_idx on beauty_staff(is_active);

create table if not exists beauty_customers (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    name text not null,
    email text,
    phone text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists beauty_customers_business_id_idx on beauty_customers(business_id);
create index if not exists beauty_customers_email_idx on beauty_customers(email);
create index if not exists beauty_customers_phone_idx on beauty_customers(phone);

create table if not exists beauty_appointments (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    customer_id text,
    staff_id text,
    service_id text,
    date timestamptz not null,
    time_slot text not null,
    status text default 'pending',
    notes text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists beauty_appointments_business_id_idx on beauty_appointments(business_id);
create index if not exists beauty_appointments_customer_id_idx on beauty_appointments(customer_id);
create index if not exists beauty_appointments_staff_id_idx on beauty_appointments(staff_id);
create index if not exists beauty_appointments_service_id_idx on beauty_appointments(service_id);
create index if not exists beauty_appointments_date_idx on beauty_appointments(date);
create index if not exists beauty_appointments_status_idx on beauty_appointments(status);

create table if not exists beauty_settings (
    business_id text primary key,
    currency text default 'TRY',
    currency_symbol text default '₺',
    working_hours jsonb,
    whatsapp_number text,
    notifications jsonb,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
