-- 01_initial_schema.sql
-- Initial relational schema for CAV-OS

begin;

-- Families are the primary relational unit.
create table if not exists public.families (
  id bigserial primary key,
  family_code text unique,
  primary_contact_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.students (
  id bigserial primary key,
  family_id bigint not null references public.families(id) on delete cascade,
  full_name text not null,
  ra_code text not null unique,
  scholarship_pct numeric(5,2) not null default 0.00 check (scholarship_pct >= 0 and scholarship_pct <= 100),
  real_start_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_students_family_id on public.students(family_id);

create table if not exists public.guardians (
  id bigserial primary key,
  family_id bigint not null references public.families(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  is_financial boolean not null default false,
  authorized_to_pickup boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_guardians_family_id on public.guardians(family_id);

create table if not exists public.assets (
  id bigserial primary key,
  asset_tag text unique,
  asset_type text not null check (asset_type in ('laptop', 'phone')),
  brand text,
  model text,
  serial_number text unique,
  holder_name text,
  due_back_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.financial_summary (
  id bigserial primary key,
  family_id bigint not null references public.families(id) on delete cascade,
  reference_month date not null,
  gross_value numeric(12,2) not null check (gross_value >= 0),
  scholarship_pct numeric(5,2) not null default 0.00 check (scholarship_pct >= 0 and scholarship_pct <= 100),
  net_value numeric(12,2) not null default 0.00,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, reference_month)
);

create index if not exists idx_financial_summary_family_id on public.financial_summary(family_id);

create or replace function public.set_financial_net_value()
returns trigger
language plpgsql
as $$
begin
  new.net_value := round(new.gross_value * (1 - (new.scholarship_pct / 100.0)), 2);
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_financial_summary_set_net_value
before insert or update of gross_value, scholarship_pct
on public.financial_summary
for each row
execute function public.set_financial_net_value();

-- Enable Row Level Security on all tables.
alter table public.families enable row level security;
alter table public.students enable row level security;
alter table public.guardians enable row level security;
alter table public.assets enable row level security;
alter table public.financial_summary enable row level security;

commit;
