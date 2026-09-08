-- HexaCards coupons (Super Admin → Coupons)
-- Run in Supabase SQL Editor once.

create table if not exists public.coupons (
  coupon_id    bigserial primary key,
  name         varchar(120) not null,
  code         varchar(32) not null,
  percent_off  integer not null check (percent_off >= 1 and percent_off <= 100),
  active       smallint not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint coupons_code_unique unique (code)
);

create index if not exists coupons_active_idx on public.coupons (active);
create index if not exists coupons_code_lower_idx on public.coupons (lower(code));

-- Seed a starter coupon (skip if code already exists)
insert into public.coupons (name, code, percent_off, active)
values ('Welcome offer', 'WELCOME10', 10, 1)
on conflict (code) do nothing;
