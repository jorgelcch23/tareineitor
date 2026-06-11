-- ============================================================
-- Migration 00006: Workspaces + Onboarding
-- ============================================================
-- Creates workspaces and workspace_members tables,
-- moves role from profiles to workspace_members,
-- adds onboarding_completed to profiles,
-- adds workspace_id to projects,
-- migrates existing data, updates RLS + triggers.
-- ============================================================

-- ============================================================
-- 1. New tables
-- ============================================================

create table public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  logo_url    text,
  created_by  uuid not null references public.profiles(id),
  created_at  timestamptz not null default now()
);

create table public.workspace_members (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  role          text not null default 'member'
                check (role in ('owner', 'admin', 'member')),
  created_at    timestamptz not null default now(),
  unique(workspace_id, user_id)
);

create index idx_workspace_members_user on public.workspace_members(user_id);
create index idx_workspace_members_workspace on public.workspace_members(workspace_id);

-- ============================================================
-- 2. Alter existing tables
-- ============================================================

-- Add onboarding_completed to profiles
alter table public.profiles add column onboarding_completed boolean not null default false;

-- Add workspace_id to projects (nullable initially for migration)
alter table public.projects add column workspace_id uuid references public.workspaces(id);

-- ============================================================
-- 3. Migrate existing data
-- ============================================================

-- Create a default workspace owned by the current owner (or first user)
do $$
declare
  _owner_id uuid;
  _ws_id uuid;
begin
  -- Find the owner
  select id into _owner_id from public.profiles where role = 'owner' limit 1;

  -- If no owner exists, find the first user
  if _owner_id is null then
    select id into _owner_id from public.profiles order by created_at asc limit 1;
  end if;

  -- Only migrate if there are existing users
  if _owner_id is not null then
    -- Create default workspace
    insert into public.workspaces (id, name, created_by)
    values (gen_random_uuid(), 'Default Workspace', _owner_id)
    returning id into _ws_id;

    -- Move all existing users to workspace_members with their current roles
    insert into public.workspace_members (workspace_id, user_id, role)
    select _ws_id, id, role from public.profiles;

    -- Assign all existing projects to this workspace
    update public.projects set workspace_id = _ws_id;

    -- Mark all existing users as onboarding completed
    update public.profiles set onboarding_completed = true;
  end if;
end;
$$;

-- Now make workspace_id NOT NULL (all existing rows have been assigned)
alter table public.projects alter column workspace_id set not null;

-- Add FK index
create index idx_projects_workspace on public.projects(workspace_id);

-- ============================================================
-- 4. Update helper functions
-- ============================================================

-- is_workspace_admin now checks workspace_members instead of profiles.role
create or replace function public.is_workspace_admin(_user_id uuid)
returns boolean
language plpgsql
security definer
stable
as $$
begin
  return exists (
    select 1 from public.workspace_members
    where user_id = _user_id
      and role in ('owner', 'admin')
  );
end;
$$;

-- New: check if user is member of a specific workspace
create or replace function public.is_workspace_member(_workspace_id uuid, _user_id uuid)
returns boolean
language plpgsql
security definer
stable
as $$
begin
  return exists (
    select 1 from public.workspace_members
    where workspace_id = _workspace_id
      and user_id = _user_id
  );
end;
$$;

-- New: check if user is admin of a specific workspace
create or replace function public.is_workspace_admin_of(_workspace_id uuid, _user_id uuid)
returns boolean
language plpgsql
security definer
stable
as $$
begin
  return exists (
    select 1 from public.workspace_members
    where workspace_id = _workspace_id
      and user_id = _user_id
      and role in ('owner', 'admin')
  );
end;
$$;

-- ============================================================
-- 5. RLS for new tables
-- ============================================================

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

-- WORKSPACES --
create policy "Workspaces: members or creator can read"
  on public.workspaces for select
  to authenticated
  using (
    created_by = auth.uid()
    or public.is_workspace_member(id, auth.uid())
  );

create policy "Workspaces: authenticated users can create"
  on public.workspaces for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "Workspaces: workspace admin can update"
  on public.workspaces for update
  to authenticated
  using (public.is_workspace_admin_of(id, auth.uid()));

-- WORKSPACE MEMBERS --
create policy "Workspace members: members can read"
  on public.workspace_members for select
  to authenticated
  using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Workspace members: workspace admin can insert"
  on public.workspace_members for insert
  to authenticated
  with check (
    public.is_workspace_admin_of(workspace_id, auth.uid())
    -- Also allow self-insert during onboarding (creating own workspace)
    or user_id = auth.uid()
  );

create policy "Workspace members: workspace admin can update"
  on public.workspace_members for update
  to authenticated
  using (public.is_workspace_admin_of(workspace_id, auth.uid()));

create policy "Workspace members: workspace admin can delete"
  on public.workspace_members for delete
  to authenticated
  using (public.is_workspace_admin_of(workspace_id, auth.uid()));

-- ============================================================
-- 6. Update handle_new_user trigger
-- ============================================================

-- Updated: creates profile + auto-joins workspace if invited
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  _workspace_id uuid;
begin
  -- Create profile (onboarding_completed = false by default)
  insert into public.profiles (id, full_name, avatar_url, onboarding_completed)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    false
  );

  -- If invited to a workspace, auto-join as member
  _workspace_id := (new.raw_user_meta_data ->> 'workspace_id')::uuid;
  if _workspace_id is not null then
    insert into public.workspace_members (workspace_id, user_id, role)
    values (_workspace_id, new.id, 'member');
  end if;

  return new;
