-- HexaCards — repair duplicate public card slugs
-- Keep the oldest card_id on each colliding slug; renumber later cards
-- to base2, base3, … then sync orders.card_slug / card_url.
--
-- Prefer POST /api/cards/repair-slugs (or Super Admin sync) for the full
-- numbered allocation. This SQL only normalizes case + enforces uniqueness
-- after the API repair has run.
--
-- Safe to re-run.

-- 1) Normalize case
UPDATE public.cards
SET unic_card_name = lower(btrim(unic_card_name))
WHERE unic_card_name IS NOT NULL
  AND unic_card_name <> lower(btrim(unic_card_name));

UPDATE public.orders
SET card_slug = lower(btrim(card_slug))
WHERE card_slug IS NOT NULL
  AND btrim(card_slug) <> ''
  AND card_slug <> lower(btrim(card_slug));

-- 2) Sync order links from cards (linked rows)
UPDATE public.orders o
SET
  card_slug = lower(btrim(c.unic_card_name)),
  card_url = 'https://hexacards-web.vercel.app/' || lower(btrim(c.unic_card_name))
FROM public.cards c
WHERE o.card_id = c.card_id
  AND c.unic_card_name IS NOT NULL
  AND btrim(c.unic_card_name) <> ''
  AND (
    lower(btrim(coalesce(o.card_slug, ''))) <> lower(btrim(c.unic_card_name))
    OR coalesce(o.card_url, '') = ''
  );

-- 3) Case-insensitive unique index (after API repair cleared duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS cards_unic_card_name_lower_uidx
  ON public.cards (lower(btrim(unic_card_name)));

NOTIFY pgrst, 'reload schema';
