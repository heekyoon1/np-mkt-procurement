-- Buyer 가입 요청의 희망 카테고리, 승인 시 자동 배정, 알림 읽음 처리를 추가합니다.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  profile_name text := coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1));
  requested_role text := coalesce(new.raw_user_meta_data ->> 'requested_role', 'requester');
  requested_categories text[] := coalesce(
    array(select jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'requested_categories', '[]'::jsonb))),
    '{}'::text[]
  );
begin
  insert into public.profiles (id, name, email, department, phone, role, is_active)
  values (new.id, profile_name, new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'department', ''), '미입력'),
    coalesce(nullif(new.raw_user_meta_data ->> 'phone', ''), '미입력'),
    'requester', true)
  on conflict (id) do update set name = excluded.name, email = excluded.email,
    department = excluded.department, phone = excluded.phone, updated_at = now();

  insert into public.user_access_audit_logs (target_profile_id, action_type, after_value, reason)
  values (new.id, 'profile_created', jsonb_build_object('role', 'requester', 'is_active', true), '회원가입');

  if requested_role = 'buyer' then
    insert into public.buyer_role_requests (requester_id, requested_categories, request_note)
    values (new.id, requested_categories, '회원가입 시 Buyer 권한 요청');
    insert into public.user_access_audit_logs (target_profile_id, action_type, after_value, reason)
    values (new.id, 'buyer_request_created', jsonb_build_object('status', 'pending', 'requested_categories', requested_categories), '회원가입 시 Buyer 권한 요청');
  end if;
  return new;
end;
$$;

create or replace function public.review_buyer_role_request(
  request_id uuid, next_status text, next_note text default null
)
returns void language plpgsql security definer set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_role public.app_role;
  request_row public.buyer_role_requests%rowtype;
  category_name text;
begin
  if next_status not in ('approved', 'rejected', 'on_hold') then raise exception '허용되지 않은 검토 상태입니다.'; end if;
  if nullif(btrim(coalesce(next_note, '')), '') is null then raise exception '검토 사유를 입력해 주세요.'; end if;
  select role into actor_role from public.profiles where id = actor_id and is_active = true;
  if actor_role not in ('lead', 'admin') then raise exception 'Buyer 권한 요청을 검토할 권한이 없습니다.'; end if;
  select * into request_row from public.buyer_role_requests where id = request_id for update;
  if not found or request_row.status not in ('pending', 'on_hold') then raise exception '처리할 수 있는 Buyer 권한 요청이 아닙니다.'; end if;
  update public.buyer_role_requests set status = next_status, reviewed_by = actor_id, reviewed_at = now(), review_note = btrim(next_note) where id = request_id;
  if next_status = 'approved' then
    update public.profiles set role = 'buyer' where id = request_row.requester_id and is_active = true;
    foreach category_name in array request_row.requested_categories loop
      if nullif(btrim(category_name), '') is not null then
        insert into public.buyer_category_assignments (profile_id, category_large, assigned_by, note)
        values (request_row.requester_id, btrim(category_name), actor_id, 'Buyer 승인 시 희망 카테고리 자동 배정')
        on conflict (profile_id, category_large, coalesce(category_small, '')) where unassigned_at is null
        do nothing;
      end if;
    end loop;
  end if;
  insert into public.user_access_audit_logs (target_profile_id, actor_profile_id, action_type, before_value, after_value, reason)
  values (request_row.requester_id, actor_id, 'buyer_request_reviewed', jsonb_build_object('status', request_row.status), jsonb_build_object('status', next_status, 'role', case when next_status = 'approved' then 'buyer' else null end, 'requested_categories', request_row.requested_categories), btrim(next_note));
  insert into public.user_notifications (recipient_profile_id, type, title, message, reference_type, reference_id)
  values (request_row.requester_id, 'buyer_role_request', case next_status when 'approved' then 'Buyer 권한이 승인되었습니다' when 'rejected' then 'Buyer 권한 요청이 반려되었습니다' else 'Buyer 권한 요청이 보류되었습니다' end, btrim(next_note), 'buyer_role_request', request_id);
end;
$$;

create or replace function public.mark_my_notifications_read(notification_ids uuid[] default null)
returns integer language plpgsql security definer set search_path = public
as $$
declare updated_count integer;
begin
  update public.user_notifications
     set is_read = true, read_at = now()
   where recipient_profile_id = auth.uid()
     and is_read = false
     and (notification_ids is null or id = any(notification_ids));
  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

grant execute on function public.mark_my_notifications_read(uuid[]) to authenticated;
