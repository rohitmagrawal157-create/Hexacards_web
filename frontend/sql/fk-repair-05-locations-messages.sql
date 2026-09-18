-- =============================================================================
-- FK repair 05 — LOCATIONS + MESSAGES + REVIEWS + PRODUCTS
-- Run time: usually < 60s
-- =============================================================================

SET statement_timeout = '180s';

-- Location hierarchy
UPDATE public.state
SET country_id = 1
WHERE country_id IS NULL
   OR NOT EXISTS (SELECT 1 FROM public.country c WHERE c.country_id = state.country_id);

UPDATE public.city c
SET state_id = (
  SELECT s.state_id FROM public.state s WHERE s.country_id = 1 ORDER BY s.state_id LIMIT 1
)
WHERE NOT EXISTS (SELECT 1 FROM public.state s WHERE s.state_id = c.state_id);

-- Orders location by text
UPDATE public.orders o
SET country_id = 1
WHERE (o.country_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM public.country c WHERE c.country_id = o.country_id))
  AND (
    public.hexa_norm_name(o.country_name) IN ('india', 'in', 'bharat', '')
    OR o.country_name IS NULL
    OR btrim(o.country_name) = ''
  );

UPDATE public.orders o
SET state_id = s.state_id
FROM public.state s
WHERE public.hexa_norm_name(o.state) = public.hexa_norm_name(s.state_name)
  AND (o.state_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM public.state x WHERE x.state_id = o.state_id));

UPDATE public.orders o
SET city_id = ci.city_id,
    state_id = coalesce(o.state_id, ci.state_id)
FROM public.city ci
WHERE public.hexa_norm_name(o.city) = public.hexa_norm_name(ci.city_name)
  AND (o.state_id IS NULL OR ci.state_id = o.state_id)
  AND (o.city_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM public.city x WHERE x.city_id = o.city_id));

UPDATE public.orders o
SET country_id = NULL
WHERE o.country_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.country c WHERE c.country_id = o.country_id);

UPDATE public.orders o
SET state_id = NULL
WHERE o.state_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.state s WHERE s.state_id = o.state_id);

UPDATE public.orders o
SET city_id = NULL
WHERE o.city_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.city c WHERE c.city_id = o.city_id);

-- Products → categories
UPDATE public.products p
SET product_category = (
  SELECT c.category_id FROM public.categories c ORDER BY c.category_id LIMIT 1
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c WHERE c.category_id = p.product_category
);

-- Messages reconnect
UPDATE public.messages m
SET card_id = c.card_id
FROM (
  SELECT DISTINCT ON (public.hexa_phone10(mobile))
    card_id, mobile, user_id
  FROM public.cards
  WHERE public.hexa_phone10(mobile) IS NOT NULL
  ORDER BY public.hexa_phone10(mobile), update_time DESC NULLS LAST, card_id DESC
) c
WHERE (m.card_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM public.cards x WHERE x.card_id = m.card_id))
  AND public.hexa_phone10(m.owner_phone) = public.hexa_phone10(c.mobile);

UPDATE public.messages m
SET user_id = c.user_id
FROM public.cards c
WHERE m.card_id = c.card_id
  AND c.user_id IS NOT NULL
  AND (
    m.user_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = m.user_id)
  );

UPDATE public.messages m
SET user_id = map.user_id
FROM public.hexa_user_phone_map map
WHERE map.phone10 = public.hexa_phone10(m.owner_phone)
  AND (
    m.user_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = m.user_id)
  );

UPDATE public.messages m
SET user_id = NULL
WHERE m.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = m.user_id);

UPDATE public.messages m
SET card_id = NULL
WHERE m.card_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.cards c WHERE c.card_id = m.card_id);

-- Reviews keep connected
UPDATE public.reviews r
SET user_id = NULL
WHERE r.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = r.user_id);

UPDATE public.reviews r
SET product_id = (
  SELECT p.product_id FROM public.products p ORDER BY p.product_id LIMIT 1
)
WHERE r.product_id IS NULL
   OR NOT EXISTS (SELECT 1 FROM public.products p WHERE p.product_id = r.product_id);

-- Disposable sessions only
DELETE FROM public.user_session s
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = s.user_id);

UPDATE public.users u
SET created_by = NULL
WHERE u.created_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.users x WHERE x.user_id = u.created_by);

SELECT '05 locations/messages done — run fk-repair-06-add-fks.sql next' AS next_step;
