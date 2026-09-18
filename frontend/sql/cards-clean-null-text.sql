-- =============================================================================
-- Clean literal "NULL" text + HTML entities on cards (read/write safe)
-- Run in Supabase SQL Editor once.
-- =============================================================================

-- about / about_company / services stored as the word NULL
UPDATE public.cards
SET
  about = NULLIF(NULLIF(btrim(about), ''), 'NULL'),
  about_company = NULLIF(NULLIF(btrim(about_company), ''), 'NULL'),
  services = NULLIF(NULLIF(btrim(services), ''), 'NULL')
WHERE
  lower(btrim(coalesce(about, ''))) IN ('null', 'undefined', 'none', 'n/a')
  OR lower(btrim(coalesce(about_company, ''))) IN ('null', 'undefined', 'none', 'n/a')
  OR lower(btrim(coalesce(services, ''))) IN ('null', 'undefined', 'none', 'n/a');

-- Decode common double-encoded ampersands in title / address / business
UPDATE public.cards
SET
  job_name = replace(job_name, '&amp;', '&'),
  business_name = replace(business_name, '&amp;', '&'),
  address = replace(address, '&amp;', '&'),
  card_name = replace(card_name, '&amp;', '&'),
  about = replace(about, '&amp;', '&'),
  about_company = replace(about_company, '&amp;', '&')
WHERE
  job_name ILIKE '%&amp;%'
  OR business_name ILIKE '%&amp;%'
  OR address ILIKE '%&amp;%'
  OR card_name ILIKE '%&amp;%'
  OR about ILIKE '%&amp;%'
  OR about_company ILIKE '%&amp;%';

-- Second pass for double encoding (&amp;amp; → &)
UPDATE public.cards
SET
  job_name = replace(job_name, '&amp;', '&'),
  business_name = replace(business_name, '&amp;', '&'),
  address = replace(address, '&amp;', '&'),
  card_name = replace(card_name, '&amp;', '&'),
  about = replace(about, '&amp;', '&'),
  about_company = replace(about_company, '&amp;', '&')
WHERE
  job_name ILIKE '%&amp;%'
  OR business_name ILIKE '%&amp;%'
  OR address ILIKE '%&amp;%'
  OR card_name ILIKE '%&amp;%'
  OR about ILIKE '%&amp;%'
  OR about_company ILIKE '%&amp;%';

SELECT
  count(*) FILTER (
    WHERE lower(btrim(coalesce(about, ''))) = 'null'
       OR lower(btrim(coalesce(about_company, ''))) = 'null'
       OR lower(btrim(coalesce(services, ''))) = 'null'
  ) AS still_null_text,
  count(*) FILTER (
    WHERE job_name ILIKE '%&amp;%'
       OR address ILIKE '%&amp;%'
  ) AS still_amp_encoded
FROM public.cards;
