create extension if not exists "pgcrypto";

create table if not exists em_consultants (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    name text not null,
    slug text not null unique,
    email text,
    phone text,
    image_url text,
    bio text,
    instagram_url text,
    linkedin_url text,
    twitter_url text,
    whatsapp_number text,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists em_consultants_business_id_idx on em_consultants(business_id);
create index if not exists em_consultants_slug_idx on em_consultants(slug);
create index if not exists em_consultants_active_idx on em_consultants(is_active);

create table if not exists em_listings (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    consultant_id text,
    title text not null,
    title_en text,
    description text,
    description_en text,
    listing_type text not null,
    property_type text not null,
    property_sub_type text,
    price numeric not null,
    currency text default 'TRY',
    size_sqm numeric,
    rooms integer,
    bathrooms integer,
    floor integer,
    floor_count integer,
    year_built integer,
    heating_type text,
    condition text,
    usage_status text,
    usage_status_en text,
    title_deed boolean default false,
    has_title_deed boolean default false,
    location jsonb,
    features jsonb,
    images jsonb,
    tags text[] default array[]::text[],
    status text default 'active',
    is_premium boolean default false,
    view_count integer default 0,
    contact_count integer default 0,
    sort_order integer default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists em_listings_business_id_idx on em_listings(business_id);
create index if not exists em_listings_consultant_id_idx on em_listings(consultant_id);
create index if not exists em_listings_type_idx on em_listings(listing_type);
create index if not exists em_listings_property_type_idx on em_listings(property_type);
create index if not exists em_listings_status_idx on em_listings(status);
create index if not exists em_listings_premium_idx on em_listings(is_premium);
create index if not exists em_listings_created_at_idx on em_listings(created_at);
create index if not exists em_listings_price_idx on em_listings(price);

create table if not exists em_settings (
    business_id text primary key,
    currency text default 'TRY',
    currency_symbol text default '₺',
    whatsapp_number text,
    notifications jsonb,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
