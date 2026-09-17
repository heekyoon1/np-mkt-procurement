-- NP MKT 운영화 1단계: Supabase 기본 스키마
-- 원본 Excel은 storage/imports에 보관하고, 분석 가능한 행은 아래 테이블로 적재합니다.

create extension if not exists pgcrypto;

create type public.app_role as enum ('requester', 'lead', 'buyer', 'admin');
create type public.po_number_status as enum ('valid', 'missing', 'corrected', 'duplicate');
create type public.payment_status as enum ('인수증 발행', '인수증 승인', '인보이스 발행', '인보이스 승인', 'AP 전표 완료');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role public.app_role not null default 'requester',
  organization_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_size bigint not null check (file_size <= 10485760),
  source_sheet text not null default 'CD집계표(Total)',
  uploaded_by uuid references public.profiles(id),
  uploaded_at timestamptz not null default now(),
  status text not null default 'applied' check (status in ('validating', 'failed', 'preview', 'applied')),
  total_rows integer not null default 0,
  new_rows integer not null default 0,
  updated_rows integer not null default 0,
  warning_rows integer not null default 0,
  missing_columns text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null unique,
  business_number text,
  contact_name text,
  contact_email text,
  contact_phone text,
  maintenance_capability text not null default 'unknown' check (maintenance_capability in ('yes', 'no', 'unknown')),
  is_new_supplier boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.supplier_aliases (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  alias_name text not null unique,
  source text not null default 'manual',
  confirmed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text,
  po_number_status public.po_number_status not null default 'valid',
  tax_invoice_date date,
  inspection_date date,
  order_date date,
  requested_delivery_date date,
  source_status text,
  purchase_purpose text,
  buyer_name text,
  organization_name text,
  requester_name text,
  customer_name text,
  source_request_number text,
  fiscal_year text,
  fiscal_month smallint check (fiscal_month between 1 and 12),
  latest_import_batch_id uuid not null references public.import_batches(id),
  source_row_number integer,
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index purchase_orders_po_number_unique
  on public.purchase_orders(po_number) where po_number is not null and btrim(po_number) <> '';
create index purchase_orders_tax_invoice_date_idx on public.purchase_orders(tax_invoice_date);
create index purchase_orders_buyer_idx on public.purchase_orders(buyer_name);

create table public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  category_large text,
  category_small text,
  manufacturer_name text,
  model_name text,
  normalized_model_name text,
  specification text,
  unit text,
  quantity numeric,
  unit_price numeric,
  purchase_amount numeric,
  calculated_amount numeric generated always as (coalesce(quantity, 0) * coalesce(unit_price, 0)) stored,
  amount_difference numeric generated always as (coalesce(purchase_amount, 0) - coalesce(quantity, 0) * coalesce(unit_price, 0)) stored,
  supplier_id uuid references public.suppliers(id),
  source_supplier_name text,
  source_row_number integer not null,
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index purchase_order_items_model_idx on public.purchase_order_items(normalized_model_name);
create index purchase_order_items_category_idx on public.purchase_order_items(category_large, category_small);

create table public.cost_downs (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null unique references public.purchase_order_items(id) on delete cascade,
  cost_down_unit_amount numeric,
  cost_down_amount numeric,
  cost_down_rate numeric,
  source_payload jsonb not null default '{}'::jsonb
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  po_number text,
  contract_id text not null unique,
  supplier_id uuid references public.suppliers(id),
  product text,
  contract_type text,
  end_date date,
  billing_cycle text,
  currency text not null default 'KRW' check (currency in ('KRW', 'USD', 'EUR', 'JPY', 'CNY')),
  exchange_rate numeric,
  amount numeric,
  buyer_name text,
  source_payload jsonb not null default '{}'::jsonb,
  source_file_name text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.payment_targets (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  payment_month date not null,
  amount numeric,
  payment_status public.payment_status not null default '인수증 발행',
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  unique (contract_id, payment_month)
);

create table public.payment_status_history (
  id uuid primary key default gen_random_uuid(),
  payment_target_id uuid not null references public.payment_targets(id) on delete cascade,
  before_status text,
  after_status public.payment_status not null,
  changed_by uuid references public.profiles(id),
  changed_at timestamptz not null default now(),
  detail text not null default 'Ariba 연계 상태 변경'
);

create or replace function public.is_np_mkt_staff()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('lead', 'buyer', 'admin') and p.is_active); $$;

alter table public.profiles enable row level security;
alter table public.import_batches enable row level security;
alter table public.suppliers enable row level security;
alter table public.supplier_aliases enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.cost_downs enable row level security;
alter table public.contracts enable row level security;
alter table public.payment_targets enable row level security;
alter table public.payment_status_history enable row level security;

create policy profiles_read_authenticated on public.profiles for select to authenticated using (true);
create policy staff_manage_imports on public.import_batches for all to authenticated using (public.is_np_mkt_staff()) with check (public.is_np_mkt_staff());
create policy authenticated_read_core on public.suppliers for select to authenticated using (true);
create policy staff_manage_suppliers on public.suppliers for all to authenticated using (public.is_np_mkt_staff()) with check (public.is_np_mkt_staff());
create policy authenticated_read_aliases on public.supplier_aliases for select to authenticated using (true);
create policy staff_manage_aliases on public.supplier_aliases for all to authenticated using (public.is_np_mkt_staff()) with check (public.is_np_mkt_staff());
create policy authenticated_read_purchases on public.purchase_orders for select to authenticated using (true);
create policy staff_manage_purchases on public.purchase_orders for all to authenticated using (public.is_np_mkt_staff()) with check (public.is_np_mkt_staff());
create policy authenticated_read_items on public.purchase_order_items for select to authenticated using (true);
create policy staff_manage_items on public.purchase_order_items for all to authenticated using (public.is_np_mkt_staff()) with check (public.is_np_mkt_staff());
create policy authenticated_read_cost_downs on public.cost_downs for select to authenticated using (true);
create policy staff_manage_cost_downs on public.cost_downs for all to authenticated using (public.is_np_mkt_staff()) with check (public.is_np_mkt_staff());
create policy authenticated_read_contracts on public.contracts for select to authenticated using (true);
create policy staff_manage_contracts on public.contracts for all to authenticated using (public.is_np_mkt_staff()) with check (public.is_np_mkt_staff());
create policy authenticated_read_payments on public.payment_targets for select to authenticated using (true);
create policy buyer_update_payment_status on public.payment_targets for update to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'buyer' and p.is_active)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'buyer' and p.is_active));
create policy authenticated_read_payment_history on public.payment_status_history for select to authenticated using (true);
create policy buyer_insert_payment_history on public.payment_status_history for insert to authenticated with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'buyer' and p.is_active));

