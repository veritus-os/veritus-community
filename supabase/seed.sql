-- Seed data for CAV-OS
-- Realistic Brazilian mock data for 10 families

begin;

-- Guard rails para ambiente cloud (evita falhas quando parte das migrations ainda nao foi aplicada).
alter table if exists public.families
  add column if not exists proof_of_residency_submitted boolean not null default true;

alter table if exists public.students
  add column if not exists class_name text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status_enum') THEN
    CREATE TYPE public.attendance_status_enum AS ENUM ('presente', 'ausente');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'teacher_content_status_enum') THEN
    CREATE TYPE public.teacher_content_status_enum AS ENUM ('rascunho', 'publicado');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'extra_service_type_enum') THEN
    CREATE TYPE public.extra_service_type_enum AS ENUM ('almoço', 'lanche_manha', 'lanche_tarde');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'extra_service_frequency_enum') THEN
    CREATE TYPE public.extra_service_frequency_enum AS ENUM ('diário', 'semanal', 'mensal');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profile_role_enum') THEN
    CREATE TYPE public.profile_role_enum AS ENUM ('parent', 'teacher', 'admin');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pickup_status_enum') THEN
    CREATE TYPE public.pickup_status_enum AS ENUM ('idle', 'en_route', 'at_gate');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meal_contract_type_enum') THEN
    CREATE TYPE public.meal_contract_type_enum AS ENUM ('almoço', 'lanche_manha', 'lanche_tarde');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meal_contract_plan_enum') THEN
    CREATE TYPE public.meal_contract_plan_enum AS ENUM ('diário', 'semanal', 'mensal');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_payment_method_enum') THEN
    CREATE TYPE public.invoice_payment_method_enum AS ENUM ('boleto', 'pix', 'card');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status_enum') THEN
    CREATE TYPE public.invoice_status_enum AS ENUM ('pending', 'paid', 'overdue');
  END IF;
END $$;

create extension if not exists postgis with schema extensions;

