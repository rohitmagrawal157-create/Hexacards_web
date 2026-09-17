-- HexaCards — ensure orders.status / payment_status exist
-- Run in Supabase SQL Editor if checkout fails with:
--   Could not find the 'status' column of 'orders' in the schema cache
--
-- Safe to re-run (IF NOT EXISTS).

alter table public.orders
  add column if not exists status smallint not null default 0;

alter table public.orders
  add column if not exists payment_status smallint not null default 0;

alter table public.orders
  add column if not exists payment_method varchar(50) not null default '';

alter table public.orders
  add column if not exists delivery_charges numeric(10, 2) not null default 0.00;

alter table public.orders
  add column if not exists nimbus_pushed smallint not null default 0;

alter table public.orders
  add column if not exists awb_number varchar(100);

alter table public.orders
  add column if not exists courier_name varchar(100);

alter table public.orders
  add column if not exists shipment_created_at timestamptz;

-- Refresh PostgREST schema cache (Supabase dashboard → Settings → API → Reload schema
-- or wait ~1 minute after ALTER).

notify pgrst, 'reload schema';
