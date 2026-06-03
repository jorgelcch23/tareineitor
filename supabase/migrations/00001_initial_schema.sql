-- ============================================================
-- TaskFlow: Initial Schema
-- ============================================================

-- ============================================================
-- Tables
-- ============================================================

-- Profiles (extends auth.users)
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  role        text not null default 'member'
              check (role in ('owner', 'admin', 'member')),
  created_at  timestamptz not null default now()
);

-- Projects
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_by  uuid not null references public.profiles(id),
  archived    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Project members (access control)
create table public.project_members (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        text not null default 'member'
              check (role in ('admin', 'member')),
  created_at  timestamptz not null default now(),
  unique(project_id, user_id)
);

-- Statuses (configurable per project)
create table public.statuses (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null,
  color       text not null,
  position    int not null,
  is_done     boolean not null default false
);

-- Tasks
create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  title       text not null,
  description jsonb,
  status_id   uuid not null references public.statuses(id),
  assignee_id uuid references public.profiles(id),
  priority    text check (priority in ('urgent', 'high', 'normal', 'low')),
  due_date    timestamptz,
  position    int not null default 0,
  created_by  uuid not null references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Comments
create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks(id) on delete cascade,
  user_id     uuid not null references public.profiles(id),
  body        text not null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- Helper functions (SECURITY DEFINER so RLS can call them)
-- ============================================================

create or replace function public.is_project_member(_project_id uuid, _user_id uuid)
returns boolean
language plpgsql
security definer
stable
as $$
begin
  return exists (
    select 1 from public.project_members
    where project_id = _project_id
      and user_id = _user_id
  );
end;
$$;

create or replace function public.is_workspace_admin(_user_id uuid)
returns boolean
language plpgsql
security definer
stable
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = _user_id
      and role in ('owner', 'admin')
  );
end;
$$;

-- ============================================================
-- Triggers
-- ============================================================

-- Auto-update updated_at on tasks
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_updated_at
  before update on public.tasks
  for each row
  execute function public.handle_updated_at();

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  _role text;
begin
  -- First user becomes owner
  if (select count(*) from public.profiles) = 0 then
    _role := 'owner';
  else
    _role := 'member';
  end if;

  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'avatar_url',
    _role
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Auto-seed default statuses + add creator as admin when project is created
create or replace function public.handle_new_project()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Seed default statuses
  insert into public.statuses (project_id, name, color, position, is_done) values
    (new.id, 'To Do',        '#6B7280', 0, false),
    (new.id, 'In Progress',  '#3B82F6', 1, false),
    (new.id, 'In Review',    '#F59E0B', 2, false),
    (new.id, 'Blocked',      '#EF4444', 3, false),
    (new.id, 'Done',         '#10B981', 4, true);

  -- Add creator as project admin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.created_by, 'admin');

  return new;
end;
$$;

create trigger on_project_created
  after insert on public.projects
  for each row
  execute function public.handle_new_project();

-- ============================================================
-- Indexes
-- ============================================================

create index idx_project_members_user    on public.project_members(user_id);
create index idx_project_members_project on public.project_members(project_id);
create index idx_tasks_project           on public.tasks(project_id);
create index idx_tasks_status            on public.tasks(status_id);
create index idx_tasks_assignee          on public.tasks(assignee_id);
create index idx_comments_task           on public.comments(task_id);
create index idx_statuses_project        on public.statuses(project_id);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.statuses enable row level security;
alter table public.tasks enable row level security;
alter table public.comments enable row level security;

-- PROFILES --
create policy "Profiles: anyone authenticated can read"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Profiles: users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

create policy "Profiles: workspace admin can update roles"
  on public.profiles for update
  to authenticated
  using (public.is_workspace_admin(auth.uid()));

-- PROJECTS --
create policy "Projects: members or workspace admins can read"
  on public.projects for select
  to authenticated
  using (
    public.is_project_member(id, auth.uid())
    or public.is_workspace_admin(auth.uid())
  );

create policy "Projects: authenticated users can create"
  on public.projects for insert
  to authenticated
  with check (created_by = auth.uid());

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
    or public.is_workspace_admin(auth.uid())
  );

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
    or public.is_workspace_admin(auth.uid())
  );

-- PROJECT MEMBERS --
create policy "Project members: project members can read"
  on public.project_members for select
  to authenticated
  using (
    public.is_project_member(project_id, auth.uid())
    or public.is_workspace_admin(auth.uid())
  );

create policy "Project members: project admin or workspace admin can insert"
  on public.project_members for insert
  to authenticated
  with check (
    exists (
      select 1 from public.project_members
      where project_id = project_members.project_id
        and user_id = auth.uid()
        and role = 'admin'
    )
    or public.is_workspace_admin(auth.uid())
  );

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
    or public.is_workspace_admin(auth.uid())
  );

-- STATUSES --
create policy "Statuses: project members can read"
  on public.statuses for select
  to authenticated
  using (
    public.is_project_member(project_id, auth.uid())
    or public.is_workspace_admin(auth.uid())
  );

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
    or public.is_workspace_admin(auth.uid())
  );

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
    or public.is_workspace_admin(auth.uid())
  );

-- TASKS --
create policy "Tasks: project members can read"
  on public.tasks for select
  to authenticated
  using (
    public.is_project_member(project_id, auth.uid())
    or public.is_workspace_admin(auth.uid())
  );

create policy "Tasks: project members can insert"
  on public.tasks for insert
  to authenticated
  with check (
    public.is_project_member(project_id, auth.uid())
    and created_by = auth.uid()
  );

create policy "Tasks: project members can update"
  on public.tasks for update
  to authenticated
  using (
    public.is_project_member(project_id, auth.uid())
  );

create policy "Tasks: project members can delete"
  on public.tasks for delete
  to authenticated
  using (
    public.is_project_member(project_id, auth.uid())
  );

-- COMMENTS --
create policy "Comments: project members can read"
  on public.comments for select
  to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = comments.task_id
        and (
          public.is_project_member(t.project_id, auth.uid())
          or public.is_workspace_admin(auth.uid())
        )
    )
  );

create policy "Comments: project members can insert"
  on public.comments for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = comments.task_id
        and public.is_project_member(t.project_id, auth.uid())
    )
  );

create policy "Comments: users can delete own comments"
  on public.comments for delete
  to authenticated
  using (user_id = auth.uid());
