-- NP MKT 사용자·권한 관리 1단계 보완
-- 대시보드에서 선반영한 기반 구조에 누락 없이 보안 범위와 변경 함수를 맞춥니다.

create index if not exists buyer_role_requests_status_created_idx
  on public.buyer_role_requests(status, created_at desc);
create index if not exists buyer_category_assignments_profile_idx
  on public.buyer_category_assignments(profile_id) where unassigned_at is null;
create index if not exists user_notifications_recipient_idx
  on public.user_notifications(recipient_profile_id, is_read, created_at desc);

alter table public.user_access_audit_logs
  drop constraint if exists user_access_audit_logs_action_type_check;
alter table public.user_access_audit_logs
  add constraint user_access_audit_logs_action_type_check
  check (action_type in (
    'profile_created', 'role_changed', 'status_changed', 'category_assigned',
    'category_removed', 'buyer_request_created', 'buyer_request_reviewed',
    'profile_updated'
  ));

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
  select role, jsonb_build_object('role', role, 'is_active', is_active)
    into target_role, before_snapshot from public.profiles where id = target_id;
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

drop policy if exists buyer_category_manage on public.buyer_category_assignments;
drop policy if exists buyer_category_assignments_manage_target on public.buyer_category_assignments;
create policy buyer_category_assignments_manage_target on public.buyer_category_assignments
for all to authenticated
using (public.can_manage_target_user(profile_id))
with check (public.can_manage_target_user(profile_id));
