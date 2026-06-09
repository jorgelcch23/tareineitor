-- ============================================================
-- 00005_tags.sql — Tags por proyecto (categorización de tareas)
-- ============================================================

-- 1. Tabla tags
create table if not exists public.tags (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null,
  color       text not null,
  created_at  timestamptz not null default now()
);

-- 2. Agregar tag_id a tasks (nullable)
alter table public.tasks
  add column if not exists tag_id uuid references public.tags(id) on delete set null;

create index if not exists idx_tasks_tag on public.tasks (tag_id);
create index if not exists idx_tags_project on public.tags (project_id);

-- 3. RLS para tags
alter table public.tags enable row level security;

create policy "tags_select" on public.tags
  for select using (
    is_project_member(project_id, auth.uid())
    or is_workspace_admin(auth.uid())
  );

create policy "tags_insert" on public.tags
  for insert with check (
    is_project_member(project_id, auth.uid())
    or is_workspace_admin(auth.uid())
  );

create policy "tags_update" on public.tags
  for update using (
    is_project_member(project_id, auth.uid())
    or is_workspace_admin(auth.uid())
  );

create policy "tags_delete" on public.tags
  for delete using (
    is_project_member(project_id, auth.uid())
    or is_workspace_admin(auth.uid())
  );

-- 4. Actualizar trigger handle_new_project para insertar tags por defecto
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
    (new.id, 'In Review',    '#8B5CF6', 2, false),
    (new.id, 'Blocked',      '#EF4444', 3, false),
    (new.id, 'Done',         '#10B981', 4, true);

  -- Lista por defecto
  insert into public.lists (project_id, name, position, created_by)
  values (new.id, 'General', 0, new.created_by);

  -- Tags por defecto
  insert into public.tags (project_id, name, color) values
    (new.id, 'Frontend',  '#3B82F6'),
    (new.id, 'Backend',   '#10B981'),
    (new.id, 'Design',    '#8B5CF6'),
    (new.id, 'Database',  '#F97316'),
    (new.id, 'DevOps',    '#EAB308'),
    (new.id, 'API',       '#06B6D4');

  return new;
end;
$$;

-- 5. Seed: insertar tags por defecto en proyectos existentes que no tienen tags
insert into public.tags (project_id, name, color)
select p.id, t.name, t.color
from public.projects p
cross join (values
  ('Frontend',  '#3B82F6'),
  ('Backend',   '#10B981'),
  ('Design',    '#8B5CF6'),
  ('Database',  '#F97316'),
  ('DevOps',    '#EAB308'),
  ('API',       '#06B6D4')
) as t(name, color)
where not exists (
  select 1 from public.tags tg where tg.project_id = p.id
);
