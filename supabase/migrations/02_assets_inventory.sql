-- 02_assets_inventory.sql
-- Adds dedicated inventory table required by dashboards and seed data.

begin;

create table if not exists public.assets_inventory (
  id bigserial primary key,
  asset_name text not null,
  asset_type text not null check (asset_type in ('laptop', 'phone')),
  serial_number text unique,
  holder_name text,
  due_back_date date,
  status text not null default 'on_loan' check (status in ('on_loan', 'available', 'maintenance', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assets_inventory enable row level security;

commit;
