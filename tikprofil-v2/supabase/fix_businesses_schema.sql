
-- TıkProfil v2 - Schema Fix Script
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Add missing columns to 'businesses' table
alter table public.businesses add column if not exists about text;
alter table public.businesses add column if not exists slogan text;
alter table public.businesses add column if not exists cover text;
alter table public.businesses add column if not exists logo text;
alter table public.businesses add column if not exists industry_label text;
alter table public.businesses add column if not exists industry_id text;
alter table public.businesses add column if not exists owner text;
alter table public.businesses add column if not exists modules text[] default array[]::text[];
alter table public.businesses add column if not exists package text default 'starter';
alter table public.businesses add column if not exists status text default 'active';
alter table public.businesses add column if not exists previous_slugs text[] default array[]::text[];
alter table public.businesses add column if not exists plan_id text;
alter table public.businesses add column if not exists subscription_status text;
alter table public.businesses add column if not exists subscription_start_date timestamptz;
alter table public.businesses add column if not exists subscription_end_date timestamptz;
alter table public.businesses add column if not exists package_id text;
alter table public.businesses add column if not exists is_frozen boolean default false;
alter table public.businesses add column if not exists frozen_at timestamptz;
alter table public.businesses add column if not exists frozen_remaining_days integer;

-- 2. Ensure RLS is enabled (Best Practice)
alter table public.businesses enable row level security;

-- 3. Create policies if they don't exist (Optional, assumes basic public read)
-- drop policy if exists "Enable read access for all users" on public.businesses;
-- create policy "Enable read access for all users" on public.businesses for select using (true);
