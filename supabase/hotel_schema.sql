create extension if not exists "pgcrypto";

drop table if exists hotel_housekeeping cascade;
drop table if exists hotel_settings cascade;
drop table if exists hotel_reservations cascade;
drop table if exists hotel_room_service_orders cascade;
drop table if exists hotel_requests cascade;
drop table if exists hotel_rooms cascade;
drop table if exists hotel_room_types cascade;

create table hotel_room_types (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    name text not null,
    name_en text,
    description text,
    description_en text,
    capacity integer default 2,
    bed_count integer default 1,
    bed_type text,
    price_per_night numeric not null,
    discount_price numeric,
    discount_until timestamptz,
    amenities jsonb default '[]'::jsonb,
    images jsonb default '[]'::jsonb,
    max_guests integer default 2,
    max_adults integer default 2,
    max_children integer default 0,
    size_sqm numeric,
    view_type text,
    floor_preference text,
    is_smoking_allowed boolean default false,
    is_pet_friendly boolean default false,
    sort_order integer default 0,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists hotel_room_types_business_id_idx on hotel_room_types (business_id);
create index if not exists hotel_room_types_is_active_idx on hotel_room_types (is_active);

create table if not exists hotel_rooms (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    room_number text not null,
    room_type_id text references hotel_room_types(id) on delete set null,
    floor integer default 1,
    status text default 'available',
    current_guest_name text,
    check_in_date timestamptz,
    check_out_date timestamptz,
    expected_check_out timestamptz,
    last_cleaned_at timestamptz,
    is_cleaned boolean default true,
    housekeeping_note text,
    notes text,
    qr_code text,
    images jsonb default '[]'::jsonb,
    amenities jsonb default '[]'::jsonb,
    is_active boolean default true,
    sort_order integer default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists hotel_rooms_business_id_idx on hotel_rooms (business_id);
create index if not exists hotel_rooms_room_type_id_idx on hotel_rooms (room_type_id);
create index if not exists hotel_rooms_status_idx on hotel_rooms (status);
create index if not exists hotel_rooms_room_number_idx on hotel_rooms (room_number);
create unique index if not exists hotel_rooms_business_room_number_idx on hotel_rooms (business_id, room_number) where is_active = true;

create table if not exists hotel_requests (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    room_id text references hotel_rooms(id) on delete cascade,
    room_number text,
    request_type text not null,
    request_details text,
    priority text default 'normal',
    status text default 'pending',
    assigned_to text,
    completed_at timestamptz,
    completed_by text,
    notes text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists hotel_requests_business_id_idx on hotel_requests (business_id);
create index if not exists hotel_requests_room_id_idx on hotel_requests (room_id);
create index if not exists hotel_requests_status_idx on hotel_requests (status);
create index if not exists hotel_requests_created_at_idx on hotel_requests (created_at);

create table if not exists hotel_room_service_orders (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    room_id text references hotel_rooms(id) on delete cascade,
    room_number text,
    guest_name text,
    items jsonb not null default '[]'::jsonb,
    subtotal numeric default 0,
    service_charge numeric default 0,
    tax numeric default 0,
    total numeric default 0,
    status text default 'pending',
    priority text default 'normal',
    special_instructions text,
    assigned_to text,
    completed_at timestamptz,
    completed_by text,
    notes text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists hotel_room_service_orders_business_id_idx on hotel_room_service_orders (business_id);
create index if not exists hotel_room_service_orders_room_id_idx on hotel_room_service_orders (room_id);
create index if not exists hotel_room_service_orders_status_idx on hotel_room_service_orders (status);
create index if not exists hotel_room_service_orders_created_at_idx on hotel_room_service_orders (created_at);

create table if not exists hotel_reservations (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    guest_name text not null,
    guest_phone text,
    guest_email text,
    guest_address text,
    room_type_id text references hotel_room_types(id) on delete set null,
    room_id text references hotel_rooms(id) on delete set null,
    check_in_date timestamptz not null,
    check_out_date timestamptz not null,
    adult_count integer default 1,
    child_count integer default 0,
    nights integer,
    total_amount numeric default 0,
    deposit_paid numeric default 0,
    remaining_amount numeric default 0,
    payment_status text default 'pending',
    payment_method text,
    special_requests text,
    status text default 'confirmed',
    cancellation_reason text,
    cancelled_at timestamptz,
    checked_in_at timestamptz,
    checked_out_at timestamptz,
    notes text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists hotel_reservations_business_id_idx on hotel_reservations (business_id);
create index if not exists hotel_reservations_room_id_idx on hotel_reservations (room_id);
create index if not exists hotel_reservations_room_type_id_idx on hotel_reservations (room_type_id);
create index if not exists hotel_reservations_status_idx on hotel_reservations (status);
create index if not exists hotel_reservations_check_in_date_idx on hotel_reservations (check_in_date);
create index if not exists hotel_reservations_check_out_date_idx on hotel_reservations (check_out_date);

create table if not exists hotel_settings (
    business_id text primary key,
    check_in_time text default '14:00',
    check_out_time text default '11:00',
    cancellation_policy text,
    housekeeping_schedule jsonb,
    cleaning_frequency_hours integer default 24,
    auto_assign_room boolean default false,
    require_deposit boolean default false,
    deposit_percentage numeric default 20,
    max_nights_per_booking integer default 30,
    min_nights_per_booking integer default 1,
    allow_same_day_checkin boolean default true,
    payment_methods text[] default array[]::text[],
    tax_rate numeric default 10,
    service_charge_rate numeric default 0,
    currency text default 'TRY',
    languages text[] default array['tr'],
    wifi_password text,
    breakfast_included boolean default false,
    breakfast_time jsonb,
    reception_hours jsonb,
    notifications jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists hotel_housekeeping (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    room_id text references hotel_rooms(id) on delete cascade,
    room_number text,
    task_type text not null,
    status text default 'pending',
    priority text default 'normal',
    assigned_to text,
    notes text,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists hotel_housekeeping_business_id_idx on hotel_housekeeping (business_id);
create index if not exists hotel_housekeeping_room_id_idx on hotel_housekeeping (room_id);
create index if not exists hotel_housekeeping_status_idx on hotel_housekeeping (status);
create index if not exists hotel_housekeeping_created_at_idx on hotel_housekeeping (created_at);

create or replace function update_hotel_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger hotel_room_types_updated_at
    before update on hotel_room_types
    for each row
    execute procedure update_hotel_updated_at();

create trigger hotel_rooms_updated_at
    before update on hotel_rooms
    for each row
    execute procedure update_hotel_updated_at();

create trigger hotel_requests_updated_at
    before update on hotel_requests
    for each row
    execute procedure update_hotel_updated_at();

create trigger hotel_room_service_orders_updated_at
    before update on hotel_room_service_orders
    for each row
    execute procedure update_hotel_updated_at();

create trigger hotel_reservations_updated_at
    before update on hotel_reservations
    for each row
    execute procedure update_hotel_updated_at();

create trigger hotel_housekeeping_updated_at
    before update on hotel_housekeeping
    for each row
    execute procedure update_hotel_updated_at();

create trigger hotel_settings_updated_at
    before update on hotel_settings
    for each row
    execute procedure update_hotel_updated_at();
