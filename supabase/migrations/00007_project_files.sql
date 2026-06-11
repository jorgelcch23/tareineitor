-- ============================================================
-- 00007_project_files.sql — Archivos por proyecto
-- ============================================================

-- 1. Tabla project_files
create table if not exists public.project_files (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  name          text not null,
  storage_path  text not null,
  size          bigint not null default 0,
  content_type  text not null default 'application/octet-stream',
  uploaded_by   uuid not null references public.profiles(id),
  created_at    timestamptz not null default now()
);

create index if not exists idx_project_files_project on public.project_files (project_id);

-- 2. RLS para project_files
alter table public.project_files enable row level security;

create policy "project_files_select" on public.project_files
  for select using (
    is_project_member(project_id, auth.uid())
    or is_workspace_admin(auth.uid())
  );

create policy "project_files_insert" on public.project_files
  for insert with check (
    is_project_member(project_id, auth.uid())
    or is_workspace_admin(auth.uid())
  );

create policy "project_files_delete" on public.project_files
  for delete using (
    uploaded_by = auth.uid()
    or is_workspace_admin(auth.uid())
    or exists (
      select 1 from public.project_members
      where project_id = project_files.project_id
        and user_id = auth.uid()
        and role = 'admin'
    )
  );

-- 3. Storage bucket (run via Supabase dashboard or API if needed)
-- Insert bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;

-- 4. Storage RLS policies
-- Allow project members to upload files
create policy "project_files_storage_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'project-files'
  and (
    is_project_member((storage.foldername(name))[1]::uuid, auth.uid())
    or is_workspace_admin(auth.uid())
  )
);

-- Allow project members to read files
create policy "project_files_storage_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'project-files'
  and (
    is_project_member((storage.foldername(name))[1]::uuid, auth.uid())
    or is_workspace_admin(auth.uid())
  )
);

-- Allow uploader / project admin / workspace admin to delete files
create policy "project_files_storage_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'project-files'
  and (
    (select auth.uid())::text = owner_id
    or is_workspace_admin(auth.uid())
    or exists (
      select 1 from public.project_members
      where project_id = (storage.foldername(name))[1]::uuid
        and user_id = auth.uid()
        and role = 'admin'
    )
  )
);
