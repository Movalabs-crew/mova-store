# Supabase setup (Mova Store)

1. Create a project at [supabase.com](https://supabase.com).
2. Copy **Project URL** and **anon public** key into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. In the SQL editor, run [`schema.sql`](./schema.sql).
4. Auth → Providers: enable **Email** (and **Google** if you want OAuth).
5. Auth → URL Configuration: add `http://localhost:3000/**` (and your production URL).
6. Restart `npm run dev`.

Products live in the `products` table; images in the public `products` storage bucket.
