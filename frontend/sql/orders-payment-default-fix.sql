-- Fix orders.payment_status default (was 1=paid, should be 0=pending)
alter table public.orders
  alter column payment_status set default 0;
