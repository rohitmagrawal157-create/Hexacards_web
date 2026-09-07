-- HexaCards — WIPE transactional user data (KEEP catalog / admin / locations)
-- Run in Supabase SQL Editor if the Node wipe script cannot connect.
--
-- DELETES: links, messages, payments, order_items, orders, cards,
--          user_session, users
-- KEEPS:   admin, categories, products, country, state, city, card_theme
--
-- WARNING: irreversible.

BEGIN;

-- Child / dependent rows first
TRUNCATE TABLE
  public.links,
  public.messages,
  public.payments,
  public.order_items,
  public.reviews,
  public.orders,
  public.cards,
  public.user_session,
  public.users
RESTART IDENTITY CASCADE;

COMMIT;
