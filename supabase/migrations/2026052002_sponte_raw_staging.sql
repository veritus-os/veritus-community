begin;

create table if not exists public.sponte_raw_multi_empresa (
  id uuid primary key default extensions.gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  source_file text not null,
  source_sheet text not null,
  source_row_number integer not null check (source_row_number > 0),
  ce bigint,
  raw_payload jsonb not null,
  row_hash text,
  imported_at timestamptz not null default now(),
  unique (import_batch_id, source_file, source_sheet, source_row_number)
);

create table if not exists public.sponte_raw_alunos (
  id uuid primary key default extensions.gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  source_file text not null,
  source_sheet text not null,
  source_row_number integer not null check (source_row_number > 0),
  aluno_id bigint,
  responsavel_financeiro_id bigint,
  responsavel_didatico_id bigint,
  raw_payload jsonb not null,
  row_hash text,
  imported_at timestamptz not null default now(),
  unique (import_batch_id, source_file, source_sheet, source_row_number)
);

create table if not exists public.sponte_raw_responsaveis (
  id uuid primary key default extensions.gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  source_file text not null,
  source_sheet text not null,
  source_row_number integer not null check (source_row_number > 0),
  responsavel_id bigint,
  raw_payload jsonb not null,
  row_hash text,
  imported_at timestamptz not null default now(),
  unique (import_batch_id, source_file, source_sheet, source_row_number)
);

create table if not exists public.sponte_raw_alunos_responsaveis (
  id uuid primary key default extensions.gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  source_file text not null,
  source_sheet text not null,
  source_row_number integer not null check (source_row_number > 0),
  aluno_responsavel_id bigint,
  aluno_id bigint,
  responsavel_id bigint,
  tipo_responsavel_id bigint,
  raw_payload jsonb not null,
  row_hash text,
  imported_at timestamptz not null default now(),
  unique (import_batch_id, source_file, source_sheet, source_row_number)
);

create table if not exists public.sponte_raw_alunos_empresas (
  id uuid primary key default extensions.gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  source_file text not null,
  source_sheet text not null,
  source_row_number integer not null check (source_row_number > 0),
  aluno_empresa_id bigint,
  aluno_id bigint,
  ce bigint,
  raw_payload jsonb not null,
  row_hash text,
  imported_at timestamptz not null default now(),
  unique (import_batch_id, source_file, source_sheet, source_row_number)
);

create table if not exists public.sponte_raw_cursos (
  id uuid primary key default extensions.gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  source_file text not null,
  source_sheet text not null,
  source_row_number integer not null check (source_row_number > 0),
  curso_id bigint,
  serie_id bigint,
  raw_payload jsonb not null,
  row_hash text,
  imported_at timestamptz not null default now(),
  unique (import_batch_id, source_file, source_sheet, source_row_number)
);

create table if not exists public.sponte_raw_series (
  id uuid primary key default extensions.gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  source_file text not null,
  source_sheet text not null,
  source_row_number integer not null check (source_row_number > 0),
  serie_id bigint,
  raw_payload jsonb not null,
  row_hash text,
  imported_at timestamptz not null default now(),
  unique (import_batch_id, source_file, source_sheet, source_row_number)
);

create table if not exists public.sponte_raw_turnos (
  id uuid primary key default extensions.gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  source_file text not null,
  source_sheet text not null,
  source_row_number integer not null check (source_row_number > 0),
  turno_id bigint,
  raw_payload jsonb not null,
  row_hash text,
  imported_at timestamptz not null default now(),
  unique (import_batch_id, source_file, source_sheet, source_row_number)
);

create table if not exists public.sponte_raw_salas (
  id uuid primary key default extensions.gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  source_file text not null,
  source_sheet text not null,
  source_row_number integer not null check (source_row_number > 0),
  sala_id bigint,
  raw_payload jsonb not null,
  row_hash text,
  imported_at timestamptz not null default now(),
  unique (import_batch_id, source_file, source_sheet, source_row_number)
);

create table if not exists public.sponte_raw_turmas (
  id uuid primary key default extensions.gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  source_file text not null,
  source_sheet text not null,
  source_row_number integer not null check (source_row_number > 0),
  turma_id bigint,
  curso_id bigint,
  turno_id bigint,
  sala_id bigint,
  raw_payload jsonb not null,
  row_hash text,
  imported_at timestamptz not null default now(),
  unique (import_batch_id, source_file, source_sheet, source_row_number)
);

create table if not exists public.sponte_raw_turma_alunos (
  id uuid primary key default extensions.gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  source_file text not null,
  source_sheet text not null,
  source_row_number integer not null check (source_row_number > 0),
  turma_aluno_id bigint,
  turma_id bigint,
  aluno_id bigint,
  situacao_didatica_id bigint,
  raw_payload jsonb not null,
  row_hash text,
  imported_at timestamptz not null default now(),
  unique (import_batch_id, source_file, source_sheet, source_row_number)
);

