-- Mark orders whose dashboard card was removed by Super Admin.
-- Run in Supabase SQL Editor after orders-table.sql.

alter table public.orders
  add column if not exists card_hidden smallint not null default 0
  check (card_hidden in (0, 1));

create index if not exists idx_orders_card_hidden on public.orders (card_hidden);

comment on column public.orders.card_hidden is
  '1 = card removed from user dashboard by admin; order history remains';
