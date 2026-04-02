-- ============================================
-- scAId Database Setup — Step 1: Create tables
-- Run this FIRST in Supabase SQL Editor
-- ============================================

-- Projects table
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Untitled Project',
  code text not null default '',
  thumbnail_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Project sharing table
create table if not exists public.project_shares (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  shared_with uuid not null references auth.users(id) on delete cascade,
  shared_by uuid not null references auth.users(id),
  can_edit boolean not null default false,
  created_at timestamptz not null default now(),
  unique(project_id, shared_with)
);
