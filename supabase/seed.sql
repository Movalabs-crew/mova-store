-- Mova Store — Sample Products Seed Data
-- Run this after schema.sql in Supabase SQL Editor (Dashboard → SQL → New query)
-- Idempotent: safe to run multiple times without duplicate key errors

insert into public.products (id, name, price, img, created_at)
values
  (
    'a0000000-0000-0000-0000-000000000001',
    'Velocity Runner Nitro',
    129.99,
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80',
    now() - interval '5 days'
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'Cloud Stratus Pulse',
    145.00,
    'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?auto=format&fit=crop&w=600&q=80',
    now() - interval '4 days'
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'Aero Trail Pro',
    160.50,
    'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=600&q=80',
    now() - interval '3 days'
  ),
  (
    'a0000000-0000-0000-0000-000000000004',
    'Urban Glide Classic',
    95.00,
    'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=600&q=80',
    now() - interval '2 days'
  ),
  (
    'a0000000-0000-0000-0000-000000000005',
    'Stellar Echo High-Top',
    179.99,
    'https://images.unsplash.com/photo-1575537302964-96cd47c06b1b?auto=format&fit=crop&w=600&q=80',
    now() - interval '1 day'
  )
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  img = excluded.img;
