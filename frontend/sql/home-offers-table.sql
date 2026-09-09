-- HexaCards offer banners (Super Admin → Offers)
-- Run in Supabase SQL Editor. Safe to re-run.
-- Each row = image + click link + which site pages show the dialog.

create table if not exists public.home_offers (
  offer_id       bigserial primary key,
  title          varchar(120) not null default 'Offer',
  image_url      text not null default '/Images/ads.png',
  link_url       text not null default '/products',
  active         smallint not null default 1 check (active in (0, 1)),
  sort_order     integer not null default 0,
  show_on_pages  text not null default 'home',
  updated_at     timestamptz not null default now()
);

alter table public.home_offers
  add column if not exists title varchar(120) not null default 'Offer';

alter table public.home_offers
  add column if not exists sort_order integer not null default 0;

alter table public.home_offers
  add column if not exists show_on_pages text not null default 'home';

create index if not exists home_offers_active_sort_idx
  on public.home_offers (active, sort_order, offer_id);

insert into public.home_offers (title, image_url, link_url, active, sort_order, show_on_pages)
select 'Default offer', '/Images/ads.png', '/products', 1, 0, 'home'
where not exists (select 1 from public.home_offers);

comment on column public.home_offers.show_on_pages is
  'Comma-separated pathnames where the banner shows, e.g. /,/products,/contact (legacy keys like home still accepted)';
