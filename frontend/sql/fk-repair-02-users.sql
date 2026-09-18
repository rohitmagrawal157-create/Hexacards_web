-- =============================================================================
-- FK repair 02 — USERS (create missing users from order/card phones; keep cards)
-- Run time: usually < 60s
-- SAFE: never deletes users/cards/orders/payments
-- =============================================================================

SET statement_timeout = '180s';

-- Fill owner_phone when empty (cheap)
UPDATE public.orders
SET owner_phone = public.hexa_phone10(mobile_number)
WHERE (owner_phone IS NULL OR btrim(owner_phone) = '')
  AND public.hexa_phone10(mobile_number) IS NOT NULL;

-- Create users from ORDER phones missing from map
INSERT INTO public.users (first_name, last_name, mobile, email, is_mobile, status)
SELECT DISTINCT ON (ph)
  public.hexa_split_first(o.name, 'Customer'),
  public.hexa_split_last(o.name, 'Customer'),
  ph,
  nullif(btrim(o.email), ''),
  1,
  1
FROM public.orders o
CROSS JOIN LATERAL (
  SELECT public.hexa_phone10(coalesce(nullif(btrim(o.owner_phone), ''), o.mobile_number)) AS ph
) x
WHERE x.ph IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.hexa_user_phone_map m WHERE m.phone10 = x.ph)
ORDER BY ph, o.order_id;

-- Create users from CARD phones missing from map
INSERT INTO public.users (first_name, last_name, mobile, email, is_mobile, status)
SELECT DISTINCT ON (ph)
  public.hexa_split_first(c.card_name, 'Recovered'),
  public.hexa_split_last(c.card_name, 'Recovered'),
  ph,
  nullif(btrim(c.email), ''),
  1,
  1
FROM public.cards c
CROSS JOIN LATERAL (SELECT public.hexa_phone10(c.mobile) AS ph) x
WHERE x.ph IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.hexa_user_phone_map m WHERE m.phone10 = x.ph)
  AND NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.user_id = c.user_id
  )
ORDER BY ph, c.card_id;

-- Sentinel recovery user
INSERT INTO public.users (first_name, last_name, mobile, email, is_mobile, status)
SELECT 'Recovered', 'Card Owner', '0000000000', NULL, 0, 1
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE public.hexa_phone10(u.mobile) = '0000000000'
);

-- Rebuild phone map after inserts
TRUNCATE public.hexa_user_phone_map;
INSERT INTO public.hexa_user_phone_map (phone10, user_id)
SELECT DISTINCT ON (public.hexa_phone10(u.mobile))
  public.hexa_phone10(u.mobile),
  u.user_id
FROM public.users u
WHERE public.hexa_phone10(u.mobile) IS NOT NULL
ORDER BY public.hexa_phone10(u.mobile), u.user_id;

ANALYZE public.hexa_user_phone_map;

SELECT '02 users done — run fk-repair-03-orders-payments.sql next' AS next_step,
       (SELECT count(*) FROM public.users) AS users_total,
       (SELECT count(*) FROM public.hexa_user_phone_map) AS phone_map_rows;
