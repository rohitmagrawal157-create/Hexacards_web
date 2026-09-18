-- =============================================================================
-- FK repair 03 — ORDERS + PAYMENTS + ORDER_ITEMS (connect user_id / order_id)
-- Run time: usually < 90s
-- SAFE: never deletes orders/payments
-- =============================================================================

SET statement_timeout = '180s';

-- Remap orders.user_id via indexed phone map
UPDATE public.orders o
SET user_id = m.user_id
FROM public.hexa_user_phone_map m
WHERE m.phone10 = public.hexa_phone10(
        coalesce(nullif(btrim(o.owner_phone), ''), o.mobile_number)
      )
  AND (
    o.user_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = o.user_id)
  );

-- Clear only still-invalid user_id (keep order row)
UPDATE public.orders o
SET user_id = NULL
WHERE o.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = o.user_id);

-- Remap product_id by slug when broken/null
UPDATE public.orders o
SET product_id = p.product_id
FROM public.products p
WHERE lower(btrim(coalesce(o.product_slug, ''))) = lower(btrim(p.slug))
  AND btrim(coalesce(o.product_slug, '')) <> ''
  AND (
    o.product_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM public.products x WHERE x.product_id = o.product_id)
  );

UPDATE public.orders o
SET product_id = NULL
WHERE o.product_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.products p WHERE p.product_id = o.product_id);

-- payments.customer_id ← orders.user_id
UPDATE public.payments p
SET customer_id = o.user_id
FROM public.orders o
WHERE p.order_id = o.order_id
  AND o.user_id IS NOT NULL
  AND (
    p.customer_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = p.customer_id)
  );

UPDATE public.payments p
SET customer_id = NULL
WHERE p.customer_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = p.customer_id);

UPDATE public.payments p
SET order_id = NULL
WHERE p.order_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.order_id = p.order_id);

-- order_items: drop only lines whose parent order is already gone
DELETE FROM public.order_items i
WHERE NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.order_id = i.order_id);

-- Backfill missing order_items (one line per order)
INSERT INTO public.order_items (
  order_id, product_id, product_slug, product_title, pack_title,
  qty, unit_price, line_total, sort_order
)
SELECT
  o.order_id,
  o.product_id,
  o.product_slug,
  coalesce(nullif(btrim(o.product_title), ''), nullif(btrim(o.pack_title), ''), 'HexaCards order'),
  coalesce(nullif(btrim(o.pack_title), ''), ''),
  greatest(coalesce(o.qty, 1), 1),
  CASE
    WHEN coalesce(o.qty, 1) > 0 THEN round(coalesce(o.amount, 0) / greatest(o.qty, 1), 2)
    ELSE coalesce(o.amount, 0)
  END,
  coalesce(o.amount, 0),
  0
FROM public.orders o
WHERE NOT EXISTS (
  SELECT 1 FROM public.order_items i WHERE i.order_id = o.order_id
);

UPDATE public.order_items i
SET product_id = NULL
WHERE i.product_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.products p WHERE p.product_id = i.product_id);

SELECT '03 orders/payments done — run fk-repair-04-cards-links.sql next' AS next_step,
       (SELECT count(*) FROM public.orders WHERE user_id IS NOT NULL) AS orders_with_user,
       (SELECT count(*) FROM public.payments WHERE customer_id IS NOT NULL) AS payments_with_customer,
       (SELECT count(*) FROM public.order_items) AS order_items;
