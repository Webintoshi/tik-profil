create extension if not exists "pgcrypto";

create table if not exists hotel_room_types (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    name text not null,
    name_en text,
    description text,
    description_en text,
    capacity integer,
    bed_count integer,
    bed_type text,
    price_per_night numeric not null,
    discount_price numeric,
    discount_until timestamptz,
    amenities jsonb,
    images jsonb,
    max_guests integer,
    max_adults integer,
    max_children integer,
    size_sqm numeric,
    view_type text,
    floor_preference text,
    is_smoking_allowed boolean,
    is_pet_friendly boolean,
    sort_order integer default 0,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists hotel_room_types_business_id_idx on hotel_room_types(business_id);
create index if not exists hotel_room_types_active_idx on hotel_room_types(is_active);
create index if not exists hotel_room_types_capacity_idx on hotel_room_types(capacity);
create index if not exists hotel_room_types_price_idx on hotel_room_types(price_per_night);

create table if not exists hotel_rooms (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    room_type_id text not null,
    room_number text not null,
    floor integer,
    is_active boolean default true,
    is_available boolean default true,
    is_clean boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists hotel_rooms_business_id_idx on hotel_rooms(business_id);
create index if not exists hotel_rooms_room_type_id_idx on hotel_rooms(room_type_id);
create index if not exists hotel_rooms_active_idx on hotel_rooms(is_active);
create index if not exists hotel_rooms_available_idx on hotel_rooms(is_available);

create table if not exists hotel_reservations (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    room_type_id text not null,
    room_id text,
    customer_name text,
    customer_phone text,
    customer_email text,
    check_in_date timestamptz not null,
    check_out_date timestamptz not null,
    adults integer,
    children integer,
    guest_count integer,
    total_nights integer,
    price_per_night numeric,
    total_price numeric,
    payment_method text,
    payment_status text default 'pending',
    reservation_status text default 'pending',
    special_requests text,
    internal_note text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists hotel_reservations_business_id_idx on hotel_reservations(business_id);
create index if not exists hotel_reservations_room_type_id_idx on hotel_reservations(room_type_id);
create index if not exists hotel_reservations_room_id_idx on hotel_reservations(room_id);
create index if not exists hotel_reservations_check_in_date_idx on hotel_reservations(check_in_date);
create index if not exists hotel_reservations_status_idx on hotel_reservations(reservation_status);
create index if not exists hotel_reservations_created_at_idx on hotel_reservations(created_at);

create table if not exists hotel_settings (
    business_id text primary key,
    currency text default 'TRY',
    currency_symbol text default '₺',
    check_in_time text default '14:00',
    check_out_time text default '11:00',
    min_nights integer default 1,
    max_nights integer default 30,
    working_hours jsonb,
    whatsapp_number text,
    notifications jsonb,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
