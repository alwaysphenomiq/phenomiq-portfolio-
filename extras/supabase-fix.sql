-- OPTIONAL. Run in Supabase: SQL Editor > New query > paste > Run.
-- Fixes "403 / row-level security" errors on the contact form.
-- Safe to run more than once. It changes only who can INSERT into "leads".
-- Reading, editing and deleting leads stays limited to logged-in admins.

-- STEP A (read only): see your current policies on leads.
select policyname, roles, cmd, with_check
from pg_policies
where schemaname = 'public' and tablename = 'leads';

-- STEP B: let both visitors (anon) and a logged-in admin insert a lead.
grant usage on schema public to anon, authenticated;
grant insert on public.leads to anon, authenticated;

alter table public.leads enable row level security;

drop policy if exists "Phenomiq public can insert leads" on public.leads;
create policy "Phenomiq public can insert leads"
  on public.leads
  for insert
  to anon, authenticated
  with check (true);
