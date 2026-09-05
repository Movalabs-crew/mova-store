# Supabase setup (Mova Store)

1. Create a project at [supabase.com](https://supabase.com).
2. Copy **Project URL** and **anon public** key into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Configure **Admin access** in `.env.local`:
   - Set `NEXT_PUBLIC_ADMIN_EMAILS` to your email (e.g. `NEXT_PUBLIC_ADMIN_EMAILS=admin@example.com`). Multiple emails can be comma-separated.
   - `AuthContext` reads this variable via `isAdminEmail` (`lib/env.ts`), and `components/AdminGuard.jsx` uses it to gate all `/admin` routes. If left unset, `isAdmin` defaults to `false` and authenticated users will be blocked with an "Access Denied" error when attempting to reach the admin catalog panel.
4. In the SQL editor, run [`schema.sql`](./schema.sql).
5. Auth → Providers: enable **Email** (and **Google** if you want OAuth).
6. Auth → URL Configuration: add `http://localhost:3000/**` (and your production URL).
7. Restart `npm run dev`.

Products live in the `products` table; images in the public `products` storage bucket.

---

### Admin Privileges and Row Level Security (RLS)

The database enforces strict Row Level Security (RLS) via the `public.is_admin()` security definer function:
- **Public access**: Unauthenticated (anon) users can read products (`select`) and view public product images in storage.
- **Admin write access**: Only authenticated users recognized as admins can insert, update, or delete rows in the `products` table, or upload, update, or delete objects in the `products` storage bucket. Authenticated non-admins receive RLS permission violations if attempting direct mutations.

To authorize an admin in Supabase to match your `NEXT_PUBLIC_ADMIN_EMAILS`, configure one of the following methods:

#### Method 1: `public.admin_users` table (Recommended)
Add the administrator's email to `public.admin_users`:

```sql
insert into public.admin_users (email)
values ('admin@example.com')
on conflict (email) do nothing;
```

#### Method 2: Custom JWT claim (`is_admin: true` in `app_metadata`)
Assign `is_admin: true` to the user's `app_metadata` in Supabase Auth:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"is_admin": true}'::jsonb
where email = 'admin@example.com';
```

Or via the Supabase Dashboard / Admin API:
```javascript
await supabase.auth.admin.updateUserById(userId, {
  app_metadata: { is_admin: true }
});
```
