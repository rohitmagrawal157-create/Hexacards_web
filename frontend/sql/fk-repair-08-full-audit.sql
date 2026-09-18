-- =============================================================================
-- FK repair 08 — FULL DATA AUDIT (read-only)
-- Run in Supabase SQL Editor. Scroll Results tabs / run sections separately if needed.
-- =============================================================================

SET statement_timeout = '120s';

-- ── 1) Core table row counts ────────────────────────────────────────────────
SELECT '1_table_counts' AS section;
SELECT
  (SELECT count(*) FROM public.users) AS users,
  (SELECT count(*) FROM public.cards) AS cards,
  (SELECT count(*) FROM public.links) AS links,
  (SELECT count(*) FROM public.orders) AS orders,
  (SELECT count(*) FROM public.order_items) AS order_items,
  (SELECT count(*) FROM public.payments) AS payments,
  (SELECT count(*) FROM public.messages) AS messages,
  (SELECT count(*) FROM public.reviews) AS reviews,
  (SELECT count(*) FROM public.products) AS products,
  (SELECT count(*) FROM public.categories) AS categories,
  (SELECT count(*) FROM public.country) AS country,
  (SELECT count(*) FROM public.state) AS state,
  (SELECT count(*) FROM public.city) AS city,
  (SELECT count(*) FROM public.admin) AS admin,
  (SELECT count(*) FROM public.card_theme) AS card_theme,
  (SELECT count(*) FROM public.user_session) AS user_session;

-- ── 2) Relationship coverage (linked vs total) ──────────────────────────────
SELECT '2_link_coverage' AS section;
SELECT
  (SELECT count(*) FROM public.orders) AS orders_total,
  (SELECT count(*) FROM public.orders WHERE user_id IS NOT NULL) AS orders_with_user,
  (SELECT count(*) FROM public.orders WHERE card_id IS NOT NULL) AS orders_with_card,
  (SELECT count(*) FROM public.orders WHERE product_id IS NOT NULL) AS orders_with_product,
  (SELECT count(*) FROM public.orders
     WHERE card_slug IS NOT NULL AND btrim(card_slug) <> '') AS orders_with_slug,
  (SELECT count(*) FROM public.payments) AS payments_total,
  (SELECT count(*) FROM public.payments WHERE customer_id IS NOT NULL) AS payments_with_customer,
  (SELECT count(*) FROM public.payments WHERE order_id IS NOT NULL) AS payments_with_order,
  (SELECT count(*) FROM public.cards) AS cards_total,
  (SELECT count(*) FROM public.cards WHERE user_id IS NOT NULL) AS cards_with_user,
  (SELECT count(*) FROM public.links) AS links_total,
  (SELECT count(DISTINCT card_id) FROM public.links) AS cards_that_have_links,
  (SELECT count(*) FROM public.messages WHERE user_id IS NOT NULL) AS messages_with_user,
  (SELECT count(*) FROM public.messages WHERE card_id IS NOT NULL) AS messages_with_card,
  (SELECT count(*) FROM public.order_items) AS order_items_total,
  (SELECT count(DISTINCT order_id) FROM public.order_items) AS orders_that_have_items;

