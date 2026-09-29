-- Buyer 권한 요청 검토: 팀장·관리자만 처리할 수 있습니다.
-- 팀장은 요청자 계정을 Buyer로 승격할 수 있으나 관리자 권한은 부여할 수 없습니다.

create or replace function public.review_buyer_role_request(
  request_id uuid,
  next_status text,
  next_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_role public.app_role;
  request_row public.buyer_role_requests%rowtype;
begin
  if next_status not in ('approved', 'rejected', 'on_hold') then
    raise exception '허용되지 않은 검토 상태입니다.';
  end if;
  if nullif(btrim(coalesce(next_note, '')), '') is null then
    raise exception '검토 사유를 입력해 주세요.';
  end if;

  select role into actor_role
    from public.profiles
   where id = actor_id and is_active = true;
  if actor_role not in ('lead', 'admin') then
    raise exception 'Buyer 권한 요청을 검토할 권한이 없습니다.';
  end if;

  select * into request_row
    from public.buyer_role_requests
   where id = request_id
   for update;
  if not found then
    raise exception 'Buyer 권한 요청을 찾을 수 없습니다.';
  end if;
  if request_row.status not in ('pending', 'on_hold') then
    raise exception '이미 처리된 Buyer 권한 요청입니다.';
  end if;

  update public.buyer_role_requests
     set status = next_status,
         reviewed_by = actor_id,
         reviewed_at = now(),
         review_note = btrim(next_note)
   where id = request_id;

  if next_status = 'approved' then
    update public.profiles
       set role = 'buyer'
     where id = request_row.requester_id
       and is_active = true;
  end if;

  insert into public.user_access_audit_logs
    (target_profile_id, actor_profile_id, action_type, before_value, after_value, reason)
  values
    (request_row.requester_id, actor_id, 'buyer_request_reviewed',
     jsonb_build_object('status', request_row.status),
     jsonb_build_object('status', next_status, 'role', case when next_status = 'approved' then 'buyer' else null end),
     btrim(next_note));

  insert into public.user_notifications
    (recipient_profile_id, type, title, message, reference_type, reference_id)
  values
    (request_row.requester_id, 'buyer_role_request',
     case next_status when 'approved' then 'Buyer 권한이 승인되었습니다' when 'rejected' then 'Buyer 권한 요청이 반려되었습니다' else 'Buyer 권한 요청이 보류되었습니다' end,
     btrim(next_note), 'buyer_role_request', request_id);
end;
$$;

grant execute on function public.review_buyer_role_request(uuid, text, text) to authenticated;
