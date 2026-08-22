-- Mova Store — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query)

-- Admin allowlist (#5): single source of truth for who may write catalog data.
-- Keep this list in sync with NEXT_PUBLIC_ADMIN_EMAILS (see README "Marking
-- admins"). RLS cannot read env vars, so the DB needs its own copy.
--
-- No policies on this table: clients get 0 rows via default deny; only the
-- SQL editor / service role manages it.
create table if not exists public.admin_emails (
  email text primary key
);

alter table public.admin_emails enable row level security;

-- SECURITY DEFINER so the check works while admin_emails itself is invisible
-- to clients. STABLE: safe inside policy expressions. search_path pinned:
-- prevents function-name hijacking through caller-set search_path.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_emails
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Products catalog
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(12, 2) not null check (price >= 0),
  img text not null,
  created_at timestamptz not null default now()
);

create index if not exists products_created_at_idx on public.products (created_at desc);

-- Public read; admin-only writes (#5)
alter table public.products enable row level security;

drop policy if exists "Public can read products" on public.products;
create policy "Public can read products"
  on public.products for select
  using (true);

drop policy if exists "Admins can insert products" on public.products;
create policy "Admins can insert products"
  on public.products for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products"
  on public.products for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products"
  on public.products for delete
  to authenticated
  using (public.is_admin());

-- Storage bucket for product images (create via Dashboard → Storage if needed)
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
  on storage.objects for select
  using (bucket_id = 'products');

drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'products' and public.is_admin());

drop policy if exists "Admins can update product images" on storage.objects;
create policy "Admins can update product images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'products' and public.is_admin());

drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'products' and public.is_admin());
