-- HexaCards — digital card accent color (Appearance → View card)
-- Safe to re-run.

alter table public.cards
  add column if not exists accent_color varchar(32);

comment on column public.cards.accent_color is
  'Hex accent from dashboard Appearance (buttons, icons, highlights)';
