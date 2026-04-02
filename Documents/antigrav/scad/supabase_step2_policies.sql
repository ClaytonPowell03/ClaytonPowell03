-- ============================================
-- scAId Database Setup — Step 2: RLS Policies
-- Run this AFTER Step 1 completes successfully
-- ============================================

-- Enable RLS on projects
alter table public.projects enable row level security;

-- Owner can do everything with their own projects
create policy "owners_all" on public.projects
  for all using (owner_id = auth.uid());

-- Shared users can read projects shared with them
create policy "shared_read" on public.projects
  for select using (
    id in (select project_id from public.project_shares where shared_with = auth.uid())
  );

-- Shared users can update projects shared with them (edit access)
create policy "shared_update" on public.projects
  for update using (
    id in (select project_id from public.project_shares where shared_with = auth.uid() and can_edit = true)
  );

-- Enable RLS on project_shares
alter table public.project_shares enable row level security;

-- Project owner or share recipient can see shares
create policy "shares_visible" on public.project_shares
  for select using (
    shared_with = auth.uid() or shared_by = auth.uid()
  );

-- Only project owner can create/delete shares
create policy "shares_manage" on public.project_shares
  for insert with check (shared_by = auth.uid());

create policy "shares_delete" on public.project_shares
  for delete using (shared_by = auth.uid());

-- Function to look up user ID by email (for sharing)
create or replace function public.get_user_id_by_email(lookup_email text)
returns uuid
language sql
security definer
as $$
  select id from auth.users where email = lower(lookup_email) limit 1;
$$;
