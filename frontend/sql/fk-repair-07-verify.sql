-- =============================================================================
-- FK repair 07 — VERIFY (read-only). Expect 0 on orphan checks.
-- =============================================================================

SET statement_timeout = '60s';

SELECT 'orphan checks (expect 0)' AS section;

SELECT 'orders.user_id orphans' AS check_name, count(*) AS n
FROM public.orders o
WHERE o.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = o.user_id)
UNION ALL
SELECT 'payments.customer_id orphans', count(*)
FROM public.payments p
WHERE p.customer_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = p.customer_id)
UNION ALL
SELECT 'payments.order_id orphans', count(*)
FROM public.payments p
WHERE p.order_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.order_id = p.order_id)
UNION ALL
SELECT 'cards.user_id orphans', count(*)
FROM public.cards c
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = c.user_id)
UNION ALL
SELECT 'orders.card_id orphans', count(*)
FROM public.orders o
WHERE o.card_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.cards c WHERE c.card_id = o.card_id)
UNION ALL
SELECT 'order_items.order_id orphans', count(*)
FROM public.order_items i
WHERE NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.order_id = i.order_id)
UNION ALL
SELECT 'links.card_id orphans', count(*)
FROM public.links l
WHERE NOT EXISTS (SELECT 1 FROM public.cards c WHERE c.card_id = l.card_id)
UNION ALL
SELECT 'messages.user_id orphans', count(*)
FROM public.messages m
WHERE m.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = m.user_id)
UNION ALL
SELECT 'messages.card_id orphans', count(*)
FROM public.messages m
WHERE m.card_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.cards c WHERE c.card_id = m.card_id)
UNION ALL
SELECT 'state.country_id orphans', count(*)
FROM public.state s
WHERE NOT EXISTS (SELECT 1 FROM public.country c WHERE c.country_id = s.country_id)
UNION ALL
SELECT 'city.state_id orphans', count(*)
FROM public.city c
WHERE NOT EXISTS (SELECT 1 FROM public.state s WHERE s.state_id = c.state_id);

SELECT 'coverage' AS section;
SELECT
  (SELECT count(*) FROM public.users) AS users,
  (SELECT count(*) FROM public.cards) AS cards,
  (SELECT count(*) FROM public.orders) AS orders,
  (SELECT count(*) FROM public.orders WHERE user_id IS NOT NULL) AS orders_with_user,
  (SELECT count(*) FROM public.orders WHERE card_id IS NOT NULL) AS orders_with_card,
  (SELECT count(*) FROM public.payments) AS payments,
  (SELECT count(*) FROM public.payments WHERE order_id IS NOT NULL) AS payments_with_order,
  (SELECT count(*) FROM public.order_items) AS order_items;

SELECT 'FK constraints' AS section;
SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'f' AND connamespace = 'public'::regnamespace
ORDER BY 1, 2;

-- Optional cleanup of repair helpers (keep if you want to re-run steps 02–05)
-- DROP TABLE IF EXISTS public.hexa_user_phone_map;
-- DROP FUNCTION IF EXISTS public.hexa_phone10(text);
-- DROP FUNCTION IF EXISTS public.hexa_norm_name(text);
-- DROP FUNCTION IF EXISTS public.hexa_split_first(text, text);
-- DROP FUNCTION IF EXISTS public.hexa_split_last(text, text);
-- DROP FUNCTION IF EXISTS public.hexa_drop_fk_on_column(regclass, text);

SELECT 'FK repair complete' AS status;
