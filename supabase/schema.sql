- Mova Store — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query)

-- Products catalog
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(12, 2) not null check (price >= 0),
  img text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_created_at_idxon public.products (created_at desc);

create index if not exists products_updated_at_idxon public.products (updated_at desc);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;$$ language plsql;

drop trigger if exists products_updated_at_trigger on public.products;
create trigger products_updated_at_trigger
  before update on public.products
  for each row execute function set_updated_at();

-- Admin users table: Server-side list of admin emails authorized for product mutations
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "Admins can view admin_users" on public.admin_users;
-- The replacement policy is created after public.is_admin() is defined below,
-- because a policy expression may only reference a function that already exists.

-- Helper function: Evaluates true if the caller is an admin via JWT claims or admin_users table
--
-- `security definer` runs with the owner's privileges, so the body's names must
-- not resolve through a caller-influenced `search_path`: an attacker who can
-- create objects could otherwise shadow `admin_users`. `set search_path = ''`
-- pins resolution to schema-qualified names only; `pg_catalog` is still searched
-- implicitly, so built-ins such as `lower`/`coalesce` keep working. This clears
-- Supabase's `function_search_path_mutable` lint.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
    or exists (
      select 1 from public.admin_users
      where lower(email) = lower(auth.jwt() ->> 'email')
    );
$$;

-- Only the roles whose RLS policies call is_admin() need EXECUTE on it. Dropping
-- the implicit PUBLIC grant keeps `anon` from invoking a SECURITY DEFINER
-- function it never needs (every policy that calls it is `to authenticated`).
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to service_role;

-- admin_users backs is_admin() and holds the privileged allowlist. Only admins
-- may read it: anon and ordinary authenticated users get no rows, so the list of
-- privileged addresses is not world-readable. is_admin() is SECURITY DEFINER and
-- owned by the table owner, which bypasses RLS on this table, so evaluating the
-- policy does not recurse.
create policy "Admins can view admin_users"
  on public.admin_users for select
  to authenticated
  using (public.is_admin());

-- Products Row Level Security:
-- Public can read products; only admins can insert, update, or delete products.
alter table public.products enable row level security;

drop policy if exists "Public can read products" on public.products;
create policy "Public can read products"
  on public.products for select
  using (true);

drop policy if exists "Authenticated users can insert products" on public.products;
drop policy if exists "Admins can insert products" on public.products;
create policy "Admins can insert products"
  on public.products for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Authenticated users can update products" on public.products;
drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products"
  on public.products for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Authenticated users can delete products" on public.products;
drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products"
  on public.products for delete
  to authenticated
  using (public.is_admin());

-- Storage bucket for product images (create via Dashboard → Storage if needed)
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do update set public = true;

-- Storage Objects Policies:
-- Public can view images; only admins can upload, update, or delete product images.
drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
  on storage.objects for select
  using (bucket_id = 'products');

drop policy if exists "Authenticated can upload product images" on storage.objects;
drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'products' and public.is_admin());

drop policy if exists "Authenticated can update product images" on storage.objects;
drop policy if exists "Admins can update product images" on storage.objects;
create policy "Admins can update product images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'products' and public.is_admin())
  with check (bucket_id = 'products' and public.is_admin());

drop policy if exists "Authenticated can delete product images" on storage.objects;
drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'products' and public.is_admin());

-- Orders table (tracks buyer purchases and Stellar payments)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique,
  user_id uuid references auth.users(id),
  user_email text,
  total numeric(12, 2) not null check (total >= 0),
  status text not null default 'Paid' check (status in ('Pending', 'Paid', 'Shipped', 'Refunded', 'Completed')),
  payment_method text not null default 'stellar' check (payment_method in ('stellar', 'card')),
  token_symbol text default 'USDC',
  token_amount numeric(18, 7),
  tx_hash text,
  items text default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_user_email_idx on public.orders (user_email);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

alter table public.orders enable row level security;

-- Users can view their own orders; admins can view all orders
drop policy if exists "Users can read own orders" on public.orders;
create policy "Users can read own orders"
  on public.orders for select
  to authenticated
  using (auth.uid() = user_id or auth.email() = user_email);

-- Orders Row Level Security (insert):
-- Only authenticated buyers may create order rows, and only for themselves.
-- The `anon` role is deliberately excluded: holding the public anon key must not
-- be enough to forge an order for an arbitrary user_id / user_email.
--
-- New rows must also start as 'Pending'. A browser can therefore never write a
-- 'Paid' / 'Shipped' / 'Refunded' / 'Completed' row: payment is verified
-- server-side (against the on-chain transaction) before the status is advanced.
drop policy if exists "Users can insert orders" on public.orders;
drop policy if exists "Users can insert own orders" on public.orders;
create policy "Users can insert own orders"
  on public.orders for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and status = 'Pending'
  );


-- Orders Row Level Security (update / delete):
-- These writes are deliberately admin-only. A buyer can never change the status
-- of their own order from the browser; that would let an unpaid order be marked
-- 'Paid'. With RLS on and no permissive policy for other roles, update and
-- delete are denied by default for everyone else.
drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can update orders"
  on public.orders for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete orders" on public.orders;
create policy "Admins can delete orders"
  on public.orders for delete
  to authenticated
  using (public.is_admin());

-- Orders Row Level Security (insert) — server-side payment verification:
-- The chain is the source of truth for payment state. Order rows are written
-- from a server route that verifies the transaction / event against the checkout
-- contract before recording anything. To make that guarantee hold at the database
-- layer, the browser roles (anon and authenticated) are explicitly denied the
-- ability to insert orders. Only the server role (service_role), which bypasses
-- RLS and is only available to the backend, can write order rows. With RLS enabled
-- and no permissive insert policy for anon/authenticated, a browser client cannot
-- record an order without a verifiable on-chain payment.
drop policy if exists "Users can insert own orders" on public.orders;
drop policy if exists "Users can insert orders" on public.orders;
drop policy if exists "Admins can insert orders" on public.orders;