-- ── 3) Orphans (expect EVERY n = 0) ─────────────────────────────────────────
SELECT '3_orphans_expect_0' AS section;
SELECT 'orders.user_id → users' AS check_name, count(*)::bigint AS n
FROM public.orders o
WHERE o.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = o.user_id)
UNION ALL
SELECT 'payments.customer_id → users', count(*)
FROM public.payments p
WHERE p.customer_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = p.customer_id)
UNION ALL
SELECT 'payments.order_id → orders', count(*)
FROM public.payments p
WHERE p.order_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.order_id = p.order_id)
UNION ALL
SELECT 'cards.user_id → users', count(*)
FROM public.cards c
WHERE c.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = c.user_id)
UNION ALL
SELECT 'orders.card_id → cards', count(*)
FROM public.orders o
WHERE o.card_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.cards c WHERE c.card_id = o.card_id)
UNION ALL
SELECT 'order_items.order_id → orders', count(*)
FROM public.order_items i
WHERE NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.order_id = i.order_id)
UNION ALL
SELECT 'links.card_id → cards', count(*)
FROM public.links l
WHERE NOT EXISTS (SELECT 1 FROM public.cards c WHERE c.card_id = l.card_id)
UNION ALL
SELECT 'messages.user_id → users', count(*)
FROM public.messages m
WHERE m.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = m.user_id)
UNION ALL
SELECT 'messages.card_id → cards', count(*)
FROM public.messages m
WHERE m.card_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.cards c WHERE c.card_id = m.card_id)
UNION ALL
SELECT 'state.country_id → country', count(*)
FROM public.state s
WHERE NOT EXISTS (SELECT 1 FROM public.country c WHERE c.country_id = s.country_id)
UNION ALL
SELECT 'city.state_id → state', count(*)
FROM public.city c
WHERE NOT EXISTS (SELECT 1 FROM public.state s WHERE s.state_id = c.state_id);

-- ── 4) Residual NULLs (not orphans — just unfilled optional links) ──────────
SELECT '4_residual_nulls' AS section;
SELECT
  (SELECT count(*) FROM public.orders WHERE user_id IS NULL) AS orders_user_id_null,
  (SELECT count(*) FROM public.orders WHERE card_id IS NULL) AS orders_card_id_null,
  (SELECT count(*) FROM public.payments WHERE customer_id IS NULL) AS payments_customer_null,
  (SELECT count(*) FROM public.payments WHERE order_id IS NULL) AS payments_order_null,
  (SELECT count(*) FROM public.messages WHERE user_id IS NULL) AS messages_user_null,
  (SELECT count(*) FROM public.messages WHERE card_id IS NULL) AS messages_card_null;

-- ── 5) ID uniqueness (must match row count) ─────────────────────────────────
SELECT '5_id_uniqueness' AS section;
SELECT
  (SELECT count(*) FROM public.users) AS users_rows,
  (SELECT count(DISTINCT user_id) FROM public.users) AS users_distinct,
  (SELECT count(*) FROM public.cards) AS cards_rows,
  (SELECT count(DISTINCT card_id) FROM public.cards) AS cards_distinct,
  (SELECT count(*) FROM public.orders) AS orders_rows,
  (SELECT count(DISTINCT order_id) FROM public.orders) AS orders_distinct;

-- ── 6) FK constraints now on public schema ──────────────────────────────────
SELECT '6_fk_constraints' AS section;
SELECT
  conrelid::regclass::text AS child_table,
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'f'
  AND connamespace = 'public'::regnamespace
ORDER BY 1, 2;

-- ── 7) Frontend fetch readiness ─────────────────────────────────────────────
SELECT '7_frontend_ready' AS section;
SELECT
  (SELECT count(*) FROM public.cards c
     WHERE EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = c.user_id)
  ) AS cards_ok_for_my_cards_api,
  (SELECT count(*) FROM public.cards
     WHERE unic_card_name IS NOT NULL AND btrim(unic_card_name) <> ''
  ) AS cards_ok_for_public_slug,
  (SELECT count(*) FROM public.orders o
     WHERE o.user_id IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = o.user_id)
  ) AS orders_ok_for_user_filter,
  (SELECT count(*) FROM public.payments p
     WHERE p.customer_id IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = p.customer_id)
  ) AS payments_ok_for_customer_filter,
  (SELECT count(*) FROM public.links l
     WHERE EXISTS (SELECT 1 FROM public.cards c WHERE c.card_id = l.card_id)
  ) AS links_ok_for_card_api,
  (SELECT count(*) FROM public.messages) AS messages_ok_for_inbox,
  (SELECT count(*) FROM public.order_items i
     WHERE EXISTS (SELECT 1 FROM public.orders o WHERE o.order_id = i.order_id)
  ) AS order_items_ok_for_order_detail;

SELECT 'full audit complete' AS status;
