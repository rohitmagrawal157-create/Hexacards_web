-- =============================================================================
-- FK repair 04 — CARDS + LINKS + orders.card_id (never delete cards)
-- Run time: usually < 90s
-- =============================================================================

SET statement_timeout = '180s';

-- Remap cards.user_id via phone map
UPDATE public.cards c
SET user_id = m.user_id
FROM public.hexa_user_phone_map m
WHERE m.phone10 = public.hexa_phone10(c.mobile)
  AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = c.user_id);

-- Remaining orphan cards → sentinel user (KEEP cards)
UPDATE public.cards c
SET user_id = m.user_id
FROM public.hexa_user_phone_map m
WHERE m.phone10 = '0000000000'
  AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = c.user_id);

-- Theme must be valid
UPDATE public.cards
SET theme_id = 1
WHERE theme_id IS NULL
   OR NOT EXISTS (SELECT 1 FROM public.card_theme t WHERE t.theme_id = cards.theme_id);

-- Clear invalid location FKs only
UPDATE public.cards c
SET state_id = NULL
WHERE c.state_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.state s WHERE s.state_id = c.state_id);

UPDATE public.cards c
SET city_id = NULL
WHERE c.city_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.city x WHERE x.city_id = c.city_id);

-- Normalize slug case
UPDATE public.cards
SET unic_card_name = lower(btrim(unic_card_name))
WHERE unic_card_name IS NOT NULL
  AND unic_card_name <> lower(btrim(unic_card_name));

-- Clear broken order→card pointers (keep order)
UPDATE public.orders o
SET card_id = NULL, card_slug = NULL, card_url = NULL
WHERE o.card_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.cards c WHERE c.card_id = o.card_id);

-- Link orders.card_id by slug
UPDATE public.orders o
SET
  card_id = c.card_id,
  card_slug = lower(btrim(c.unic_card_name)),
  card_url = coalesce(nullif(btrim(o.card_url), ''), 'https://hexacards-web.vercel.app/' || lower(btrim(c.unic_card_name))),
  user_id = coalesce(o.user_id, c.user_id)
FROM public.cards c
WHERE o.card_id IS NULL
  AND o.card_slug IS NOT NULL
  AND btrim(o.card_slug) <> ''
  AND lower(btrim(o.card_slug)) = lower(btrim(c.unic_card_name));

-- Link by user_id (digital card products only)
UPDATE public.orders o
SET
  card_id = c.card_id,
  card_slug = lower(btrim(c.unic_card_name)),
  card_url = coalesce(nullif(btrim(o.card_url), ''), 'https://hexacards-web.vercel.app/' || lower(btrim(c.unic_card_name)))
FROM (
  SELECT DISTINCT ON (user_id) card_id, user_id, unic_card_name
  FROM public.cards
  WHERE coalesce(status, 1) = 1
  ORDER BY user_id, update_time DESC NULLS LAST, card_id DESC
) c
WHERE o.card_id IS NULL
  AND o.user_id IS NOT NULL
  AND o.user_id = c.user_id
  AND (
    o.card_slug IS NOT NULL
    OR lower(coalesce(o.product_slug, '')) IN (
      'nfc-business-card', 'pvc-card', 'digital-profile-qr', 'metal-card'
    )
    OR lower(coalesce(o.product_title, o.pack_title, ''))
         ~ '(nfc|business card|hexa card|metal card|digital profile|digital qr)'
  );

-- Link by phone
UPDATE public.orders o
SET
  card_id = c.card_id,
  card_slug = lower(btrim(c.unic_card_name)),
  card_url = coalesce(nullif(btrim(o.card_url), ''), 'https://hexacards-web.vercel.app/' || lower(btrim(c.unic_card_name))),
  user_id = coalesce(o.user_id, c.user_id)
FROM (
  SELECT DISTINCT ON (public.hexa_phone10(mobile))
    card_id, user_id, unic_card_name, mobile
  FROM public.cards
  WHERE coalesce(status, 1) = 1
    AND public.hexa_phone10(mobile) IS NOT NULL
  ORDER BY public.hexa_phone10(mobile), update_time DESC NULLS LAST, card_id DESC
) c
WHERE o.card_id IS NULL
  AND public.hexa_phone10(coalesce(nullif(btrim(o.owner_phone), ''), o.mobile_number))
      = public.hexa_phone10(c.mobile)
  AND (
    o.card_slug IS NOT NULL
    OR lower(coalesce(o.product_slug, '')) IN (
      'nfc-business-card', 'pvc-card', 'digital-profile-qr', 'metal-card'
    )
    OR lower(coalesce(o.product_title, o.pack_title, ''))
         ~ '(nfc|business card|hexa card|metal card|digital profile|digital qr)'
  );

-- Sync slug on linked rows
UPDATE public.orders o
SET card_slug = lower(btrim(c.unic_card_name))
FROM public.cards c
WHERE o.card_id = c.card_id
  AND (
    o.card_slug IS NULL
    OR lower(btrim(o.card_slug)) <> lower(btrim(c.unic_card_name))
  );

-- links: only remove if card id truly missing (we never deleted cards here)
DELETE FROM public.links l
WHERE NOT EXISTS (SELECT 1 FROM public.cards c WHERE c.card_id = l.card_id);

SELECT '04 cards/links done — run fk-repair-05-locations-messages.sql next' AS next_step,
       (SELECT count(*) FROM public.cards) AS cards_kept,
       (SELECT count(*) FROM public.orders WHERE card_id IS NOT NULL) AS orders_with_card,
       (SELECT count(*) FROM public.cards c
          WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = c.user_id)
       ) AS cards_still_orphan_user;
