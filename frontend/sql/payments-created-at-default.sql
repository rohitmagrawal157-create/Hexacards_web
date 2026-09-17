-- Fix payments.created_at (NOT NULL without default breaks checkout payment rows)
-- Run in Supabase SQL Editor.

ALTER TABLE public.payments
  ALTER COLUMN created_at SET DEFAULT now();

UPDATE public.payments
SET created_at = coalesce(txn_at, now())
WHERE created_at IS NULL;

NOTIFY pgrst, 'reload schema';
