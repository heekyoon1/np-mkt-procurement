-- Buyer 담당 카테고리 배정과 해제 이력을 관리합니다.

create or replace function public.set_buyer_category_assignment(
  target_profile_id uuid,
  next_category_large text,
  next_category_small text default null,
  assign boolean default true,
  change_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_role public.app_role;
  normalized_large text := nullif(btrim(next_category_large), '');
  normalized_small text := nullif(btrim(coalesce(next_category_small, '')), '');
begin
  if normalized_large is null then
    raise exception '대분류를 선택해 주세요.';
  end if;
  if nullif(btrim(coalesce(change_reason, '')), '') is null then
    raise exception '변경 사유를 입력해 주세요.';
  end if;
  if not public.can_manage_target_user(target_profile_id) then
    raise exception '이 Buyer의 담당 카테고리를 변경할 권한이 없습니다.';
  end if;
  select role into target_role from public.profiles where id = target_profile_id and is_active = true;
  if target_role <> 'buyer' then
    raise exception '활성 Buyer에게만 카테고리를 배정할 수 있습니다.';
  end if;

  if assign then
    insert into public.buyer_category_assignments
      (profile_id, category_large, category_small, assigned_by, note)
    values (target_profile_id, normalized_large, normalized_small, actor_id, btrim(change_reason))
    on conflict (profile_id, category_large, coalesce(category_small, '')) where unassigned_at is null
    do update set note = excluded.note, assigned_by = excluded.assigned_by, assigned_at = now();

    insert into public.user_access_audit_logs
      (target_profile_id, actor_profile_id, action_type, after_value, reason)
    values (target_profile_id, actor_id, 'category_assigned',
      jsonb_build_object('category_large', normalized_large, 'category_small', normalized_small), btrim(change_reason));
  else
    update public.buyer_category_assignments
       set unassigned_at = now(), note = btrim(change_reason)
     where profile_id = target_profile_id
       and category_large = normalized_large
       and category_small is not distinct from normalized_small
       and unassigned_at is null;
    if not found then
      raise exception '활성 담당 카테고리 배정을 찾을 수 없습니다.';
    end if;
    insert into public.user_access_audit_logs
      (target_profile_id, actor_profile_id, action_type, before_value, reason)
    values (target_profile_id, actor_id, 'category_removed',
      jsonb_build_object('category_large', normalized_large, 'category_small', normalized_small), btrim(change_reason));
  end if;
end;
$$;

grant execute on function public.set_buyer_category_assignment(uuid, text, text, boolean, text) to authenticated;
