-- 모든 브라우저가 동일한 업무 데이터를 조회하도록 하는 공용 작업공간입니다.
-- 기존 화면의 상태 구조를 우선 그대로 보관하며, 이후 요청·계약 단위 테이블로 점진 분리합니다.

create table if not exists public.app_shared_state (
  id text primary key default 'workspace' check (id = 'workspace'),
  state jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

alter table public.app_shared_state enable row level security;

create or replace function public.is_active_app_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active
  );
$$;

drop policy if exists shared_state_read_active_user on public.app_shared_state;
create policy shared_state_read_active_user
  on public.app_shared_state
  for select
  to authenticated
  using (public.is_active_app_user());

-- 클라이언트는 테이블을 직접 갱신하지 않고 아래 RPC만 호출합니다.
-- expected_version이 일치할 때만 저장해 다른 PC의 최신 내용을 조용히 덮어쓰지 않습니다.
create or replace function public.save_shared_workspace_state(
  next_state jsonb,
  expected_version bigint default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_row public.app_shared_state%rowtype;
begin
  if not public.is_active_app_user() then
    raise exception '활성화된 사용자만 공용 데이터를 저장할 수 있습니다.';
  end if;

  select * into saved_row from public.app_shared_state where id = 'workspace';
  if not found then
    if expected_version <> 0 then return null; end if;
    insert into public.app_shared_state (id, state, version, updated_by, updated_at)
    values ('workspace', coalesce(next_state, '{}'::jsonb), 1, auth.uid(), now())
    returning * into saved_row;
  else
    update public.app_shared_state
      set state = coalesce(next_state, '{}'::jsonb),
          version = saved_row.version + 1,
          updated_by = auth.uid(),
          updated_at = now()
      where id = 'workspace' and version = expected_version
      returning * into saved_row;
    if not found then return null; end if;
  end if;

  return jsonb_build_object('version', saved_row.version, 'updated_at', saved_row.updated_at);
end;
$$;

revoke all on table public.app_shared_state from anon, authenticated;
grant select on table public.app_shared_state to authenticated;
grant execute on function public.save_shared_workspace_state(jsonb, bigint) to authenticated;
