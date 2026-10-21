-- RLS policy tests for Mova Store (pgTAP)
--
-- Run against a database with the migrations applied:
--   supabase db exec --file supabase/tests/rls_policies.test.sql
--
-- The suite exercises the tables as three roles:
--   anon          -- public key only
--   buyer         -- authenticated, not admin
--   admin         -- authenticated + admin claim or allowlist
--
-- Every test runs inside a transaction that is rolled back at the end,
-- so the suite leaves the database unchanged.

begin;

create extension if not exists pgtap;

select plan(19);

-- ------------------------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------------------------

-- Switch to a role and set the JWT claims that auth.uid() / auth.email() /
-- auth.jwt() read. The settings are transaction-local and reset by the
-- corresponding reset role / set local cleanup in the caller.
create or replace function tests_set_role(role_name text, claims jsonb)
returns void
language plpgsql
as $$
begin
  perform set_config('validate_role_name', role_name);
  perform set_config('role', role_name);
  perform set_config('request.jwt.claims', claims::text);
end;
$$;

-- ------------------------------------------------------------------------------
-- Seed data (runs as the test owner, bypassing RLS)
-- ------------------------------------------------------------------------------

insert into public.admin_users (email)
values ('admin@movalabs.test');

-- ------------------------------------------------------------------------------
-- 1. Anonymous cannot insert an order
-- ------------------------------------------------------------------------------
select tests_set_role('anon', '{"role":"anon"}'::jsonb);

select throws_ok(
  $$ insert into public.orders (order_id, user_id, user_email, total, status)
     values ('anon-order', '00000000-0000-0000-0000-00000000000a',
             'buyer_a@movalabs.test', 10, 'Pending') $$,
  '42501',
  null,
  'anon cannot insert an order (no insert policy for anon)'
);

reset role;

-- -----------------------------------------------------------------------------
-- 2. Buyer can insert their own order as Pending
-- ------------------------------------------------------------------------------
select tests_set_role('authenticated',
  {"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000a","email":"buyer_a@movalabs.test"}::jsonb);

select lives_ok(
  $$ insert into public.orders (order_id, user_id, user_email, total, status)
     values ('buyer-a-order', '00000000-0000-0000-0000-00000000000a',
             'buyer_a@movalabs.test', 10, 'Pending') $$,
  'buyer can insert their own order with status Pending'
);

reset role;

-- -----------------------------------------------------------------------------
-- 3. Buyer cannot insert an order for another user (widened insert policy)
-- -----------------------------------------------------------------------------
select tests_set_role('authenticated',
  {"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000a","email":"buyer_a@movalabs.test"}::jsonb);

select throws_ok(
  $$ insert into public.orders (order_id, user_id, user_email, total, status)
     values ('forged-order', '00000000-0000-0000-0000-00000000000b',
             'buyer_b@movalabs.test', 10, 'Pending') $$,
  '42501',
  null,
  'buyer cannot insert an order for another user_id'
);

reset role;

-- ------------------------------------------------------------------------------
-- 4. Buyer cannot insert an order with a non-Pending status
-- -----------------------------------------------------------------------------
select tests_set_role('authenticated',
  {"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000a","email":"buyer_a@movalabs.test"}::jsonb);

select throws_ok(
  $$ insert into public.orders (order_id, user_id, user_email, total, status)
     values ('paid-order', '00000000-0000-0000-0000-00000000000a',
             'buyer_a@movalabs.test', 10, 'Paid') $$,
  '42501',
  null,
  'buyer cannot insert an order with status Paid'
);

reset role;

-- -----------------------------------------------------------------------------
-- 5. Buyer reads only their own orders
-- -----------------------------------------------------------------------------
-- Seed a second buyer's order as the service role (bypasses RLS).
select tests_set_role('service_role', '{"role":"service_role"}'::jsonb);
insert into public.orders (order_id, user_id, user_email, total, status)
values ('buyer-b-order', '00000000-0000-0000-0000-00000000000b',
        'buyer_b@movalabs.test', 20, 'Pending');
reset role;

select tests_set_role('authenticated',
  {"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000a","email":"buyer_a@movalabs.test"}::jsonb);

select results_eq(
  $$ select order_id from public.orders order by order_id $$,
  $$ values ('buyer-a-order') $$,
  'buyer sees only their own order'
);

reset role;

-- ------------------------------------------------------------------------------
-- 6. Buyer cannot read another buyer's order by id
-- -----------------------------------------------------------------------------
select tests_set_role('authenticated',
  {"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000a","email":"buyer_a@movalabs.test"}::jsonb);

select is_empty(
  $$ select 1 from public.orders where order_id = 'buyer-b-order' $$,
  'buyer cannot read another buyer''s order'
);

reset role;

-- -----------------------------------------------------------------------------
-- 7. Admin (allowlist) reads all orders
-- ------------------------------------------------------------------------------
select tests_set_role('authenticated',
  {"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000ad","email":"admin@movalabs.test"}::jsonb);

select results_eq(
  $$ select order_id from public.orders order by order_id $$,
  $$ values ('buyer-a-order'), ('buyer-b-order') $$,
  'admin (allowlist) sees every order'
);

reset role;

-- ------------------------------------------------------------------------------
-- 8. Admin (JWT claim) reads all orders
-- ------------------------------------------------------------------------------
select tests_set_role('authenticated',
  {"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000ac","email":"claim-admin@movalabs.test","app_metadata":{"is_admin":true}}::jsonb);

