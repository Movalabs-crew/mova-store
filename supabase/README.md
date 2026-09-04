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
