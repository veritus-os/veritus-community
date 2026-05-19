-- 03_family_dashboard_view.sql
-- Adds residency compliance flag and family-centric dashboard view.

begin;

alter table public.families
  add column if not exists proof_of_residency_submitted boolean not null default true;

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

grant select on public.family_centric_dashboard to anon, authenticated;

commit;