end;
$$;

-- ============================================================
-- 7. Update handle_new_project trigger to include workspace_id
-- ============================================================

-- The trigger already seeds statuses/lists/tags. No change needed since
-- workspace_id is set by the inserting code, not the trigger.

-- ============================================================
-- 8. Update existing RLS policies to scope by workspace
-- ============================================================

-- Projects: use is_workspace_admin_of instead of is_workspace_admin
drop policy if exists "Projects: members or workspace admins can read" on public.projects;
create policy "Projects: members or workspace admins can read"
  on public.projects for select
  to authenticated
  using (
    public.is_project_member(id, auth.uid())
    or public.is_workspace_admin_of(workspace_id, auth.uid())
  );

drop policy if exists "Projects: project admin or workspace admin can update" on public.projects;
create policy "Projects: project admin or workspace admin can update"
  on public.projects for update
  to authenticated
  using (
    exists (
      select 1 from public.project_members
      where project_id = id
        and user_id = auth.uid()
        and role = 'admin'
    )
    or public.is_workspace_admin_of(workspace_id, auth.uid())
  );

drop policy if exists "Projects: project admin or workspace admin can delete" on public.projects;
create policy "Projects: project admin or workspace admin can delete"
  on public.projects for delete
  to authenticated
  using (
    exists (
      select 1 from public.project_members
      where project_id = id
        and user_id = auth.uid()
        and role = 'admin'
    )
    or public.is_workspace_admin_of(workspace_id, auth.uid())
  );

-- Project members: scope to workspace
drop policy if exists "Project members: project members can read" on public.project_members;
create policy "Project members: project members can read"
  on public.project_members for select
  to authenticated
  using (
    public.is_project_member(project_id, auth.uid())
    or exists (
      select 1 from public.projects p
      where p.id = project_id
        and public.is_workspace_admin_of(p.workspace_id, auth.uid())
    )
  );

drop policy if exists "Project members: project admin or workspace admin can insert" on public.project_members;
create policy "Project members: project admin or workspace admin can insert"
  on public.project_members for insert
  to authenticated
  with check (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = project_members.project_id
        and pm.user_id = auth.uid()
        and pm.role = 'admin'
    )
    or exists (
      select 1 from public.projects p
      where p.id = project_members.project_id
        and public.is_workspace_admin_of(p.workspace_id, auth.uid())
    )
  );

drop policy if exists "Project members: project admin or workspace admin can delete" on public.project_members;
create policy "Project members: project admin or workspace admin can delete"
  on public.project_members for delete
  to authenticated
  using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = project_members.project_id
        and pm.user_id = auth.uid()
        and pm.role = 'admin'
    )
    or exists (
      select 1 from public.projects p
      where p.id = project_id
        and public.is_workspace_admin_of(p.workspace_id, auth.uid())
    )
  );

-- Statuses: scope to workspace
drop policy if exists "Statuses: project members can read" on public.statuses;
create policy "Statuses: project members can read"
  on public.statuses for select
  to authenticated
  using (
    public.is_project_member(project_id, auth.uid())
    or exists (
      select 1 from public.projects p
      where p.id = project_id
        and public.is_workspace_admin_of(p.workspace_id, auth.uid())
    )
  );

drop policy if exists "Statuses: project admin or workspace admin can insert" on public.statuses;
create policy "Statuses: project admin or workspace admin can insert"
  on public.statuses for insert
  to authenticated
  with check (
    exists (
      select 1 from public.project_members
      where project_id = statuses.project_id
        and user_id = auth.uid()
        and role = 'admin'
    )
    or exists (
      select 1 from public.projects p
      where p.id = statuses.project_id
        and public.is_workspace_admin_of(p.workspace_id, auth.uid())
    )
  );

drop policy if exists "Statuses: project admin or workspace admin can update" on public.statuses;
create policy "Statuses: project admin or workspace admin can update"
  on public.statuses for update
  to authenticated
  using (
    exists (
      select 1 from public.project_members
      where project_id = statuses.project_id
        and user_id = auth.uid()
        and role = 'admin'
    )
    or exists (
      select 1 from public.projects p
      where p.id = statuses.project_id
        and public.is_workspace_admin_of(p.workspace_id, auth.uid())
    )
  );

-- Tasks: scope to workspace
drop policy if exists "Tasks: project members can read" on public.tasks;
create policy "Tasks: project members can read"
  on public.tasks for select
  to authenticated
  using (
    public.is_project_member(project_id, auth.uid())
    or exists (
      select 1 from public.projects p
      where p.id = project_id
        and public.is_workspace_admin_of(p.workspace_id, auth.uid())
    )
  );

-- ============================================================
-- 9. Drop role column from profiles (no longer used)
-- ============================================================

-- Remove the old RLS policy that references profiles.role
drop policy if exists "Profiles: workspace admin can update roles" on public.profiles;

-- Drop the role column (data has been migrated to workspace_members)
alter table public.profiles drop column role;

-- ============================================================
-- 10. Avatar storage bucket
-- ============================================================

-- Create avatars bucket (public) — run this in Supabase Dashboard > Storage if needed
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
