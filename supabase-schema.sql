create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  place text,
  is_active boolean not null default true,
  role text not null default 'doctor' check (role in ('doctor', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  note text check (note is null or char_length(note) <= 1000),
  review_note text check (review_note is null or char_length(review_note) <= 1000),
  file_path text not null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  constraint submissions_file_path_owner check (split_part(file_path, '/', 1) = doctor_id::text)
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists is_active boolean not null default true;
alter table public.submissions add column if not exists review_note text check (review_note is null or char_length(review_note) <= 1000);
alter table public.submissions add column if not exists reviewed_at timestamptz;
update public.profiles p set email = u.email from auth.users u where u.id = p.id and p.email is distinct from u.email;

create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  submission_id uuid references public.submissions(id) on delete cascade,
  event_type text not null check (event_type in ('new_submission', 'decision')),
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_recipient_created_idx on public.notifications (recipient_id, created_at desc);

create index if not exists submissions_doctor_created_idx
  on public.submissions (doctor_id, created_at desc);
create index if not exists submissions_status_created_idx
  on public.submissions (status, created_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and is_active
  );
$$;

create or replace function public.is_doctor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'doctor' and is_active
  );
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_doctor() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_doctor() to authenticated;

create or replace function public.create_doctor_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    new.email,
    'doctor'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists YNNOVIX_create_profile on auth.users;
create trigger YNNOVIX_create_profile
  after insert on auth.users
  for each row execute function public.create_doctor_profile();

alter table public.profiles enable row level security;
alter table public.submissions enable row level security;

drop policy if exists "profiles_read_self_or_admin" on public.profiles;
create policy "profiles_read_self_or_admin"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "admins_manage_doctor_access" on public.profiles;
create policy "admins_manage_doctor_access"
  on public.profiles for update to authenticated
  using ((select public.is_admin()) and role = 'doctor')
  with check ((select public.is_admin()) and role = 'doctor');

alter table public.notifications enable row level security;
drop policy if exists "notifications_read_own" on public.notifications;
create policy "notifications_read_own"
  on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()));
drop policy if exists "notifications_mark_own_read" on public.notifications;
create policy "notifications_mark_own_read"
  on public.notifications for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

create or replace function public.notify_submission_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (recipient_id, submission_id, event_type, title, body)
    select id, new.id, 'new_submission', 'Nouvel envoi à examiner',
      'Un médecin a transmis une ordonnance.'
    from public.profiles where role = 'admin' and is_active;
  elsif new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    insert into public.notifications (recipient_id, submission_id, event_type, title, body)
    values (
      new.doctor_id, new.id, 'decision',
      case when new.status = 'approved' then 'Ordonnance validée' else 'Ordonnance refusée' end,
      coalesce(nullif(new.review_note, ''), case when new.status = 'approved' then 'Votre envoi a été validé.' else 'Votre envoi a été refusé.' end)
    );
  end if;
  return new;
end;
$$;

create or replace function public.set_submission_reviewed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if new.status in ('approved', 'rejected') then
      new.reviewed_at = now();
    else
      new.reviewed_at = null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists set_submission_reviewed_at on public.submissions;
create trigger set_submission_reviewed_at
  before update of status on public.submissions
  for each row execute function public.set_submission_reviewed_at();

revoke all on function public.notify_submission_event() from public, anon, authenticated;

drop trigger if exists notify_submission_event on public.submissions;
create trigger notify_submission_event
  after insert or update of status on public.submissions
  for each row execute function public.notify_submission_event();

drop policy if exists "submissions_read_owner_or_admin" on public.submissions;
create policy "submissions_read_owner_or_admin"
  on public.submissions for select to authenticated
  using ((doctor_id = (select auth.uid()) and (select public.is_doctor())) or (select public.is_admin()));

drop policy if exists "doctors_create_own_pending_submissions" on public.submissions;
create policy "doctors_create_own_pending_submissions"
  on public.submissions for insert to authenticated
  with check (
    doctor_id = (select auth.uid())
    and (select public.is_doctor())
    and status = 'pending'
    and reviewed_by is null
  );

drop policy if exists "admins_review_submissions" on public.submissions;
create policy "admins_review_submissions"
  on public.submissions for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant usage on schema public to authenticated;
revoke all on public.profiles from anon, authenticated;
revoke all on public.submissions from anon, authenticated;
grant select on public.profiles to authenticated;
revoke update on public.profiles from authenticated;
grant update (is_active) on public.profiles to authenticated;
grant select on public.submissions to authenticated;
grant insert (doctor_id, note, file_path) on public.submissions to authenticated;
grant update (status, reviewed_by, review_note) on public.submissions to authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'prescriptions',
  'prescriptions',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/heic', 'image/heif']
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = excluded.allowed_mime_types;

grant select, insert, delete on storage.objects to authenticated;
alter table storage.objects enable row level security;

drop policy if exists "prescriptions_read_owner_or_admin" on storage.objects;
create policy "prescriptions_read_owner_or_admin"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'prescriptions'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      and (select public.is_doctor())
      or (select public.is_admin())
    )
  );

drop policy if exists "doctors_upload_own_prescriptions" on storage.objects;
create policy "doctors_upload_own_prescriptions"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'prescriptions'
    and (select public.is_doctor())
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "owners_or_admins_delete_prescriptions" on storage.objects;
create policy "owners_or_admins_delete_prescriptions"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'prescriptions'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_admin())
    )
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'submissions'
     ) then
    alter publication supabase_realtime add table public.submissions;
  end if;
end;
$$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
      alter publication supabase_realtime add table public.notifications;
    end if;
  end if;
end;
$$;
