-- Allow users to insert their own profile (needed for users who signed up before migration)
create policy "Profiles: users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

-- Backfill: create profiles for any existing auth users that don't have one
insert into public.profiles (id, full_name, role)
select
  au.id,
  coalesce(au.raw_user_meta_data ->> 'full_name', au.email),
  case
    when not exists (select 1 from public.profiles) then 'owner'
    else 'member'
  end
from auth.users au
where not exists (
  select 1 from public.profiles p where p.id = au.id
);
