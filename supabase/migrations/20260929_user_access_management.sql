-- NP MKT 사용자·권한 관리 1단계
-- 기존 profiles와 인증 사용자를 보존하며 사용자 관리 기반만 추가합니다.

alter table public.profiles
  add column if not exists department text not null default '미입력',
  add column if not exists phone text not null default '미입력',
  add column if not exists ad_object_id text,
  add column if not exists ad_synced_at timestamptz,
  add column if not exists last_signed_in_at timestamptz,
  add column if not exists deactivated_at timestamptz,
  add column if not exists deactivated_by uuid references public.profiles(id);

create unique index if not exists profiles_email_lower_unique
  on public.profiles (lower(email));

create table if not exists public.buyer_role_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  requested_categories text[] not null default '{}',
  request_note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'on_hold', 'cancelled')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists buyer_role_requests_open_per_user
  on public.buyer_role_requests(requester_id)
  where status in ('pending', 'on_hold');
create index if not exists buyer_role_requests_status_created_idx
  on public.buyer_role_requests(status, created_at desc);

create table if not exists public.buyer_category_assignments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  category_large text not null,
  category_small text,
  assigned_by uuid not null references public.profiles(id),
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  note text
);

create unique index if not exists buyer_category_assignments_active_unique
  on public.buyer_category_assignments(profile_id, category_large, coalesce(category_small, ''))
  where unassigned_at is null;
create index if not exists buyer_category_assignments_profile_idx
  on public.buyer_category_assignments(profile_id) where unassigned_at is null;

create table if not exists public.user_access_audit_logs (
  id uuid primary key default gen_random_uuid(),
  target_profile_id uuid not null references public.profiles(id),
  actor_profile_id uuid references public.profiles(id),
  action_type text not null check (action_type in ('profile_created', 'role_changed', 'status_changed', 'category_assigned', 'category_removed', 'buyer_request_created', 'buyer_request_reviewed', 'profile_updated')),
  before_value jsonb not null default '{}'::jsonb,
  after_value jsonb not null default '{}'::jsonb,
  reason text not null default '시스템 처리',
  occurred_at timestamptz not null default now()
);
create index if not exists user_access_audit_logs_target_idx
  on public.user_access_audit_logs(target_profile_id, occurred_at desc);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  reference_type text,
  reference_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists user_notifications_recipient_idx
  on public.user_notifications(recipient_profile_id, is_read, created_at desc);

create or replace function public.is_np_mkt_manager()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('lead', 'admin') and p.is_active
  );
$$;

create or replace function public.can_manage_target_user(target_id uuid)
returns boolean language plpgsql stable security definer set search_path = public
as $$
declare
  actor_role public.app_role;
  target_role public.app_role;
begin
  select role into actor_role from public.profiles where id = auth.uid() and is_active;
  select role into target_role from public.profiles where id = target_id;
  if actor_role = 'admin' then return true; end if;
  return actor_role = 'lead' and target_role in ('requester', 'buyer');
end;
$$;

create or replace function public.touch_user_access_updated_at()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists buyer_role_requests_touch_updated_at on public.buyer_role_requests;
create trigger buyer_role_requests_touch_updated_at
before update on public.buyer_role_requests
for each row execute function public.touch_user_access_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  profile_name text := coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1));
  requested_role text := coalesce(new.raw_user_meta_data ->> 'requested_role', 'requester');
