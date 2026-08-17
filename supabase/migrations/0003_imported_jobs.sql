-- Imported job listings (Remotive, Arbeitnow, ...). Idempotent: re-runs
-- skip rows already present via the (source, external_id) unique index.

alter table public.opportunities
  add column if not exists source text,
  add column if not exists external_id text,
  add column if not exists listing_url text;

alter table public.opportunities
  alter column employer_id drop not null;

-- Plain unique constraint: PostgREST ON CONFLICT doesn't support partial
-- indexes, and NULL sources (user-posted rows) never collide in Postgres.
-- DO block makes this idempotent in every state (index/constraint present or not).
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'opportunities_source_external_uidx'
      and connamespace = 'public'::regnamespace
  ) then
    return;
  end if;
  if exists (
    select 1 from pg_indexes where indexname = 'opportunities_source_external_uidx'
  ) then
    execute 'drop index opportunities_source_external_uidx';
  end if;
  execute 'alter table public.opportunities
    add constraint opportunities_source_external_uidx unique (source, external_id)';
end $$;