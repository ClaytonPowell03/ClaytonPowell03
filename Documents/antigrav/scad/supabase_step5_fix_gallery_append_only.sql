-- ============================================
-- scAId Database Repair - Gallery append-only fix
-- Run this in Supabase SQL Editor if publishing a new gallery item
-- replaces or hides the previous one.
-- ============================================

create extension if not exists pgcrypto;

-- Make sure gallery has a real per-publication id.
alter table public.gallery
  add column if not exists id uuid;

update public.gallery
set id = gen_random_uuid()
where id is null;

alter table public.gallery
  alter column id set default gen_random_uuid(),
  alter column id set not null;

-- If the table was accidentally made one-row-per-user/title, remove those
-- uniqueness rules so every publish appends a new row.
do $$
declare
  constraint_record record;
  index_record record;
  primary_key_name text;
  primary_key_columns text[];
begin
  select c.conname, array_agg(a.attname order by k.ordinality)
    into primary_key_name, primary_key_columns
  from pg_constraint c
  join unnest(c.conkey) with ordinality as k(attnum, ordinality) on true
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
  where c.conrelid = 'public.gallery'::regclass
    and c.contype = 'p'
  group by c.conname;

  if primary_key_name is null then
    alter table public.gallery add constraint gallery_pkey primary key (id);
  elsif primary_key_columns <> array['id'] then
    execute format('alter table public.gallery drop constraint %I', primary_key_name);
    alter table public.gallery add constraint gallery_pkey primary key (id);
  end if;

  for constraint_record in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.gallery'::regclass
      and c.contype = 'u'
  loop
    execute format('alter table public.gallery drop constraint %I', constraint_record.conname);
  end loop;

  for index_record in
    select i.indexrelid::regclass::text as index_name
    from pg_index i
    where i.indrelid = 'public.gallery'::regclass
      and i.indisunique
      and not i.indisprimary
  loop
    execute format('drop index if exists %s', index_record.index_name);
  end loop;
end $$;

create index if not exists gallery_created_at_idx
  on public.gallery (created_at desc);

alter table public.gallery enable row level security;

drop policy if exists "Gallery items are publicly accessible" on public.gallery;
drop policy if exists "Users can publish to gallery" on public.gallery;
drop policy if exists "Users can update their gallery items" on public.gallery;
drop policy if exists "Users can delete their gallery items" on public.gallery;

create policy "Gallery items are publicly accessible"
  on public.gallery for select
  using (true);

create policy "Users can publish to gallery"
  on public.gallery for insert
  with check (auth.role() = 'authenticated' and owner_id = auth.uid());

create policy "Users can update their gallery items"
  on public.gallery for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete their gallery items"
  on public.gallery for delete
  using (auth.uid() = owner_id);

-- Verify the live schema after running:
-- select id, owner_id, title, created_at
-- from public.gallery
-- order by created_at desc;
