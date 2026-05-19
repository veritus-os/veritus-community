-- 20260511_admin_platform.sql
-- Platform admin: schools registry, feature flags, and bug reports.

begin;

-- ── Schools ──────────────────────────────────────────────────────────

create table if not exists public.schools (
  id bigserial primary key,
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  contact_email text,
  contact_phone text,
  address text,
  city text,
  state text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_schools_slug on public.schools(slug);
create index if not exists idx_schools_active on public.schools(active);

-- ── Feature flags (per school) ───────────────────────────────────────

create table if not exists public.feature_flags (
  id bigserial primary key,
  school_id bigint not null references public.schools(id) on delete cascade,
  module_key text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (school_id, module_key)
);

create index if not exists idx_feature_flags_school on public.feature_flags(school_id);

-- ── Bug reports ──────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bug_report_status_enum') THEN
    CREATE TYPE public.bug_report_status_enum AS ENUM ('open', 'in_progress', 'resolved', 'closed');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bug_report_priority_enum') THEN
    CREATE TYPE public.bug_report_priority_enum AS ENUM ('low', 'medium', 'high', 'critical');
  END IF;
END $$;

create table if not exists public.bug_reports (
  id bigserial primary key,
  school_id bigint references public.schools(id) on delete set null,
  title text not null,
  description text not null,
  page_url text,
  reporter_name text,
  reporter_email text,
  status public.bug_report_status_enum not null default 'open',
  priority public.bug_report_priority_enum not null default 'medium',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bug_reports_school on public.bug_reports(school_id);
create index if not exists idx_bug_reports_status on public.bug_reports(status);

-- ── RLS ──────────────────────────────────────────────────────────────

alter table public.schools enable row level security;
alter table public.feature_flags enable row level security;
alter table public.bug_reports enable row level security;

-- MVP: open read for authenticated, full access for authenticated (admin enforced at app level)
drop policy if exists mvp_read_schools on public.schools;
create policy mvp_read_schools on public.schools for select to anon, authenticated using (true);

drop policy if exists mvp_manage_schools on public.schools;
create policy mvp_manage_schools on public.schools for all to authenticated using (true) with check (true);

drop policy if exists mvp_read_feature_flags on public.feature_flags;
create policy mvp_read_feature_flags on public.feature_flags for select to anon, authenticated using (true);

drop policy if exists mvp_manage_feature_flags on public.feature_flags;
create policy mvp_manage_feature_flags on public.feature_flags for all to authenticated using (true) with check (true);

drop policy if exists mvp_read_bug_reports on public.bug_reports;
create policy mvp_read_bug_reports on public.bug_reports for select to anon, authenticated using (true);

drop policy if exists mvp_manage_bug_reports on public.bug_reports;
create policy mvp_manage_bug_reports on public.bug_reports for all to authenticated using (true) with check (true);

-- Allow anon to insert bug reports (so clients can submit without auth)
drop policy if exists mvp_insert_bug_reports_anon on public.bug_reports;
create policy mvp_insert_bug_reports_anon on public.bug_reports for insert to anon with check (true);

commit;
