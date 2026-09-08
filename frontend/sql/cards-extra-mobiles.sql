-- HexaCards — additional contact numbers on digital cards
-- Run once in Supabase SQL Editor (Production + local).
-- Safe to re-run.

alter table public.cards
  add column if not exists extra_mobiles text not null default '';

comment on column public.cards.extra_mobiles is
  'Comma-separated extra mobile numbers (10-digit), separate from primary mobile';

-- Migrate any legacy values packed as primary|extra1|extra2 into mobile
update public.cards
set
  extra_mobiles = case
    when coalesce(nullif(trim(extra_mobiles), ''), '') = ''
      and position('|' in mobile) > 0
    then array_to_string((string_to_array(mobile, '|'))[2:], ',')
    else extra_mobiles
  end,
  mobile = split_part(mobile, '|', 1)
where mobile like '%|%';