create table if not exists public.sponte_raw_contratos (
  id uuid primary key default extensions.gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  source_file text not null,
  source_sheet text not null,
  source_row_number integer not null check (source_row_number > 0),
  contrato_id bigint,
  aluno_id bigint,
  responsavel_id bigint,
  tipo_contrato_id bigint,
  raw_payload jsonb not null,
  row_hash text,
  imported_at timestamptz not null default now(),
  unique (import_batch_id, source_file, source_sheet, source_row_number)
);

create table if not exists public.sponte_raw_contratos_turmas (
  id uuid primary key default extensions.gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  source_file text not null,
  source_sheet text not null,
  source_row_number integer not null check (source_row_number > 0),
  contrato_turma_id bigint,
  contrato_id bigint,
  turma_id bigint,
  raw_payload jsonb not null,
  row_hash text,
  imported_at timestamptz not null default now(),
  unique (import_batch_id, source_file, source_sheet, source_row_number)
);

create table if not exists public.sponte_raw_contas_receber (
  id uuid primary key default extensions.gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  source_file text not null,
  source_sheet text not null,
  source_row_number integer not null check (source_row_number > 0),
  conta_receber_id bigint,
  aluno_id bigint,
  tipo_recebimento_id bigint,
  raw_payload jsonb not null,
  row_hash text,
  imported_at timestamptz not null default now(),
  unique (import_batch_id, source_file, source_sheet, source_row_number)
);

create table if not exists public.sponte_raw_contas_receber_parcelas (
  id uuid primary key default extensions.gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  source_file text not null,
  source_sheet text not null,
  source_row_number integer not null check (source_row_number > 0),
  conta_receber_id bigint,
  numero_parcela integer,
  situacao integer,
  raw_payload jsonb not null,
  row_hash text,
  imported_at timestamptz not null default now(),
  unique (import_batch_id, source_file, source_sheet, source_row_number)
);

create table if not exists public.sponte_raw_rps (
  id uuid primary key default extensions.gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  source_file text not null,
  source_sheet text not null,
  source_row_number integer not null check (source_row_number > 0),
  rps_id bigint,
  raw_payload jsonb not null,
  row_hash text,
  imported_at timestamptz not null default now(),
  unique (import_batch_id, source_file, source_sheet, source_row_number)
);

create table if not exists public.sponte_raw_rps_parcelas (
  id uuid primary key default extensions.gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  source_file text not null,
  source_sheet text not null,
  source_row_number integer not null check (source_row_number > 0),
  rps_id bigint,
  conta_receber_id bigint,
  numero_parcela integer,
  raw_payload jsonb not null,
  row_hash text,
  imported_at timestamptz not null default now(),
  unique (import_batch_id, source_file, source_sheet, source_row_number)
);

create index if not exists idx_sponte_raw_multi_empresa_batch on public.sponte_raw_multi_empresa(import_batch_id);
create index if not exists idx_sponte_raw_multi_empresa_ce on public.sponte_raw_multi_empresa(ce);
create index if not exists idx_sponte_raw_multi_empresa_row_hash on public.sponte_raw_multi_empresa(row_hash);

create index if not exists idx_sponte_raw_alunos_batch on public.sponte_raw_alunos(import_batch_id);
create index if not exists idx_sponte_raw_alunos_aluno_id on public.sponte_raw_alunos(aluno_id);
create index if not exists idx_sponte_raw_alunos_resp_fin on public.sponte_raw_alunos(responsavel_financeiro_id);
create index if not exists idx_sponte_raw_alunos_resp_did on public.sponte_raw_alunos(responsavel_didatico_id);
create index if not exists idx_sponte_raw_alunos_row_hash on public.sponte_raw_alunos(row_hash);

create index if not exists idx_sponte_raw_responsaveis_batch on public.sponte_raw_responsaveis(import_batch_id);
create index if not exists idx_sponte_raw_responsaveis_responsavel_id on public.sponte_raw_responsaveis(responsavel_id);
create index if not exists idx_sponte_raw_responsaveis_row_hash on public.sponte_raw_responsaveis(row_hash);

create index if not exists idx_sponte_raw_alunos_responsaveis_batch on public.sponte_raw_alunos_responsaveis(import_batch_id);
create index if not exists idx_sponte_raw_alunos_responsaveis_link on public.sponte_raw_alunos_responsaveis(aluno_responsavel_id);
create index if not exists idx_sponte_raw_alunos_responsaveis_aluno on public.sponte_raw_alunos_responsaveis(aluno_id);
create index if not exists idx_sponte_raw_alunos_responsaveis_resp on public.sponte_raw_alunos_responsaveis(responsavel_id);
create index if not exists idx_sponte_raw_alunos_responsaveis_tipo on public.sponte_raw_alunos_responsaveis(tipo_responsavel_id);
create index if not exists idx_sponte_raw_alunos_responsaveis_row_hash on public.sponte_raw_alunos_responsaveis(row_hash);

