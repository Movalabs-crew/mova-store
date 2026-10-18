# Supabase setup (Mova Store)

1. Create a project at [supabase.com](https://supabase.com).
2. Copy **Project URL** and **anon public** key into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Configure **Admin access** in `.env.local`:
   - Set `NEXT_PUBLIC_ADMIN_EMAILS` to your email (e.g. `NEXT_PUBLIC_ADMIN_EMAILS=admin@example.com`). Multiple emails can be comma-separated.
   - `AuthContext` reads this variable via `isAdminEmail` (`lib/env.ts`), and `components/AdminGuard.jsx` uses it to gate all `/admin` routes. If left unset, `isAdmin` defaults to `false` and authenticated users will be blocked with an "Access Denied" error when attempting to reach the admin catalog panel.
4. In the SQL editor, run [`schema.sql`](./schema.sql).
   - It must run top-to-bottom without error. To confirm the script actually reached the end, check that RLS is enabled on `products`:
     `select relrowsecurity from pg_class where relname = 'products';` → expected `true`.
     An empty result or `false` means the script aborted part-way and the `orders` table and policies were never created.
5. Auth → Providers: enable **Email** (and **Google** if you want OAuth).
6. Auth → URL Configuration: add `http://localhost:3000/**` (and your production URL).
7. Restart `npm run dev`.

Products live in the `products` table; images in the public `products` storage bucket.


## Orders: who may update or delete rows

`public.orders` is a payments table, so its write surface is intentionally narrow:

- `insert` — authenticated buyers create their own rows (see the insert policy in
  `schema.sql`).
- `update` / `delete` — **admin only**, granted explicitly through
  `public.is_admin()` (`"Admins can update orders"`, `"Admins can delete orders"`).

There is no permissive fallback: with RLS enabled and only those policies in place,
an `update` or `delete` by an unauthenticated or non-admin caller is denied by
default. A buyer's order status is authoritative once the Stellar payment has been
verified, so admin flows are the only sanctioned way to change it.

To grant admin rights, use the `public.admin_users` allowlist or the `is_admin`
JWT claim (`app_metadata.is_admin`) as described in [`../SECURITY.md`](../SECURITY.md).
## Orders: who may insert rows

Only an authenticated buyer may create an order row, and only for their own
`user_id`:

```sql
create policy "Users can insert own orders"
  on public.orders for insert
  to authenticated
  with check (auth.uid() = user_id and status = 'Pending');
```

Consequences to be aware of when changing the checkout flow:

- **No `anon` inserts.** A request carrying only the public anon key is rejected.
  Guest checkout must therefore not write to `orders` directly; it either signs the
  buyer in or keeps the order client-side until it is claimed.
- **No client-written status.** The insert policy pins `status` to `'Pending'`, so a
  forged `'Paid'` row cannot come from the browser. Advancing the status is a
  server/admin action performed *after* the payment is verified on-chain (see the
  admin update policy in `schema.sql`).
- **`total`** is still guarded by the column's `total >= 0` check, and the
  authoritative amount is the value paid to the checkout contract, not the value in
  the request body.
## admin_users: read access

`public.admin_users` is the privileged allowlist that `public.is_admin()` reads.
It is **not** world-readable and it is **not** readable by ordinary authenticated
users:

```sql
create policy "Admins can view admin_users"
  on public.admin_users for select
  to authenticated
  using (public.is_admin());
```

`public.is_admin()` is `security definer` and owned by the table owner, so it can
still read `admin_users` internally without recursing through this policy, and
admin-gated policies on `products`, `orders` and storage keep working.
