-- =============================================================================
-- FK repair 01 — PREP (drop FKs temporarily + helpers + phone index tables)
-- Run time: usually < 30s
-- SAFE: does not delete users/cards/orders/payments
-- =============================================================================

SET statement_timeout = '120s';

CREATE OR REPLACE FUNCTION public.hexa_phone10(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN length(digits) >= 10 THEN right(digits, 10)
    ELSE NULL
  END
  FROM (SELECT regexp_replace(coalesce(raw, ''), '\D', '', 'g') AS digits) s;
$$;

CREATE OR REPLACE FUNCTION public.hexa_norm_name(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT lower(btrim(regexp_replace(coalesce(raw, ''), '\s+', ' ', 'g')));
$$;

CREATE OR REPLACE FUNCTION public.hexa_split_first(raw text, fallback text DEFAULT 'User')
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT coalesce(
    nullif(
      split_part(
        regexp_replace(coalesce(nullif(btrim(raw), ''), fallback), '\s+', ' ', 'g'),
        ' ',
        1
      ),
      ''
    ),
    fallback
  );
$$;

CREATE OR REPLACE FUNCTION public.hexa_split_last(raw text, fallback text DEFAULT 'User')
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT coalesce(
    nullif(
      btrim(
        substr(
          regexp_replace(coalesce(nullif(btrim(raw), ''), fallback), '\s+', ' ', 'g'),
          length(public.hexa_split_first(raw, fallback)) + 2
        )
      ),
      ''
    ),
    ''  -- never NULL — live users.last_name is NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.hexa_drop_fk_on_column(p_table regclass, p_column text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid
     AND a.attnum = ANY (c.conkey)
    WHERE c.contype = 'f'
      AND c.conrelid = p_table
      AND a.attname = p_column
      AND a.attnum > 0
      AND NOT a.attisdropped
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', p_table, r.conname);
  END LOOP;
END;
$$;

-- Drop FKs so remaps can run (re-added in step 06)
SELECT public.hexa_drop_fk_on_column('public.orders'::regclass, 'user_id');
SELECT public.hexa_drop_fk_on_column('public.orders'::regclass, 'product_id');
SELECT public.hexa_drop_fk_on_column('public.orders'::regclass, 'card_id');
SELECT public.hexa_drop_fk_on_column('public.orders'::regclass, 'country_id');
SELECT public.hexa_drop_fk_on_column('public.orders'::regclass, 'state_id');
SELECT public.hexa_drop_fk_on_column('public.orders'::regclass, 'city_id');
SELECT public.hexa_drop_fk_on_column('public.order_items'::regclass, 'order_id');
SELECT public.hexa_drop_fk_on_column('public.order_items'::regclass, 'product_id');
SELECT public.hexa_drop_fk_on_column('public.payments'::regclass, 'customer_id');
SELECT public.hexa_drop_fk_on_column('public.payments'::regclass, 'order_id');
SELECT public.hexa_drop_fk_on_column('public.cards'::regclass, 'user_id');
SELECT public.hexa_drop_fk_on_column('public.cards'::regclass, 'theme_id');
SELECT public.hexa_drop_fk_on_column('public.cards'::regclass, 'state_id');
SELECT public.hexa_drop_fk_on_column('public.cards'::regclass, 'city_id');
SELECT public.hexa_drop_fk_on_column('public.links'::regclass, 'card_id');
SELECT public.hexa_drop_fk_on_column('public.messages'::regclass, 'user_id');
SELECT public.hexa_drop_fk_on_column('public.messages'::regclass, 'card_id');
SELECT public.hexa_drop_fk_on_column('public.reviews'::regclass, 'user_id');
SELECT public.hexa_drop_fk_on_column('public.reviews'::regclass, 'product_id');
SELECT public.hexa_drop_fk_on_column('public.user_session'::regclass, 'user_id');
SELECT public.hexa_drop_fk_on_column('public.products'::regclass, 'product_category');
SELECT public.hexa_drop_fk_on_column('public.users'::regclass, 'created_by');
SELECT public.hexa_drop_fk_on_column('public.state'::regclass, 'country_id');
SELECT public.hexa_drop_fk_on_column('public.city'::regclass, 'state_id');

-- Fast phone → user_id map (rebuild each repair)
DROP TABLE IF EXISTS public.hexa_user_phone_map;
CREATE TABLE public.hexa_user_phone_map (
  phone10 text PRIMARY KEY,
  user_id bigint NOT NULL
);

INSERT INTO public.hexa_user_phone_map (phone10, user_id)
SELECT DISTINCT ON (public.hexa_phone10(u.mobile))
  public.hexa_phone10(u.mobile),
  u.user_id
FROM public.users u
WHERE public.hexa_phone10(u.mobile) IS NOT NULL
ORDER BY public.hexa_phone10(u.mobile), u.user_id;

ANALYZE public.hexa_user_phone_map;

SELECT '01 prep done — run fk-repair-02-users.sql next' AS next_step,
       (SELECT count(*) FROM public.hexa_user_phone_map) AS phone_map_rows;