create index if not exists idx_sponte_raw_alunos_empresas_batch on public.sponte_raw_alunos_empresas(import_batch_id);
create index if not exists idx_sponte_raw_alunos_empresas_aluno_empresa on public.sponte_raw_alunos_empresas(aluno_empresa_id);
create index if not exists idx_sponte_raw_alunos_empresas_aluno on public.sponte_raw_alunos_empresas(aluno_id);
create index if not exists idx_sponte_raw_alunos_empresas_ce on public.sponte_raw_alunos_empresas(ce);
create index if not exists idx_sponte_raw_alunos_empresas_row_hash on public.sponte_raw_alunos_empresas(row_hash);

create index if not exists idx_sponte_raw_cursos_batch on public.sponte_raw_cursos(import_batch_id);
create index if not exists idx_sponte_raw_cursos_curso on public.sponte_raw_cursos(curso_id);
create index if not exists idx_sponte_raw_cursos_serie on public.sponte_raw_cursos(serie_id);
create index if not exists idx_sponte_raw_cursos_row_hash on public.sponte_raw_cursos(row_hash);

create index if not exists idx_sponte_raw_series_batch on public.sponte_raw_series(import_batch_id);
create index if not exists idx_sponte_raw_series_serie on public.sponte_raw_series(serie_id);
create index if not exists idx_sponte_raw_series_row_hash on public.sponte_raw_series(row_hash);

create index if not exists idx_sponte_raw_turnos_batch on public.sponte_raw_turnos(import_batch_id);
create index if not exists idx_sponte_raw_turnos_turno on public.sponte_raw_turnos(turno_id);
create index if not exists idx_sponte_raw_turnos_row_hash on public.sponte_raw_turnos(row_hash);

create index if not exists idx_sponte_raw_salas_batch on public.sponte_raw_salas(import_batch_id);
create index if not exists idx_sponte_raw_salas_sala on public.sponte_raw_salas(sala_id);
create index if not exists idx_sponte_raw_salas_row_hash on public.sponte_raw_salas(row_hash);

create index if not exists idx_sponte_raw_turmas_batch on public.sponte_raw_turmas(import_batch_id);
create index if not exists idx_sponte_raw_turmas_turma on public.sponte_raw_turmas(turma_id);
create index if not exists idx_sponte_raw_turmas_curso on public.sponte_raw_turmas(curso_id);
create index if not exists idx_sponte_raw_turmas_turno on public.sponte_raw_turmas(turno_id);
create index if not exists idx_sponte_raw_turmas_sala on public.sponte_raw_turmas(sala_id);
create index if not exists idx_sponte_raw_turmas_row_hash on public.sponte_raw_turmas(row_hash);

create index if not exists idx_sponte_raw_turma_alunos_batch on public.sponte_raw_turma_alunos(import_batch_id);
create index if not exists idx_sponte_raw_turma_alunos_turma_aluno on public.sponte_raw_turma_alunos(turma_aluno_id);
create index if not exists idx_sponte_raw_turma_alunos_turma on public.sponte_raw_turma_alunos(turma_id);
create index if not exists idx_sponte_raw_turma_alunos_aluno on public.sponte_raw_turma_alunos(aluno_id);
create index if not exists idx_sponte_raw_turma_alunos_situacao on public.sponte_raw_turma_alunos(situacao_didatica_id);
create index if not exists idx_sponte_raw_turma_alunos_row_hash on public.sponte_raw_turma_alunos(row_hash);

create index if not exists idx_sponte_raw_contratos_batch on public.sponte_raw_contratos(import_batch_id);
create index if not exists idx_sponte_raw_contratos_contrato on public.sponte_raw_contratos(contrato_id);
create index if not exists idx_sponte_raw_contratos_aluno on public.sponte_raw_contratos(aluno_id);
create index if not exists idx_sponte_raw_contratos_resp on public.sponte_raw_contratos(responsavel_id);
create index if not exists idx_sponte_raw_contratos_tipo on public.sponte_raw_contratos(tipo_contrato_id);
create index if not exists idx_sponte_raw_contratos_row_hash on public.sponte_raw_contratos(row_hash);