begin
  insert into public.profiles (id, name, email, department, phone, role, is_active)
  values (
    new.id,
    profile_name,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'department', ''), '미입력'),
    coalesce(nullif(new.raw_user_meta_data ->> 'phone', ''), '미입력'),
    'requester',
    true
  )
  on conflict (id) do update
    set name = excluded.name,
        email = excluded.email,
        department = excluded.department,
        phone = excluded.phone,
        updated_at = now();

  insert into public.user_access_audit_logs (target_profile_id, action_type, after_value, reason)
  values (new.id, 'profile_created', jsonb_build_object('role', 'requester', 'is_active', true), '회원가입');

  if requested_role = 'buyer' then
    insert into public.buyer_role_requests (requester_id, request_note)
    values (new.id, '회원가입 시 Buyer 권한 요청');
    insert into public.user_access_audit_logs (target_profile_id, action_type, after_value, reason)
    values (new.id, 'buyer_request_created', jsonb_build_object('status', 'pending'), '회원가입 시 Buyer 권한 요청');
  end if;
  return new;
end;
$$;

create or replace function public.change_user_access(
  target_id uuid,
  next_role public.app_role,
  next_is_active boolean,
  change_reason text
)
returns void language plpgsql security definer set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_role public.app_role;
  target_role public.app_role;
  before_snapshot jsonb;
begin
  if nullif(btrim(change_reason), '') is null then raise exception '변경 사유를 입력해 주세요.'; end if;
  if actor_id = target_id then raise exception '본인 권한 또는 계정 상태는 변경할 수 없습니다.'; end if;
  select role into actor_role from public.profiles where id = actor_id and is_active;
  select role, jsonb_build_object('role', role, 'is_active', is_active) into target_role, before_snapshot from public.profiles where id = target_id;
  if actor_role is null or target_role is null then raise exception '권한 변경 대상 또는 실행자를 찾을 수 없습니다.'; end if;
  if actor_role = 'lead' and (target_role not in ('requester', 'buyer') or next_role not in ('requester', 'buyer')) then
    raise exception '팀장은 요청자와 Buyer 권한만 변경할 수 있습니다.';
  end if;
  if actor_role not in ('lead', 'admin') then raise exception '권한 변경 권한이 없습니다.'; end if;

  update public.profiles
     set role = next_role,
         is_active = next_is_active,
         deactivated_at = case when next_is_active then null else now() end,
         deactivated_by = case when next_is_active then null else actor_id end
   where id = target_id;

  insert into public.user_access_audit_logs (target_profile_id, actor_profile_id, action_type, before_value, after_value, reason)
  values (
    target_id, actor_id,
    case when (before_snapshot ->> 'role') is distinct from next_role::text then 'role_changed' else 'status_changed' end,
    before_snapshot,
    jsonb_build_object('role', next_role, 'is_active', next_is_active),
    change_reason
  );
end;
$$;

alter table public.buyer_role_requests enable row level security;
alter table public.buyer_category_assignments enable row level security;
alter table public.user_access_audit_logs enable row level security;
alter table public.user_notifications enable row level security;

create policy buyer_role_requests_read_own_or_manager on public.buyer_role_requests
for select to authenticated
using (requester_id = auth.uid() or public.is_np_mkt_manager());
create policy buyer_role_requests_create_own on public.buyer_role_requests
for insert to authenticated
with check (requester_id = auth.uid() and status = 'pending');
create policy buyer_role_requests_manage_by_manager on public.buyer_role_requests
for update to authenticated
using (public.is_np_mkt_manager()) with check (public.is_np_mkt_manager());

create policy buyer_category_assignments_read_own_or_manager on public.buyer_category_assignments
for select to authenticated
using (profile_id = auth.uid() or public.is_np_mkt_manager());
create policy buyer_category_assignments_manage_target on public.buyer_category_assignments
for all to authenticated
using (public.can_manage_target_user(profile_id))
with check (public.can_manage_target_user(profile_id));

create policy user_access_audit_logs_read_own_or_manager on public.user_access_audit_logs
for select to authenticated
using (target_profile_id = auth.uid() or public.is_np_mkt_manager());

create policy user_notifications_read_own on public.user_notifications
for select to authenticated using (recipient_profile_id = auth.uid());
create policy user_notifications_mark_read_own on public.user_notifications
for update to authenticated
using (recipient_profile_id = auth.uid())
with check (recipient_profile_id = auth.uid());
