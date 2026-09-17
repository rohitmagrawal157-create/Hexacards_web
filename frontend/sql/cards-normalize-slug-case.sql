-- Normalize legacy mixed-case public slugs so lookups are stable.
-- Safe to re-run.

UPDATE public.cards
SET unic_card_name = lower(btrim(unic_card_name))
WHERE unic_card_name IS NOT NULL
  AND unic_card_name <> lower(btrim(unic_card_name));

UPDATE public.orders
SET card_slug = lower(btrim(card_slug))
WHERE card_slug IS NOT NULL
  AND btrim(card_slug) <> ''
  AND card_slug <> lower(btrim(card_slug));

NOTIFY pgrst, 'reload schema';