create table if not exists public.teachers (
  id bigserial primary key,
  full_name text not null,
  email text unique,
  subject_area text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teacher_contents (
  id bigserial primary key,
  teacher_id bigint not null references public.teachers(id) on delete cascade,
  title text not null,
  description text,
  file_url text,
  status public.teacher_content_status_enum not null default 'rascunho',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.extra_services (
  id bigserial primary key,
  student_id bigint not null references public.students(id) on delete cascade,
  service_type public.extra_service_type_enum not null,
  frequency public.extra_service_frequency_enum not null,
  price numeric(10,2) not null check (price >= 0),
  active boolean not null default true,
  start_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id bigserial primary key,
  student_id bigint not null references public.students(id) on delete cascade,
  attendance_date date not null,
  status public.attendance_status_enum not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, attendance_date)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.profile_role_enum not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meal_contracts (
  id bigserial primary key,
  student_id bigint not null references public.students(id) on delete cascade,
  type public.meal_contract_type_enum not null,
  plan public.meal_contract_plan_enum not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, type, plan)
);

create table if not exists public.pickup_requests (
  id bigserial primary key,
  student_id bigint not null references public.students(id) on delete cascade,
  guardian_id uuid references public.profiles(id) on delete set null,
  status public.pickup_status_enum not null default 'idle',
  current_eta interval,
  last_gps_location geography(point, 4326),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id bigserial primary key,
  student_id bigint not null references public.students(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  due_date date not null,
  payment_method public.invoice_payment_method_enum not null,
  payment_status public.invoice_status_enum not null default 'pending',
  reference_month date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reset core tables to keep seed deterministic.
truncate table if exists public.pickup_requests restart identity cascade;
truncate table if exists public.invoices restart identity cascade;
truncate table if exists public.meal_contracts restart identity cascade;
truncate table if exists public.attendance restart identity cascade;
truncate table if exists public.teacher_contents restart identity cascade;
truncate table if exists public.extra_services restart identity cascade;
truncate table if exists public.teachers restart identity cascade;
truncate table if exists public.financial_summary restart identity cascade;
truncate table if exists public.guardians restart identity cascade;
truncate table if exists public.students restart identity cascade;
truncate table if exists public.assets restart identity cascade;
truncate table if exists public.families restart identity cascade;
truncate table if exists public.assets_inventory restart identity;

-- 10 families based in Brazil.
insert into public.families (id, family_code, primary_contact_name, proof_of_residency_submitted)
values
  (1, 'BRFAM001', 'Fernanda Souza', true),
  (2, 'BRFAM002', 'Gustavo Lima', true),
  (3, 'BRFAM003', 'Roberta Rossi', false),
  (4, 'BRFAM004', 'Patricia Almeida', true),
  (5, 'BRFAM005', 'Marcos Nogueira', true),
  (6, 'BRFAM006', 'Juliana Barros', true),
  (7, 'BRFAM007', 'Leonardo Ferreira', false),
  (8, 'BRFAM008', 'Camila Menezes', true),
  (9, 'BRFAM009', 'Thiago Carvalho', true),
  (10, 'BRFAM010', 'Vanessa Duarte', true);

-- Guardians linked to each family.
insert into public.guardians (family_id, full_name, phone, email, is_financial, authorized_to_pickup)
values
  (1, 'Fernanda Souza', '+55 11 99811-2201', 'fernanda.souza@email.com', true, true),
  (1, 'Carlos Souza', '+55 11 99811-2202', 'carlos.souza@email.com', false, true),
  (2, 'Gustavo Lima', '+55 21 99733-1101', 'gustavo.lima@email.com', true, true),
  (2, 'Luciana Lima', '+55 21 99733-1102', 'luciana.lima@email.com', false, true),
  (3, 'Roberta Rossi', '+55 31 99622-0401', 'roberta.rossi@email.com', true, true),
  (4, 'Patricia Almeida', '+55 41 99512-3301', 'patricia.almeida@email.com', true, true),
  (5, 'Marcos Nogueira', '+55 85 99441-7701', 'marcos.nogueira@email.com', true, true),
  (6, 'Juliana Barros', '+55 61 99309-8801', 'juliana.barros@email.com', true, true),
  (7, 'Leonardo Ferreira', '+55 71 99276-6601', 'leonardo.ferreira@email.com', true, true),
  (8, 'Camila Menezes', '+55 51 99187-5501', 'camila.menezes@email.com', true, true),
  (9, 'Thiago Carvalho', '+55 19 99045-1201', 'thiago.carvalho@email.com', true, true),
  (10, 'Vanessa Duarte', '+55 27 98999-3401', 'vanessa.duarte@email.com', true, true);

-- Students with siblings distributed across different grades.
-- Includes scholarship examples at 15%, 50%, and 100%.
insert into public.students (family_id, full_name, ra_code, scholarship_pct, real_start_date, class_name)
values
  (1, 'Beatriz Souza', 'RA260001', 0.00, '2023-02-01', '7A'),
  (1, 'Matheus Souza', 'RA260002', 15.00, '2024-02-01', '5B'),
  (2, 'Helena Lima', 'RA260003', 0.00, '2022-02-01', '8C'),
  (2, 'Lucas Lima', 'RA260004', 50.00, '2025-02-03', '6A'),
  (3, 'Enzo Rossi', 'RA260005', 0.00, '2021-02-01', '4A'),
  (3, 'Livia Rossi', 'RA260006', 0.00, '2024-02-01', '2B'),
  (4, 'Sofia Almeida', 'RA260007', 100.00, '2020-02-01', '9A'),
  (5, 'Gabriel Nogueira', 'RA260008', 0.00, '2022-02-01', '3C'),
  (5, 'Clara Nogueira', 'RA260009', 0.00, '2025-02-01', '1A'),
  (6, 'Pedro Barros', 'RA260010', 0.00, '2023-02-01', '6B'),
  (6, 'Manuela Barros', 'RA260011', 0.00, '2024-02-01', '4C'),
  (7, 'Rafael Ferreira', 'RA260012', 0.00, '2022-02-01', '8A'),
  (8, 'Alice Menezes', 'RA260013', 25.00, '2023-02-01', '5A'),
  (8, 'Miguel Menezes', 'RA260014', 0.00, '2024-02-01', '2A'),
  (9, 'Laura Carvalho', 'RA260015', 0.00, '2021-02-01', '9B'),
  (10, 'Isabela Duarte', 'RA260016', 0.00, '2022-02-01', '7B'),
  (10, 'Bruno Duarte', 'RA260017', 0.00, '2025-02-01', '3A'),
  (2, 'Valentina Lima', 'RA260018', 20.00, '2026-02-03', '1B'),
  (3, 'Theo Rossi', 'RA260019', 0.00, '2025-02-01', '5C'),
  (4, 'Davi Almeida', 'RA260020', 100.00, '2024-02-01', '6C'),
  (5, 'Nina Nogueira', 'RA260021', 10.00, '2026-02-01', '2C'),
  (6, 'Caio Barros', 'RA260022', 0.00, '2025-02-01', '1C'),
  (7, 'Marina Ferreira', 'RA260023', 0.00, '2024-02-01', '4B'),
  (8, 'Heitor Menezes', 'RA260024', 35.00, '2026-02-01', '3B'),
  (9, 'Joao Carvalho', 'RA260025', 0.00, '2025-02-01', '8B');

-- Planos de alimentacao dedicados ao novo modulo (5 alunos ativos).
insert into public.meal_contracts (student_id, type, plan, active)
values
  ((select id from public.students where ra_code = 'RA260001'), 'almoço', 'mensal', true),
  ((select id from public.students where ra_code = 'RA260003'), 'lanche_manha', 'semanal', true),
  ((select id from public.students where ra_code = 'RA260004'), 'almoço', 'diário', true),
  ((select id from public.students where ra_code = 'RA260007'), 'lanche_tarde', 'mensal', true),
  ((select id from public.students where ra_code = 'RA260010'), 'almoço', 'semanal', true);

-- Requested asset inventory records (5 total), including Laptop Dell -> Roberta Rossi.
insert into public.assets_inventory (asset_name, asset_type, serial_number, holder_name, due_back_date, status)
values
  ('Laptop Dell', 'laptop', 'INV-DL-9001', 'Roberta Rossi', '2026-05-20', 'on_loan'),
  ('iPhone SE', 'phone', 'INV-PH-3201', 'Fernanda Souza', '2026-04-28', 'on_loan'),
  ('Laptop Lenovo', 'laptop', 'INV-LN-7782', 'Pedro Barros', '2026-06-10', 'on_loan'),
  ('Samsung A54', 'phone', 'INV-SA-1150', 'Camila Menezes', '2026-05-05', 'on_loan'),
  ('Laptop Acer', 'laptop', 'INV-AC-6623', null, null, 'available');

-- Mirror inventory to canonical schema table used by migrations.
insert into public.assets (asset_tag, asset_type, brand, model, serial_number, holder_name, due_back_date)
values
  ('AST-0001', 'laptop', 'Dell', 'Latitude 5420', 'INV-DL-9001', 'Roberta Rossi', '2026-05-20'),
  ('AST-0002', 'phone', 'Apple', 'iPhone SE', 'INV-PH-3201', 'Fernanda Souza', '2026-04-28'),
  ('AST-0003', 'laptop', 'Lenovo', 'ThinkPad E14', 'INV-LN-7782', 'Pedro Barros', '2026-06-10'),
  ('AST-0004', 'phone', 'Samsung', 'Galaxy A54', 'INV-SA-1150', 'Camila Menezes', '2026-05-05'),
  ('AST-0005', 'laptop', 'Acer', 'Aspire 5', 'INV-AC-6623', null, null);

-- Financial records intentionally distributed to show overdue/pending/paid in dashboard logic.
-- Suggested status logic for dashboards:
--   overdue => reference_month < date_trunc('month', current_date)::date and net_value > 0
--   pending => reference_month >= date_trunc('month', current_date)::date and net_value > 0
--   paid    => net_value = 0 (ex: full scholarship)
insert into public.financial_summary (family_id, reference_month, gross_value, scholarship_pct)
values
  (1, '2026-03-01', 4200.00, 0.00),
  (1, '2026-04-01', 4200.00, 0.00),
  (2, '2026-03-01', 3900.00, 50.00),
  (2, '2026-04-01', 3900.00, 50.00),
  (3, '2026-03-01', 4700.00, 0.00),
  (4, '2026-04-01', 3500.00, 100.00),
  (5, '2026-03-01', 4100.00, 0.00),
  (6, '2026-04-01', 3800.00, 0.00),
  (7, '2026-05-01', 3650.00, 0.00),
  (8, '2026-04-01', 4000.00, 25.00),
  (9, '2026-03-01', 4300.00, 0.00),
  (10, '2026-04-01', 3950.00, 15.00);

-- Financeiro Pro por aluno com meios de pagamento mistos.
insert into public.invoices (student_id, amount, due_date, payment_method, payment_status, reference_month, notes)
values
  ((select id from public.students where ra_code = 'RA260001'), 1200.00, '2026-04-10', 'pix', 'paid', '2026-04-01', 'Mensalidade abril'),
  ((select id from public.students where ra_code = 'RA260002'), 980.00, '2026-04-10', 'boleto', 'overdue', '2026-04-01', 'Mensalidade abril'),
  ((select id from public.students where ra_code = 'RA260003'), 1350.00, '2026-05-10', 'card', 'pending', '2026-05-01', 'Mensalidade maio'),
  ((select id from public.students where ra_code = 'RA260004'), 1090.00, '2026-04-10', 'pix', 'paid', '2026-04-01', 'Mensalidade abril'),
  ((select id from public.students where ra_code = 'RA260007'), 0.00, '2026-04-10', 'card', 'paid', '2026-04-01', 'Bolsa integral'),
  ((select id from public.students where ra_code = 'RA260010'), 1150.00, '2026-05-10', 'boleto', 'pending', '2026-05-01', 'Mensalidade maio'),
  ((select id from public.students where ra_code = 'RA260013'), 890.00, '2026-04-10', 'card', 'overdue', '2026-04-01', 'Mensalidade abril'),
  ((select id from public.students where ra_code = 'RA260015'), 1320.00, '2026-05-10', 'pix', 'pending', '2026-05-01', 'Mensalidade maio');

-- Professores e planejamentos pedagógicos (3 professores).
insert into public.teachers (id, full_name, email, subject_area, active)
values
  (1, 'Mariana Costa', 'mariana.costa@altavista.edu.br', 'Ciencias', true),
  (2, 'Rafael Almeida', 'rafael.almeida@altavista.edu.br', 'Lingua Portuguesa', true),
  (3, 'Patricia Gomes', 'patricia.gomes@altavista.edu.br', 'Matematica', true);

insert into public.teacher_contents (teacher_id, title, description, file_url, status)
values
  (1, 'Planejamento - Ciencias Abril', 'Sequencia didatica sobre sustentabilidade e energia limpa.', 'https://files.altavista.edu.br/planejamentos/ciencias-abril.pdf', 'publicado'),
  (1, 'Roteiro de laboratorio', 'Experimentos guiados com observacao de resultados.', 'https://files.altavista.edu.br/planejamentos/lab-ciencias.pdf', 'rascunho'),
  (2, 'Planejamento - Portugues Bimestre 2', 'Leitura orientada, producao textual e rodas de debate.', 'https://files.altavista.edu.br/planejamentos/portugues-b2.pdf', 'publicado'),
  (3, 'Plano de Recuperacao - Matematica', 'Exercicios progressivos de fracoes e proporcoes.', 'https://files.altavista.edu.br/planejamentos/matematica-recuperacao.pdf', 'publicado');

-- Servicos extras ativos para 5 alunos.
insert into public.extra_services (student_id, service_type, frequency, price, active, start_date)
values
  ((select id from public.students where ra_code = 'RA260001'), 'almoço', 'mensal', 420.00, true, date_trunc('month', current_date)::date),
  ((select id from public.students where ra_code = 'RA260003'), 'lanche_manha', 'semanal', 65.00, true, (date_trunc('week', current_date)::date + interval '1 day')::date),
  ((select id from public.students where ra_code = 'RA260004'), 'almoço', 'diário', 28.00, true, current_date),
  ((select id from public.students where ra_code = 'RA260007'), 'lanche_tarde', 'mensal', 180.00, true, date_trunc('month', current_date)::date),
  ((select id from public.students where ra_code = 'RA260010'), 'almoço', 'semanal', 90.00, true, (date_trunc('week', current_date)::date + interval '3 day')::date),
  ((select id from public.students where ra_code = 'RA260010'), 'lanche_tarde', 'diário', 12.00, true, current_date);

-- Presenca da semana atual para 5 alunos.
with week_days as (
  select (date_trunc('week', current_date)::date + gs.n) as attendance_date
  from generate_series(0, 4) as gs(n)
),
target_students as (
  select id, ra_code
  from public.students
  where ra_code in ('RA260001', 'RA260003', 'RA260004', 'RA260007', 'RA260010')
)
insert into public.attendance (student_id, attendance_date, status, notes)
select
  ts.id,
  wd.attendance_date,
  case
    when ts.ra_code = 'RA260003' and extract(isodow from wd.attendance_date) = 3 then 'ausente'::public.attendance_status_enum
    when ts.ra_code = 'RA260007' and extract(isodow from wd.attendance_date) = 5 then 'ausente'::public.attendance_status_enum
    else 'presente'::public.attendance_status_enum
  end as status,
  case
    when ts.ra_code = 'RA260003' and extract(isodow from wd.attendance_date) = 3 then 'Consulta medica.'
    when ts.ra_code = 'RA260007' and extract(isodow from wd.attendance_date) = 5 then 'Atestado enviado pela familia.'
    else null
  end as notes
from target_students ts
cross join week_days wd;

-- Fila de portaria com ETA para painel ao vivo.
insert into public.pickup_requests (student_id, guardian_id, status, current_eta, last_gps_location)
values
  ((select id from public.students where ra_code = 'RA260001'), null, 'en_route', interval '18 minutes', st_setsrid(st_makepoint(-46.7002, -23.5850), 4326)::geography),
  ((select id from public.students where ra_code = 'RA260004'), null, 'en_route', interval '7 minutes', st_setsrid(st_makepoint(-46.6820, -23.5711), 4326)::geography),
  ((select id from public.students where ra_code = 'RA260010'), null, 'at_gate', interval '1 minutes', st_setsrid(st_makepoint(-46.6742, -23.5630), 4326)::geography),
  ((select id from public.students where ra_code = 'RA260013'), null, 'en_route', interval '11 minutes', st_setsrid(st_makepoint(-46.6904, -23.5788), 4326)::geography),
  ((select id from public.students where ra_code = 'RA260020'), null, 'en_route', interval '24 minutes', st_setsrid(st_makepoint(-46.7101, -23.5904), 4326)::geography);

-- View de cozinha para o dia atual (garante disponibilidade para o painel de serviços).
create or replace view public.view_daily_kitchen_report as
with active_today as (
  select
    es.student_id,
    es.service_type,
    es.frequency,
    es.price
  from public.extra_services es
  where es.active = true
    and (
      es.frequency = 'diário'
      or (es.frequency = 'semanal' and extract(dow from current_date) = extract(dow from es.start_date))
      or (es.frequency = 'mensal' and extract(day from current_date) = extract(day from es.start_date))
    )
)
select
  s.id as student_id,
  s.full_name as student_name,
  coalesce(s.class_name, 'Nao informada') as class_name,
  sum((at.service_type = 'almoço')::int) as total_almoco,
  sum((at.service_type in ('lanche_manha', 'lanche_tarde'))::int) as total_lanches,
  count(at.service_type) as total_servicos_hoje,
  coalesce(sum(at.price), 0)::numeric(10,2) as valor_total_hoje
from public.students s
join active_today at on at.student_id = s.id
group by s.id, s.full_name, s.class_name
order by class_name, student_name;

grant select on public.view_daily_kitchen_report to anon, authenticated;

create or replace view public.portaria_live_eta as
select
  pr.id,
  pr.student_id,
  s.full_name as student_name,
  coalesce(s.class_name, 'Nao informada') as class_name,
  pr.guardian_id,
  pr.status,
  pr.current_eta,
  extract(epoch from coalesce(pr.current_eta, interval '0 second'))::int as eta_seconds,
  st_astext(pr.last_gps_location::geometry) as last_gps_wkt,
  pr.updated_at
from public.pickup_requests pr
join public.students s on s.id = pr.student_id
where pr.status in ('en_route', 'at_gate')
order by pr.current_eta asc nulls last, pr.updated_at desc;

create or replace view public.inadimplencia_dashboard as
select
  count(*) filter (where i.payment_status = 'overdue')::int as total_em_atraso,
  count(*) filter (where i.payment_status = 'pending')::int as total_pendente,
  count(*) filter (where i.payment_status = 'paid')::int as total_pago,
  coalesce(sum(i.amount) filter (where i.payment_status = 'overdue'), 0)::numeric(12,2) as valor_em_atraso,
  coalesce(sum(i.amount) filter (where i.payment_status = 'pending'), 0)::numeric(12,2) as valor_pendente,
  coalesce(sum(i.amount) filter (where i.payment_status = 'paid'), 0)::numeric(12,2) as valor_pago
from public.invoices i;

create or replace function public.update_parent_location(
  p_pickup_request_id bigint,
  p_lat double precision,
  p_lng double precision,
  p_eta_seconds integer default null
)
returns table (
  pickup_request_id bigint,
  distance_meters numeric,
  notified boolean,
  status public.pickup_status_enum,
  current_eta interval
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_school_location geography := st_setsrid(st_makepoint(-46.6745, -23.5632), 4326)::geography;
  v_parent_location geography := st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography;
  v_distance double precision;
  v_notify boolean := false;
  v_status public.pickup_status_enum;
  v_eta interval;
begin
  if p_lat is null or p_lng is null then
    raise exception 'Latitude e longitude sao obrigatorias.';
  end if;

  select st_distance(v_parent_location, v_school_location)
  into v_distance;

  update public.pickup_requests pr
  set
    last_gps_location = v_parent_location,
    current_eta = coalesce(
      make_interval(secs => greatest(coalesce(p_eta_seconds, 0), 0)),
      pr.current_eta
    ),
    status = case
      when v_distance < 500 then 'at_gate'::public.pickup_status_enum
      when pr.status = 'idle' then 'en_route'::public.pickup_status_enum
      else pr.status
    end,
    updated_at = now()
  where pr.id = p_pickup_request_id
    and (pr.guardian_id = auth.uid() or pr.guardian_id is null)
  returning pr.status, pr.current_eta
  into v_status, v_eta;

  if not found then
    raise exception 'Solicitacao de retirada nao encontrada ou sem permissao.';
  end if;

  if v_distance < 500 then
    v_notify := true;
    perform pg_notify(
      'pickup_eta_events',
      json_build_object(
        'pickup_request_id', p_pickup_request_id,
        'distance_meters', round(v_distance::numeric, 2),
        'status', v_status,
        'event', 'parent_near_gate'
      )::text
    );
  end if;

  return query
  select
    p_pickup_request_id,
    round(v_distance::numeric, 2),
    v_notify,
    v_status,
    v_eta;
end;
$$;

grant execute on function public.update_parent_location(bigint, double precision, double precision, integer) to authenticated;
grant select on public.portaria_live_eta to anon, authenticated;
grant select on public.inadimplencia_dashboard to anon, authenticated;

-- Políticas de leitura MVP para evitar bloqueio por RLS no front.
drop policy if exists mvp_read_teachers on public.teachers;
create policy mvp_read_teachers on public.teachers for select to anon, authenticated using (true);

drop policy if exists mvp_read_teacher_contents on public.teacher_contents;
create policy mvp_read_teacher_contents on public.teacher_contents for select to anon, authenticated using (true);

drop policy if exists mvp_read_extra_services on public.extra_services;
create policy mvp_read_extra_services on public.extra_services for select to anon, authenticated using (true);

drop policy if exists mvp_read_attendance on public.attendance;
create policy mvp_read_attendance on public.attendance for select to anon, authenticated using (true);

alter table if exists public.profiles enable row level security;
alter table if exists public.meal_contracts enable row level security;
alter table if exists public.pickup_requests enable row level security;
alter table if exists public.invoices enable row level security;

drop policy if exists mvp_read_profiles on public.profiles;
create policy mvp_read_profiles on public.profiles for select to anon, authenticated using (true);

drop policy if exists mvp_read_meal_contracts on public.meal_contracts;
create policy mvp_read_meal_contracts on public.meal_contracts for select to anon, authenticated using (true);

drop policy if exists mvp_manage_meal_contracts on public.meal_contracts;
create policy mvp_manage_meal_contracts on public.meal_contracts for all to authenticated using (true) with check (true);

drop policy if exists mvp_read_pickup_requests on public.pickup_requests;
create policy mvp_read_pickup_requests on public.pickup_requests for select to anon, authenticated using (true);

drop policy if exists mvp_write_pickup_requests on public.pickup_requests;
create policy mvp_write_pickup_requests on public.pickup_requests for update to authenticated using (guardian_id = auth.uid() or guardian_id is null);

drop policy if exists mvp_read_invoices on public.invoices;
create policy mvp_read_invoices on public.invoices for select to anon, authenticated using (true);

drop policy if exists mvp_manage_invoices on public.invoices;
create policy mvp_manage_invoices on public.invoices for all to authenticated using (true) with check (true);

-- Optional helper view for Family Debt dashboards.
create or replace view public.family_debt_dashboard as
select
  f.id as family_id,
  f.family_code,
  f.primary_contact_name,
  fs.reference_month,
  fs.gross_value,
  fs.scholarship_pct,
  fs.net_value,
  case
    when fs.net_value = 0 then 'paid'
    when fs.reference_month < date_trunc('month', current_date)::date then 'overdue'
    else 'pending'
  end as debt_status
from public.financial_summary fs
join public.families f on f.id = fs.family_id;

create or replace view public.family_centric_dashboard as
with latest_financial as (
  select distinct on (fs.family_id)
    fs.family_id,
    fs.reference_month,
    fs.gross_value,
    fs.scholarship_pct,
    fs.net_value,
    case
      when fs.net_value = 0 then 'paid'
      when fs.reference_month < date_trunc('month', current_date)::date then 'overdue'
      else 'pending'
    end as debt_status
  from public.financial_summary fs
  order by fs.family_id, fs.reference_month desc
)
select
  f.id as family_id,
  f.family_code,
  f.primary_contact_name,
  f.proof_of_residency_submitted,
  coalesce(string_agg(s.full_name || ' (RA ' || s.ra_code || ')', ' • ' order by s.full_name), '') as siblings,
  coalesce(count(s.id), 0)::int as student_count,
  coalesce(avg(s.scholarship_pct), 0)::numeric(5,2) as avg_scholarship_pct,
  lf.reference_month,
  lf.gross_value,
  lf.scholarship_pct as financial_scholarship_pct,
  lf.net_value,
  lf.debt_status
from public.families f
left join public.students s on s.family_id = f.id
left join latest_financial lf on lf.family_id = f.id
group by
  f.id,
  f.family_code,
  f.primary_contact_name,
  f.proof_of_residency_submitted,
  lf.reference_month,
  lf.gross_value,
  lf.scholarship_pct,
  lf.net_value,
  lf.debt_status;

grant select on public.family_debt_dashboard to anon, authenticated;
grant select on public.family_centric_dashboard to anon, authenticated;

commit;
