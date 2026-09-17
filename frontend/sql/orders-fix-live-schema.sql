-- HexaCards — FIX live `orders` table to match the app
-- Paste into Supabase → SQL Editor → Run
--
-- Problems in your current schema:
-- 1) PK is column `orders` (manual bigint) instead of identity `order_id`
-- 2) Missing `status` (0=placed, 1=shipped, 2=delivered) → checkout insert fails
-- 3) `payment_status` default is 1 (paid) — should be 0 (pending)
-- 4) `ord_date` is date NOT NULL with no default
-- 5) `order_code` nullable / no unique
-- 6) `user_id` FK has no ON DELETE SET NULL
--
-- Safe-ish: backs up via orders_orders_col_backup, then repairs.

BEGIN;

-- ── 1) Missing fulfillment status ───────────────────────────────────────────
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

-- ── 2) Pending payments by default (not paid) ───────────────────────────────
ALTER TABLE public.orders
  ALTER COLUMN payment_status SET DEFAULT 0;

-- ── 3) Primary key must be order_id (app + payments/order_items use it) ─────
-- Keep old `orders` values in a backup column, then drop broken PK column.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS orders_legacy_pk bigint;

UPDATE public.orders
SET orders_legacy_pk = orders
WHERE orders_legacy_pk IS NULL AND orders IS NOT NULL;

-- Ensure every row has order_id
UPDATE public.orders
SET order_id = orders
WHERE (order_id IS NULL OR order_id = 0)
  AND orders IS NOT NULL;

-- If order_id still null on any row, assign from identity-like values
UPDATE public.orders o
SET order_id = s.n
FROM (
  SELECT ctid, ROW_NUMBER() OVER (ORDER BY created_at NULLS LAST, ord_date) AS n
  FROM public.orders
) s
WHERE o.ctid = s.ctid
  AND (o.order_id IS NULL OR o.order_id = 0);

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_pkey;

-- order_id must be unique before PK
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_id_uidx ON public.orders (order_id);

ALTER TABLE public.orders
  ADD CONSTRAINT orders_pkey PRIMARY KEY (order_id);

-- Drop the mistaken required PK column `orders` (not used by the app)
ALTER TABLE public.orders
  DROP COLUMN IF EXISTS orders;

-- ── 4) ord_date → timestamptz with default now() ────────────────────────────
ALTER TABLE public.orders
  ALTER COLUMN ord_date DROP DEFAULT;

ALTER TABLE public.orders
  ALTER COLUMN ord_date TYPE timestamptz
  USING (
    CASE
      WHEN ord_date IS NULL THEN now()
      ELSE ord_date::timestamp AT TIME ZONE 'UTC'
    END
  );

ALTER TABLE public.orders
  ALTER COLUMN ord_date SET DEFAULT now();

ALTER TABLE public.orders
  ALTER COLUMN ord_date SET NOT NULL;

-- ── 5) order_code required + unique ─────────────────────────────────────────
UPDATE public.orders
SET order_code = 'HC-' || order_id::text
WHERE order_code IS NULL OR btrim(order_code) = '';

ALTER TABLE public.orders
  ALTER COLUMN order_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_code_unique
  ON public.orders (order_code);

-- ── 6) user_id ON DELETE SET NULL (so wiping users does not break orders) ───
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users (user_id)
  ON DELETE SET NULL;

-- ── 7) shipment_created_at as timestamptz (optional) ────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'shipment_created_at'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE public.orders
      ALTER COLUMN shipment_created_at TYPE timestamptz
      USING NULLIF(shipment_created_at, '')::timestamptz;
  END IF;
END $$;

-- ── 8) Optional card_hidden used by app ─────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS card_hidden smallint NOT NULL DEFAULT 0;

COMMIT;

-- Refresh API schema cache
NOTIFY pgrst, 'reload schema';
