-- =============================================================================
-- Rewrite stored card URLs: hexacards.com → hexacards-web.vercel.app
-- Run once in Supabase SQL Editor (safe, no deletes).
-- =============================================================================

UPDATE public.orders
SET card_url = regexp_replace(
  card_url,
  'https?://(www\.)?hexacards\.com',
  'https://hexacards-web.vercel.app',
  'gi'
)
WHERE card_url ~* 'hexacards\.com';

-- Optional: also normalize any leftover www / trailing slash noise
UPDATE public.orders
SET card_url = regexp_replace(card_url, '/$', '')
WHERE card_url ILIKE 'https://hexacards-web.vercel.app/%/';

SELECT
  count(*) FILTER (WHERE card_url ILIKE '%hexacards.com%') AS still_old_host,
  count(*) FILTER (WHERE card_url ILIKE '%hexacards-web.vercel.app%') AS on_vercel,
  count(*) FILTER (WHERE card_url IS NOT NULL AND btrim(card_url) <> '') AS with_card_url
FROM public.orders;
