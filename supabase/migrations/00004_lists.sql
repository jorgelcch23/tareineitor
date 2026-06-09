-- ============================================================
-- 00004_lists.sql — Listas por proyecto (reemplaza sprints)
-- ============================================================

-- 1. Tabla lists
create table if not exists public.lists (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null,
  position    int not null default 0,
  created_by  uuid not null references public.profiles(id),
  created_at  timestamptz not null default now()
);

-- Índices
create index if not exists idx_lists_project on public.lists (project_id, position);

-- 2. Agregar list_id a tasks (nullable — la app siempre lo envía)
alter table public.tasks
  add column if not exists list_id uuid references public.lists(id) on delete cascade;

create index if not exists idx_tasks_list on public.tasks (list_id);

-- 3. RLS para lists
alter table public.lists enable row level security;

create policy "lists_select" on public.lists
  for select using (
    is_project_member(project_id, auth.uid())
    or is_workspace_admin(auth.uid())
  );

create policy "lists_insert" on public.lists
  for insert with check (
    is_project_member(project_id, auth.uid())
    or is_workspace_admin(auth.uid())
  );

create policy "lists_update" on public.lists
  for update using (
    is_project_member(project_id, auth.uid())
    or is_workspace_admin(auth.uid())
  );

create policy "lists_delete" on public.lists
  for delete using (
    is_project_member(project_id, auth.uid())
    or is_workspace_admin(auth.uid())
  );

-- 4. Actualizar trigger handle_new_project para crear lista "General" por defecto
create or replace function public.handle_new_project()
returns trigger
security definer
language plpgsql
as $$
begin
  -- Agregar al creador como admin del proyecto
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.created_by, 'admin');

  -- Status por defecto
  insert into public.statuses (project_id, name, color, position, is_done) values
    (new.id, 'To Do',        '#6B7280', 0, false),
    (new.id, 'In Progress',  '#F59E0B', 1, false),
    (new.id, 'Done',         '#10B981', 2, true);

  -- Lista por defecto
  insert into public.lists (project_id, name, position, created_by)
  values (new.id, 'General', 0, new.created_by);

  return new;
end;
$$;