-- 세금계산서 날짜 기준 FY: 4월~다음해 3월을 하나의 FY로 계산합니다.
create or replace function public.set_purchase_fiscal_period()
returns trigger language plpgsql as $$
begin
  if new.tax_invoice_date is null then
    new.fiscal_year := null;
    new.fiscal_month := null;
  else
    new.fiscal_year := 'FY' || right((case when extract(month from new.tax_invoice_date) >= 4 then extract(year from new.tax_invoice_date) else extract(year from new.tax_invoice_date) - 1 end)::text, 2);
    new.fiscal_month := ((extract(month from new.tax_invoice_date)::int - 4 + 12) % 12) + 1;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger purchase_fiscal_period_trigger
before insert or update of tax_invoice_date on public.purchase_orders
for each row execute function public.set_purchase_fiscal_period();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
create trigger suppliers_touch_updated_at before update on public.suppliers for each row execute function public.touch_updated_at();
create trigger contracts_touch_updated_at before update on public.contracts for each row execute function public.touch_updated_at();
create trigger payments_touch_updated_at before update on public.payment_targets for each row execute function public.touch_updated_at();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  main_category text,
  category_large text not null,
  category_small text,
  normalized_name text,
  is_active boolean not null default true,
  unique (category_large, category_small)
);