create index if not exists idx_sponte_raw_contratos_turmas_batch on public.sponte_raw_contratos_turmas(import_batch_id);
create index if not exists idx_sponte_raw_contratos_turmas_link on public.sponte_raw_contratos_turmas(contrato_turma_id);
create index if not exists idx_sponte_raw_contratos_turmas_contrato on public.sponte_raw_contratos_turmas(contrato_id);
create index if not exists idx_sponte_raw_contratos_turmas_turma on public.sponte_raw_contratos_turmas(turma_id);
create index if not exists idx_sponte_raw_contratos_turmas_row_hash on public.sponte_raw_contratos_turmas(row_hash);

create index if not exists idx_sponte_raw_contas_receber_batch on public.sponte_raw_contas_receber(import_batch_id);
create index if not exists idx_sponte_raw_contas_receber_conta on public.sponte_raw_contas_receber(conta_receber_id);
create index if not exists idx_sponte_raw_contas_receber_aluno on public.sponte_raw_contas_receber(aluno_id);
create index if not exists idx_sponte_raw_contas_receber_tipo on public.sponte_raw_contas_receber(tipo_recebimento_id);
create index if not exists idx_sponte_raw_contas_receber_row_hash on public.sponte_raw_contas_receber(row_hash);

create index if not exists idx_sponte_raw_contas_receber_parcelas_batch on public.sponte_raw_contas_receber_parcelas(import_batch_id);
create index if not exists idx_sponte_raw_contas_receber_parcelas_conta on public.sponte_raw_contas_receber_parcelas(conta_receber_id);
create index if not exists idx_sponte_raw_contas_receber_parcelas_numero on public.sponte_raw_contas_receber_parcelas(numero_parcela);
create index if not exists idx_sponte_raw_contas_receber_parcelas_situacao on public.sponte_raw_contas_receber_parcelas(situacao);
create index if not exists idx_sponte_raw_contas_receber_parcelas_row_hash on public.sponte_raw_contas_receber_parcelas(row_hash);

create index if not exists idx_sponte_raw_rps_batch on public.sponte_raw_rps(import_batch_id);
create index if not exists idx_sponte_raw_rps_rps on public.sponte_raw_rps(rps_id);
create index if not exists idx_sponte_raw_rps_row_hash on public.sponte_raw_rps(row_hash);

create index if not exists idx_sponte_raw_rps_parcelas_batch on public.sponte_raw_rps_parcelas(import_batch_id);
create index if not exists idx_sponte_raw_rps_parcelas_rps on public.sponte_raw_rps_parcelas(rps_id);
create index if not exists idx_sponte_raw_rps_parcelas_conta on public.sponte_raw_rps_parcelas(conta_receber_id);
create index if not exists idx_sponte_raw_rps_parcelas_numero on public.sponte_raw_rps_parcelas(numero_parcela);
create index if not exists idx_sponte_raw_rps_parcelas_row_hash on public.sponte_raw_rps_parcelas(row_hash);

do $$
declare
  table_name text;
  table_names text[] := array[
    'sponte_raw_multi_empresa',
    'sponte_raw_alunos',
    'sponte_raw_responsaveis',
    'sponte_raw_alunos_responsaveis',
    'sponte_raw_alunos_empresas',
    'sponte_raw_cursos',
    'sponte_raw_series',
    'sponte_raw_turnos',
    'sponte_raw_salas',
    'sponte_raw_turmas',
    'sponte_raw_turma_alunos',
    'sponte_raw_contratos',
    'sponte_raw_contratos_turmas',
    'sponte_raw_contas_receber',
    'sponte_raw_contas_receber_parcelas',
    'sponte_raw_rps',
    'sponte_raw_rps_parcelas'
  ];
begin
  foreach table_name in array table_names loop
    execute format('alter table public.%I enable row level security', table_name);

    execute format('drop policy if exists sponte_raw_admin_select on public.%I', table_name);
    execute format(
      'create policy sponte_raw_admin_select on public.%I for select to authenticated using (public.can_manage_sponte_staging())',
      table_name
    );

    execute format('drop policy if exists sponte_raw_admin_insert on public.%I', table_name);
    execute format(
      'create policy sponte_raw_admin_insert on public.%I for insert to authenticated with check (public.can_manage_sponte_staging())',
      table_name
    );

    execute format('drop policy if exists sponte_raw_admin_update on public.%I', table_name);
    execute format(
      'create policy sponte_raw_admin_update on public.%I for update to authenticated using (public.can_manage_sponte_staging()) with check (public.can_manage_sponte_staging())',
      table_name
    );

    execute format('drop policy if exists sponte_raw_admin_delete on public.%I', table_name);
    execute format(
      'create policy sponte_raw_admin_delete on public.%I for delete to authenticated using (public.can_manage_sponte_staging())',
      table_name
    );

    execute format('drop policy if exists sponte_raw_service_all on public.%I', table_name);
    execute format(
      'create policy sponte_raw_service_all on public.%I for all to service_role using (true) with check (true)',
      table_name
    );
  end loop;
end $$;

commit;
