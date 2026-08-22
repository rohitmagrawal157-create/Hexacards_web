-- HexaCards — Super Admin Categories + Products
-- Run this in Supabase: SQL Editor → New query → Run

create extension if not exists "pgcrypto";

-- ── Categories (super-admin product sections) ───────────────────────────────
create table if not exists public.categories (
  id text primary key,
  title text not null,
  subtitle text not null default '',
  image_src text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Products ────────────────────────────────────────────────────────────────
create table if not exists public.products (
  id text primary key,
  category_id text references public.categories (id) on delete set null,
  category text not null default 'General',
  title text not null,
  short_title text not null,
  description text not null default '',
  price numeric(12, 2) not null default 0,
  compare_at_price numeric(12, 2) not null default 0,
  media jsonb not null default '[]'::jsonb,
  highlights jsonb not null default '[]'::jsonb,
  finishes jsonb not null default '[]'::jsonb,
  included jsonb not null default '[]'::jsonb,
  cta_label text not null default 'Order Now',
  cta_href text not null default '',
  designable boolean not null default false,
  image_src text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_id_idx on public.products (category_id);
create index if not exists products_sort_order_idx on public.products (sort_order);
create index if not exists categories_sort_order_idx on public.categories (sort_order);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- Seed default categories (safe to re-run)
insert into public.categories (id, title, subtitle, image_src, sort_order)
values
  (
    'business-card',
    'Business Card',
    'NFC, PVC, and metal card products.',
    '/Images/Products/digitalCard.jpg',
    1
  ),
  (
    'digital-profile-qr',
    'Digital Profile + QR',
    'Print-ready QR cards that open your digital profile instantly.',
    '/Images/Products/digitalQR.jpg',
    2
  ),
  (
    'social-media-card',
    'Social Media Card',
    'Google review, Instagram, YouTube, and keychain QR cards.',
    '/Images/Products/googleReview.jpg',
    3
  ),
  (
    'standee',
    'Standee',
    'Google, Instagram, and YouTube review standees.',
    '/Images/Products/reviewStandy.jpg',
    4
  )
on conflict (id) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  image_src = coalesce(public.categories.image_src, excluded.image_src),
  sort_order = excluded.sort_order;

-- RLS: enable + allow service role full access; anon read for public catalog later
alter table public.categories enable row level security;
alter table public.products enable row level security;

drop policy if exists "Public read categories" on public.categories;
create policy "Public read categories"
  on public.categories for select
  using (true);

drop policy if exists "Public read active products" on public.products;
create policy "Public read active products"
  on public.products for select
  using (active = true);

-- Writes go through the backend with the service role key (bypasses RLS).
