-- ============================================================
-- FILE: supabase/migrations/20260820_product_scanner.sql
-- PURPOSE:
--   Product scanner sessions, image metadata, audit records,
--   inventory ledger foundation, RLS and private Storage.
-- ============================================================

create extension if not exists pgcrypto;


-- ============================================================
-- 1. SCANNER SESSIONS
-- ============================================================

create table if not exists public.product_scanner_sessions (
  id uuid primary key default gen_random_uuid(),

  created_by uuid not null
    references auth.users(id)
    on delete cascade,

  tenant_id uuid null,
  branch_id uuid null,

  status text not null default 'open'
    check (
      status in (
        'open',
        'paired',
        'processing',
        'completed',
        'expired',
        'cancelled'
      )
    ),

  pairing_token_hash text,
  pairing_expires_at timestamptz,

  created_at timestamptz not null default now(),
  paired_at timestamptz,
  completed_at timestamptz,

  expires_at timestamptz not null
    default (now() + interval '15 minutes')
);


create unique index if not exists
product_scanner_sessions_pairing_hash_idx
on public.product_scanner_sessions(pairing_token_hash)
where pairing_token_hash is not null;


create index if not exists
product_scanner_sessions_created_by_idx
on public.product_scanner_sessions(
  created_by,
  created_at desc
);


create index if not exists
product_scanner_sessions_expiry_idx
on public.product_scanner_sessions(expires_at)
where status in (
  'open',
  'paired',
  'processing'
);


-- ============================================================
-- 2. SCANNER IMAGES
-- ============================================================

create table if not exists public.product_scanner_images (
  id uuid primary key default gen_random_uuid(),

  session_id uuid not null
    references public.product_scanner_sessions(id)
    on delete cascade,

  uploaded_by uuid not null
    references auth.users(id)
    on delete cascade,

  side text not null,

  storage_path text not null,

  mime_type text not null,

  byte_size bigint not null
    check (
      byte_size > 0
      and byte_size <= 10485760
    ),

  sha256 text,

  width integer,
  height integer,

  created_at timestamptz not null default now()
);


create index if not exists
product_scanner_images_session_idx
on public.product_scanner_images(
  session_id,
  created_at
);


-- ============================================================
-- 3. SCANNER COMMIT AUDIT
-- ============================================================

create table if not exists public.product_scanner_commits (
  id uuid primary key default gen_random_uuid(),

  session_id uuid not null
    references public.product_scanner_sessions(id)
    on delete restrict,

  committed_by uuid not null
    references auth.users(id)
    on delete restrict,

  operation text not null
    check (
      operation in (
        'create',
        'merge'
      )
    ),

  product_id text,

  publish_requested boolean not null default false,

  plan jsonb not null,

  created_at timestamptz not null default now()
);


create index if not exists
product_scanner_commits_product_idx
on public.product_scanner_commits(
  product_id,
  created_at desc
);


-- ============================================================
-- 4. INVENTORY LEDGER
-- ============================================================

create table if not exists public.inventory_ledger (
  id uuid primary key default gen_random_uuid(),

  product_id text not null,

  tenant_id uuid null,

  branch_id uuid null,

  event_type text not null
    check (
      event_type in (
        'receipt',
        'sale',
        'return',
        'adjustment',
        'transfer_in',
        'transfer_out',
        'opening_balance'
      )
    ),

  quantity numeric(14,3) not null,

  reference_type text,

  reference_id text,

  reason text,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null default now()
);


create index if not exists
inventory_ledger_product_idx
on public.inventory_ledger(
  product_id,
  created_at desc
);


-- ============================================================
-- 5. PRIVATE STORAGE BUCKET
-- ============================================================

insert into storage.buckets (
  id,
  name,
  public
)
values (
  'product-scanner',
  'product-scanner',
  false
)
on conflict (id)
do update
set public = false;


-- ============================================================
-- 6. ENABLE RLS
-- ============================================================

alter table public.product_scanner_sessions
enable row level security;

alter table public.product_scanner_images
enable row level security;

alter table public.product_scanner_commits
enable row level security;

alter table public.inventory_ledger
enable row level security;


-- ============================================================
-- 7. SESSION RLS
-- ============================================================

drop policy if exists
"scanner_sessions_select_owner"
on public.product_scanner_sessions;

