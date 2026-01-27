create extension if not exists "pgcrypto";

-- Independent tables first
create table if not exists clinic_categories (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    name text not null,
    name_en text,
    icon text,
    sort_order integer default 0,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists clinic_categories_business_id_idx on clinic_categories (business_id);
create index if not exists clinic_categories_active_idx on clinic_categories (is_active);

create table if not exists clinic_patients (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    name text not null,
    phone text,
    email text,
    date_of_birth timestamptz,
    address text,
    city text,
    notes text,
    medical_history jsonb,
    documents jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists clinic_patients_business_id_idx on clinic_patients (business_id);
create index if not exists clinic_patients_phone_idx on clinic_patients (phone);
create index if not exists clinic_patients_email_idx on clinic_patients (email);

create table if not exists clinic_staff (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    name text not null,
    title text,
    specialty text,
    phone text,
    email text,
    image_url text,
    bio text,
    working_hours jsonb,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists clinic_staff_business_id_idx on clinic_staff (business_id);
create index if not exists clinic_staff_active_idx on clinic_staff (is_active);

create table if not exists clinic_products (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    name text not null,
    description text,
    price numeric,
    stock_quantity integer,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists clinic_products_business_id_idx on clinic_products (business_id);
create index if not exists clinic_products_active_idx on clinic_products (is_active);

create table if not exists clinic_analytics (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    date date not null,
    total_appointments integer default 0,
    new_patients integer default 0,
    total_revenue numeric default 0,
    created_at timestamptz default now()
);

create index if not exists clinic_analytics_business_id_idx on clinic_analytics (business_id);
create index if not exists clinic_analytics_date_idx on clinic_analytics (date);

create table if not exists clinic_insurance (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    name text not null,
    code text,
    coverage_percentage numeric,
    is_active boolean default true,
    created_at timestamptz default now()
);

create index if not exists clinic_insurance_business_id_idx on clinic_insurance (business_id);
create index if not exists clinic_insurance_active_idx on clinic_insurance (is_active);

create table if not exists clinic_settings (
    business_id text primary key,
    currency text default 'TRY',
    currency_symbol text default '₺',
    working_hours jsonb,
    notifications jsonb,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Services depends on categories
create table if not exists clinic_services (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    category_id text references clinic_categories(id),
    name text not null,
    name_en text,
    description text,
    description_en text,
    price numeric not null,
    duration_minutes integer,
    image_url text,
    is_active boolean default true,
    sort_order integer default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists clinic_services_business_id_idx on clinic_services (business_id);
create index if not exists clinic_services_category_id_idx on clinic_services (category_id);
create index if not exists clinic_services_active_idx on clinic_services (is_active);

-- Appointments depends on patients, staff, and services
create table if not exists clinic_appointments (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    patient_id text references clinic_patients(id),
    staff_id text references clinic_staff(id),
    service_id text references clinic_services(id),
    date timestamptz not null,
    time_slot text not null,
    status text default 'pending',
    notes text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists clinic_appointments_business_id_idx on clinic_appointments (business_id);
create index if not exists clinic_appointments_patient_id_idx on clinic_appointments (patient_id);
create index if not exists clinic_appointments_staff_id_idx on clinic_appointments (staff_id);
create index if not exists clinic_appointments_service_id_idx on clinic_appointments (service_id);
create index if not exists clinic_appointments_date_idx on clinic_appointments (date);
create index if not exists clinic_appointments_status_idx on clinic_appointments (status);

-- Reviews depends on patients and appointments
create table if not exists clinic_reviews (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    patient_id text references clinic_patients(id),
    appointment_id text references clinic_appointments(id),
    rating integer,
    comment text,
    status text default 'pending',
    is_published boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists clinic_reviews_business_id_idx on clinic_reviews (business_id);
create index if not exists clinic_reviews_patient_id_idx on clinic_reviews (patient_id);
create index if not exists clinic_reviews_appointment_id_idx on clinic_reviews (appointment_id);
create index if not exists clinic_reviews_status_idx on clinic_reviews (status);

-- Notifications depends on patients
create table if not exists clinic_notifications (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    patient_id text references clinic_patients(id),
    type text not null,
    message text,
    is_read boolean default false,
    created_at timestamptz default now()
);

create index if not exists clinic_notifications_business_id_idx on clinic_notifications (business_id);
create index if not exists clinic_notifications_patient_id_idx on clinic_notifications (patient_id);

-- Billing depends on patients and appointments
create table if not exists clinic_billing (
    id text primary key default gen_random_uuid()::text,
    business_id text not null,
    patient_id text references clinic_patients(id),
    appointment_id text references clinic_appointments(id),
    invoice_number text,
    subtotal numeric,
    discount_amount numeric,
    total_amount numeric,
    payment_method text,
    payment_status text default 'pending',
    created_at timestamptz default now()
);

create index if not exists clinic_billing_business_id_idx on clinic_billing (business_id);
create index if not exists clinic_billing_patient_id_idx on clinic_billing (patient_id);
create index if not exists clinic_billing_appointment_id_idx on clinic_billing (appointment_id);
create index if not exists clinic_billing_payment_status_idx on clinic_billing (payment_status);
