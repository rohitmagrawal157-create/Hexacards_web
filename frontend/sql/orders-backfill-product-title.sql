-- =============================================================================
-- Backfill missing orders.product_title from products / pack / amount
-- Run once in Supabase SQL Editor.
-- =============================================================================

-- 1) From products.product_id
UPDATE public.orders o
SET product_title = coalesce(
      nullif(btrim(p.short_title), ''),
      nullif(btrim(p.product_name), ''),
      o.product_title
    ),
    product_slug = coalesce(nullif(btrim(o.product_slug), ''), p.slug)
FROM public.products p
WHERE o.product_id = p.product_id
  AND (o.product_title IS NULL OR btrim(o.product_title) = '');

-- 2) From products.slug
UPDATE public.orders o
SET product_title = coalesce(
      nullif(btrim(p.short_title), ''),
      nullif(btrim(p.product_name), ''),
      o.product_title
    ),
    product_id = coalesce(o.product_id, p.product_id)
FROM public.products p
WHERE lower(btrim(o.product_slug)) = lower(btrim(p.slug))
  AND (o.product_title IS NULL OR btrim(o.product_title) = '');

-- 3) From order_items
UPDATE public.orders o
SET product_title = i.product_title
FROM public.order_items i
WHERE i.order_id = o.order_id
  AND i.sort_order = 0
  AND (o.product_title IS NULL OR btrim(o.product_title) = '')
  AND nullif(btrim(i.product_title), '') IS NOT NULL
  AND lower(btrim(i.product_title)) <> 'hexacards order';

-- 4) Use pack_title when still empty
UPDATE public.orders
SET product_title = pack_title
WHERE (product_title IS NULL OR btrim(product_title) = '')
  AND nullif(btrim(pack_title), '') IS NOT NULL;

-- 5) Common ₹499 SKU (Digital Profile + QR) when still blank
UPDATE public.orders
SET product_title = 'Digital Profile + QR',
    product_slug = coalesce(nullif(btrim(product_slug), ''), 'digital-profile-qr')
WHERE (product_title IS NULL OR btrim(product_title) = '')
  AND round(coalesce(amount, 0)::numeric, 0) = 499;

SELECT
  count(*) FILTER (WHERE product_title IS NULL OR btrim(product_title) = '') AS still_blank_title,
  count(*) FILTER (WHERE nullif(btrim(product_title), '') IS NOT NULL) AS with_product_title
FROM public.orders;