create policy
"scanner_sessions_select_owner"
on public.product_scanner_sessions
for select
to authenticated
using (
  created_by = auth.uid()
);


drop policy if exists
"scanner_sessions_insert_owner"
on public.product_scanner_sessions;

create policy
"scanner_sessions_insert_owner"
on public.product_scanner_sessions
for insert
to authenticated
with check (
  created_by = auth.uid()
);


drop policy if exists
"scanner_sessions_update_owner"
on public.product_scanner_sessions;

create policy
"scanner_sessions_update_owner"
on public.product_scanner_sessions
for update
to authenticated
using (
  created_by = auth.uid()
)
with check (
  created_by = auth.uid()
);


-- ============================================================
-- 8. IMAGE RLS
-- ============================================================

drop policy if exists
"scanner_images_select_owner"
on public.product_scanner_images;

create policy
"scanner_images_select_owner"
on public.product_scanner_images
for select
to authenticated
using (
  uploaded_by = auth.uid()

  or exists (
    select 1
    from public.product_scanner_sessions s
    where s.id = session_id
      and s.created_by = auth.uid()
  )
);


drop policy if exists
"scanner_images_insert_owner"
on public.product_scanner_images;

create policy
"scanner_images_insert_owner"
on public.product_scanner_images
for insert
to authenticated
with check (
  uploaded_by = auth.uid()

  and exists (
    select 1
    from public.product_scanner_sessions s
    where s.id = session_id
      and s.created_by = auth.uid()
      and s.status in (
        'open',
        'paired',
        'processing'
      )
      and s.expires_at > now()
  )
);


-- ============================================================
-- 9. COMMIT RLS
-- ============================================================

drop policy if exists
"scanner_commits_select_owner"
on public.product_scanner_commits;

create policy
"scanner_commits_select_owner"
on public.product_scanner_commits
for select
to authenticated
using (
  committed_by = auth.uid()

  or exists (
    select 1
    from public.product_scanner_sessions s
    where s.id = session_id
      and s.created_by = auth.uid()
  )
);


-- IMPORTANT:
-- There is intentionally NO direct client INSERT policy
-- for product_scanner_commits.
--
-- Commits should be created by the server after:
-- authentication
-- tenant authorization
-- RBAC checks
-- product validation
-- pricing authorization
-- publication authorization


-- ============================================================
-- 10. INVENTORY RLS
-- ============================================================

drop policy if exists
"inventory_ledger_select_authenticated"
on public.inventory_ledger;

create policy
"inventory_ledger_select_authenticated"
on public.inventory_ledger
for select
to authenticated
using (
  created_by = auth.uid()
);


-- IMPORTANT:
-- No client INSERT policy.
--
-- Inventory must be changed only through:
--
-- receiving
-- sales
-- returns
-- adjustments
-- transfers
--
-- The AI scanner must NEVER directly modify stock.


-- ============================================================
-- 11. STORAGE POLICIES
-- ============================================================

drop policy if exists
"scanner_storage_select_owner"
on storage.objects;

create policy
"scanner_storage_select_owner"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'product-scanner'

  and (storage.foldername(name))[1] = 'scanner'

  and (storage.foldername(name))[2] =
      auth.uid()::text
);


drop policy if exists
"scanner_storage_insert_owner"
on storage.objects;

create policy
"scanner_storage_insert_owner"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-scanner'

  and (storage.foldername(name))[1] = 'scanner'

  and (storage.foldername(name))[2] =
      auth.uid()::text
);


drop policy if exists
"scanner_storage_delete_owner"
on storage.objects;

create policy
"scanner_storage_delete_owner"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-scanner'

  and (storage.foldername(name))[1] = 'scanner'

  and (storage.foldername(name))[2] =
      auth.uid()::text
);


-- ============================================================
-- 12. EXPIRE OLD SESSIONS
-- ============================================================

create or replace function
public.expire_product_scanner_sessions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin

  update public.product_scanner_sessions

  set status = 'expired'

  where status in (
    'open',
    'paired',
    'processing'
  )

  and expires_at <= now();

  get diagnostics affected = row_count;

  return affected;

end;
$$;


revoke all
on function public.expire_product_scanner_sessions()
from public;


grant execute
on function public.expire_product_scanner_sessions()
to service_role;
