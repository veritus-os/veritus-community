-- 04_mvp_read_policies.sql
-- MVP-only read policies for dashboard development.

begin;

drop policy if exists mvp_read_families on public.families;
create policy mvp_read_families on public.families for select to anon, authenticated using (true);

drop policy if exists mvp_read_students on public.students;
create policy mvp_read_students on public.students for select to anon, authenticated using (true);

drop policy if exists mvp_read_guardians on public.guardians;
create policy mvp_read_guardians on public.guardians for select to anon, authenticated using (true);

drop policy if exists mvp_read_assets on public.assets;
create policy mvp_read_assets on public.assets for select to anon, authenticated using (true);

drop policy if exists mvp_read_assets_inventory on public.assets_inventory;
create policy mvp_read_assets_inventory on public.assets_inventory for select to anon, authenticated using (true);

drop policy if exists mvp_read_financial_summary on public.financial_summary;
create policy mvp_read_financial_summary on public.financial_summary for select to anon, authenticated using (true);

commit;
