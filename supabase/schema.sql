-- Mova Store — Supabase schema
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

create index if not exists products_created_at_idx on public.products (created_at desc);

create index if not exists products_updated_at_idx on public.products (updated_at desc);

create or replace function set_updated_at()
returns trigger as ''
begin
  new.updated_at = now();
  return new;
end;'' language plpgsql;

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
create policy "Admins can view admin_users"
  on public.admin_users for select
  to authenticated
  using (
    lower((auth.jwt() ->> 'email')) = lower(email)
    or coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  );

-- Helper function: Evaluates true if the caller is an admin via JWT claims or admin_users table
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select
    coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
    or exists (
      select 1 from public.admin_users
      where lower(email) = lower(auth.jwt() ->> 'email')
    );
$$;

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
  items jsonb default '[]'::jsonb,
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

-- Authenticated users or guest checkout can create order records
drop policy if exists "Users can insert orders" on public.orders;
create policy "Users can insert orders"
  on public.orders for insert
  to authenticated, anon
  with check (true);