create table public.buyer_category_mappings (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id),
  priority integer not null default 1,
  is_primary boolean not null default false,
  mapping_status text not null default 'active' check (mapping_status in ('active', 'buyer_decision_required', 'inactive')),
  valid_from date,
  valid_to date,
  unique (category_id, buyer_id)
);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid references public.purchase_orders(id) on delete cascade,
  po_number text,
  delivery_place text,
  item_code text,
  quantity numeric,
  unit_price numeric,
  amount numeric,
  serial_number text,
  received_date date,
  shipment_status text not null default '출고대기' check (shipment_status in ('발주완료', '출고대기', '쉽컴펌 완료')),
  source_payload jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.mail_drafts (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid references public.purchase_orders(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  recipient text,
  cc text,
  subject text not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'copied', 'sent')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.search_logs (
  id uuid primary key default gen_random_uuid(),
  query_text text not null,
  result_count integer not null default 0,
  answer_text text,
  filters jsonb not null default '{}'::jsonb,
  evidence_snapshot jsonb not null default '[]'::jsonb,
  searched_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid references public.import_batches(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint not null check (file_size <= 10485760),
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;
alter table public.buyer_category_mappings enable row level security;
alter table public.shipments enable row level security;
alter table public.mail_drafts enable row level security;
alter table public.search_logs enable row level security;
alter table public.attachments enable row level security;

create policy authenticated_read_categories on public.categories for select to authenticated using (true);
create policy staff_manage_categories on public.categories for all to authenticated using (public.is_np_mkt_staff()) with check (public.is_np_mkt_staff());
create policy authenticated_read_mappings on public.buyer_category_mappings for select to authenticated using (true);
create policy staff_manage_mappings on public.buyer_category_mappings for all to authenticated using (public.is_np_mkt_staff()) with check (public.is_np_mkt_staff());
create policy authenticated_read_shipments on public.shipments for select to authenticated using (true);
create policy staff_manage_shipments on public.shipments for all to authenticated using (public.is_np_mkt_staff()) with check (public.is_np_mkt_staff());
create policy authenticated_read_mail_drafts on public.mail_drafts for select to authenticated using (true);
create policy staff_manage_mail_drafts on public.mail_drafts for all to authenticated using (public.is_np_mkt_staff()) with check (public.is_np_mkt_staff());
create policy authenticated_read_search_logs on public.search_logs for select to authenticated using (true);
create policy authenticated_insert_search_logs on public.search_logs for insert to authenticated with check (searched_by = auth.uid());
create policy staff_read_attachments on public.attachments for select to authenticated using (public.is_np_mkt_staff());
create policy staff_manage_attachments on public.attachments for all to authenticated using (public.is_np_mkt_staff()) with check (public.is_np_mkt_staff());

create trigger shipments_touch_updated_at before update on public.shipments for each row execute function public.touch_updated_at();
create trigger mail_drafts_touch_updated_at before update on public.mail_drafts for each row execute function public.touch_updated_at();

-- 원본 파일은 비공개 Storage 버킷에 보관합니다. 실제 파일 업로드는 다음 CRUD 연결 단계에서 수행합니다.
insert into storage.buckets (id, name, public) values ('np-mkt-imports', 'np-mkt-imports', false) on conflict (id) do nothing;
create policy np_mkt_imports_read on storage.objects for select to authenticated using (bucket_id = 'np-mkt-imports' and public.is_np_mkt_staff());
create policy np_mkt_imports_write on storage.objects for insert to authenticated with check (bucket_id = 'np-mkt-imports' and public.is_np_mkt_staff());

-- Supabase Auth 가입 시 업무 프로필을 자동 생성합니다.
-- 기본 권한은 요청자이며, Buyer·팀장·관리자 권한은 관리자가 별도로 부여합니다.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    'requester'
  )
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
