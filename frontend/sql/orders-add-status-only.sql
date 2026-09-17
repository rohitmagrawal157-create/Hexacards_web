-- Minimal fix: add missing orders.status (checkout needs this)
-- Run in Supabase SQL Editor if /api/health reports status missing.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS status smallint NOT NULL DEFAULT 0;

DO $$
BEGIN
  ALTER TABLE public.orders
    ADD CONSTRAINT orders_status_check
    CHECK (status = ANY (ARRAY[0, 1, 2]));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Pending by default (0), not paid (1)
ALTER TABLE public.orders
  ALTER COLUMN payment_status SET DEFAULT 0;

NOTIFY pgrst, 'reload schema';
