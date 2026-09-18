-- =============================================================================
-- FK repair 06 — Ensure parent UNIQUE/PK keys, then RE-ADD all foreign keys
-- Run time: usually < 90s
--
-- Fix for: ERROR 42830 — no unique constraint matching keys for "cards"
-- Live DB often has cards.card_id without PRIMARY KEY / UNIQUE.
-- =============================================================================

SET statement_timeout = '180s';

-- ── 1) Ensure referenced columns are UNIQUE (required for FKs) ──────────────
-- Uses UNIQUE INDEX (enough for Postgres FK). Does NOT delete rows.
-- Fails only if true duplicate IDs exist (rare).

DO $$
DECLARE
  dup bigint;
BEGIN
  SELECT count(*) INTO dup FROM (
    SELECT card_id FROM public.cards GROUP BY card_id HAVING count(*) > 1
  ) d;
  IF dup > 0 THEN
    RAISE EXCEPTION 'cards has % duplicate card_id values — fix duplicates before FKs', dup;
  END IF;

  SELECT count(*) INTO dup FROM (
    SELECT order_id FROM public.orders GROUP BY order_id HAVING count(*) > 1
  ) d;
  IF dup > 0 THEN
    RAISE EXCEPTION 'orders has % duplicate order_id values — fix duplicates before FKs', dup;
  END IF;

  SELECT count(*) INTO dup FROM (
    SELECT user_id FROM public.users GROUP BY user_id HAVING count(*) > 1
  ) d;
  IF dup > 0 THEN
    RAISE EXCEPTION 'users has % duplicate user_id values — fix duplicates before FKs', dup;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS users_user_id_uidx ON public.users (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS cards_card_id_uidx ON public.cards (card_id);
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_id_uidx ON public.orders (order_id);
CREATE UNIQUE INDEX IF NOT EXISTS products_product_id_uidx ON public.products (product_id);
CREATE UNIQUE INDEX IF NOT EXISTS categories_category_id_uidx ON public.categories (category_id);
CREATE UNIQUE INDEX IF NOT EXISTS country_country_id_uidx ON public.country (country_id);
CREATE UNIQUE INDEX IF NOT EXISTS state_state_id_uidx ON public.state (state_id);
CREATE UNIQUE INDEX IF NOT EXISTS city_city_id_uidx ON public.city (city_id);
CREATE UNIQUE INDEX IF NOT EXISTS card_theme_theme_id_uidx ON public.card_theme (theme_id);

-- Prefer real PRIMARY KEY when table has none (safe / idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.cards'::regclass AND contype = 'p'
  ) THEN
    BEGIN
      ALTER TABLE public.cards ADD CONSTRAINT cards_pkey PRIMARY KEY USING INDEX cards_card_id_uidx;
    EXCEPTION WHEN others THEN
      -- unique index already sufficient for FKs
      NULL;
    END;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass AND contype = 'p'
  ) THEN
    BEGIN
      ALTER TABLE public.orders ADD CONSTRAINT orders_pkey PRIMARY KEY USING INDEX orders_order_id_uidx;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass AND contype = 'p'
  ) THEN
    BEGIN
      ALTER TABLE public.users ADD CONSTRAINT users_pkey PRIMARY KEY USING INDEX users_user_id_uidx;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;
END $$;

-- ── 2) Re-add foreign keys ──────────────────────────────────────────────────
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.users
      ADD CONSTRAINT users_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES public.users (user_id) ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.user_session
      ADD CONSTRAINT user_session_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users (user_id) ON DELETE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.products
      ADD CONSTRAINT products_product_category_fkey
      FOREIGN KEY (product_category) REFERENCES public.categories (category_id) ON DELETE RESTRICT;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.cards
      ADD CONSTRAINT cards_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users (user_id) ON DELETE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.cards
      ADD CONSTRAINT cards_theme_id_fkey
      FOREIGN KEY (theme_id) REFERENCES public.card_theme (theme_id) ON DELETE RESTRICT;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.cards
      ADD CONSTRAINT cards_state_id_fkey
      FOREIGN KEY (state_id) REFERENCES public.state (state_id) ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.cards
      ADD CONSTRAINT cards_city_id_fkey
      FOREIGN KEY (city_id) REFERENCES public.city (city_id) ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.links
      ADD CONSTRAINT links_card_id_fkey
      FOREIGN KEY (card_id) REFERENCES public.cards (card_id) ON DELETE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users (user_id) ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products (product_id) ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_card_id_fkey
      FOREIGN KEY (card_id) REFERENCES public.cards (card_id) ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_country_id_fkey
      FOREIGN KEY (country_id) REFERENCES public.country (country_id) ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_state_id_fkey
      FOREIGN KEY (state_id) REFERENCES public.state (state_id) ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_city_id_fkey
      FOREIGN KEY (city_id) REFERENCES public.city (city_id) ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.orders (order_id) ON DELETE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products (product_id) ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.users (user_id) ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.orders (order_id) ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users (user_id) ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products (product_id) ON DELETE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users (user_id) ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_card_id_fkey
      FOREIGN KEY (card_id) REFERENCES public.cards (card_id) ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.state
      ADD CONSTRAINT state_country_id_fkey
      FOREIGN KEY (country_id) REFERENCES public.country (country_id) ON DELETE RESTRICT;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.city
      ADD CONSTRAINT city_state_id_fkey
      FOREIGN KEY (state_id) REFERENCES public.state (state_id) ON DELETE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS orders_card_id_idx ON public.orders (card_id);
CREATE INDEX IF NOT EXISTS orders_owner_phone_idx ON public.orders (owner_phone);
CREATE INDEX IF NOT EXISTS payments_customer_id_idx ON public.payments (customer_id);
CREATE INDEX IF NOT EXISTS payments_order_id_idx ON public.payments (order_id);
CREATE INDEX IF NOT EXISTS cards_user_id_idx ON public.cards (user_id);

NOTIFY pgrst, 'reload schema';

SELECT '06 FKs added — run fk-repair-07-verify.sql next' AS next_step;