select results_eq(
  $$ select order_id from public.orders order by order_id $$,
  $$ values ('buyer-a-order'), ('buyer-b-order') $$,
  'admin (JWT claim) sees every order'
);

reset role;

-- -----------------------------------------------------------------------------
-- 9. Buyer cannot update their own order status
-- ------------------------------------------------------------------------------
select tests_set_role('authenticated',
  {"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000a","email":"buyer_a@movalabs.test"}::jsonb);

-- An UPDATE that matches no visible rows is a no-op, not an error. Assert that
-- the row is unchanged rather than expecting an exception.
update public.orders set status = 'Paid' where order_id = 'buyer-a-order';

reset role;

select is(
  (select status from public.orders where order_id = 'buyer-a-order'),
  'Pending',
  'buyer cannot change their own order status'
);

-- -----------------------------------------------------------------------------
-- 10. Admin can update an order status
-- -----------------------------------------------------------------------------
select tests_set_role('authenticated',
  {"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000ad","email":"admin@movalabs.test"}::jsonb);

update public.orders set status = 'Paid' where order_id = 'buyer-a-order';

reset role;

select is(
  (select status from public.orders where order_id = 'buyer-a-order'),
  'Paid',
  'admin can advance an order status'
);

-- -----------------------------------------------------------------------------
-- 11. Anonymous can read products (public read policy)
-- ------------------------------------------------------------------------------
select tests_set_role('anon', '{"role":"anon"}'::jsonb);

select lives_ok(
  $$ select 1 from public.products $$,
  'anon can read products (public read policy)'
);

reset role;

-- -----------------------------------------------------------------------------
-- 12. Anonymous cannot insert products
-- -----------------------------------------------------------------------------
select tests_set_role('anon', '{"role":"anon"}'::jsonb);

select throws_ok(
  $$ insert into public.products (name, price, img)
     values ('anon-product', 1, 'x.png') $$,
  '42501',
  null,
  'anon cannot insert a product'
);

reset role;

-- -----------------------------------------------------------------------------
-- 13. Buyer cannot insert products
-- ------------------------------------------------------------------------------
select tests_set_role('authenticated',
  {"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000a","email":"buyer_a@movalabs.test"}::jsonb);

select throws_ok(
  $$ insert into public.products (name, price, img)
     values ('buyer-product', 1, 'x.png') $$,
  '42501',
  null,
  'buyer cannot insert a product'
);

reset role;

-- ------------------------------------------------------------------------------
-- 14. Admin can insert a product
-- -----------------------------------------------------------------------------
select tests_set_role('authenticated',
  {"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000ad","email":"admin@movalabs.test"}::jsonb);

select lives_ok(
  $$ insert into public.products (name, price, img)
     values ('admin-product', 5, 'x.png') $$,
  'admin can insert a product'
);

reset role;

-- ------------------------------------------------------------------------------
-- 15. Buyer cannot update products
-- ------------------------------------------------------------------------------
select tests_set_role('authenticated',
  {"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000a","email":"buyer_a@movalabs.test"}::jsonb);

update public.products set price = 999 where name = 'admin-product';

reset role;

select is(
  (select price from public.products where name = 'admin-product'),
  5::numeric,
  'buyer cannot update a product'
);

-- -----------------------------------------------------------------------------
-- 16. Buyer cannot delete products
-- ------------------------------------------------------------------------------
select tests_set_role('authenticated',
  {"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000a","email":"buyer_a@movalabs.test"}::jsonb);

delete from public.products where name = 'admin-product';

reset role;

select is(
  (select count(*) from public.products where name = 'admin-product'),
  1::bigint,
  'buyer cannot delete a product'
);

-- -----------------------------------------------------------------------------
-- 17. Admin can update and delete products
-- ------------------------------------------------------------------------------
select tests_set_role('authenticated',
  {"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000ad","email":"admin@movalabs.test"}::jsonb);

update public.products set price = 7 where name = 'admin-product';

reset role;

select is(
  (select price from public.products where name = 'admin-product'),
  7::numeric,
  'admin can update a product'
);

select tests_set_role('authenticated',
  {"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000ad","email":"admin@movalabs.test"}::jsonb);

delete from public.products where name = 'admin-product';

reset role;

select is(
  (select count(*) from public.products where name = 'admin-product'),
  0::bigint,
  'admin can delete a product'
);

-- -----------------------------------------------------------------------------
-- 18. admin_users is not readable by anon or ordinary buyers
-- ------------------------------------------------------------------------------
select tests_set_role('anon', '{"role":"anon"}'::jsonb);

select is_empty(
  $$ select 1 from public.admin_users $$,
  'anon cannot read admin_users'
);

reset role;

select tests_set_role('authenticated',
  {"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000a","email":"buyer_a@movalabs.test"}::jsonb);

select is_empty(
  $$ select 1 from public.admin_users $$,
  'buyer cannot read admin_users'
);

reset role;

-- -----------------------------------------------------------------------------
-- 19. Admin can read admin_users
-- -----------------------------------------------------------------------------
select tests_set_role('authenticated',
  {"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000ad","email":"admin@movalabs.test"}::jsonb);

select results_eq(
  $$ select email from public.admin_users order by email $$,
  $$ values ('admin@movalabs.test') $$,
  'admin can read admin_users'
);

reset role;

select * from finish();

rollback;
