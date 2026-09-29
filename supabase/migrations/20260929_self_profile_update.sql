-- 사용자 본인 프로필 수정: 이름·부서·연락처만 허용합니다.
-- 역할, 활성 상태, AD 연동 정보는 사용자 권한 관리 기능에서만 변경됩니다.

create or replace function public.update_my_profile(
  next_name text,
  next_department text,
  next_phone text
)
returns setof public.profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;
  if nullif(btrim(next_name), '') is null
    or nullif(btrim(next_department), '') is null
    or nullif(btrim(next_phone), '') is null then
    raise exception '이름·부서·연락처를 모두 입력해 주세요.';
  end if;

  return query
  update public.profiles
     set name = btrim(next_name),
         department = btrim(next_department),
         phone = btrim(next_phone)
   where id = auth.uid()
     and is_active = true
  returning *;

  if not found then
    raise exception '활성 사용자 프로필을 찾을 수 없습니다.';
  end if;
end;
$$;

grant execute on function public.update_my_profile(text, text, text) to authenticated;
