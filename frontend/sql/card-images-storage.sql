-- HexaCards — Supabase Storage for card profile + background images
-- Optional but recommended for Vercel / production (local falls back to public/uploads/cards).
--
-- 1. Supabase Dashboard → Storage → New bucket
--    Name: card-images
--    Public: YES (so PublicCard can load images)
--
-- 2. Or run via SQL (requires storage schema):

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'card-images',
  'card-images',
  true,
  2621440,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read
drop policy if exists "Public read card images" on storage.objects;
create policy "Public read card images"
  on storage.objects for select
  using (bucket_id = 'card-images');

-- Service role writes via SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
-- If you only use the anon key locally, also allow authenticated/anon upsert:

drop policy if exists "Service upsert card images" on storage.objects;
create policy "Service upsert card images"
  on storage.objects for insert
  with check (bucket_id = 'card-images');

drop policy if exists "Service update card images" on storage.objects;
create policy "Service update card images"
  on storage.objects for update
  using (bucket_id = 'card-images');

-- Filenames (fixed per card username / unic_card_name):
--   {username}-profile.jpg
--   {username}-background.jpg
-- DB columns store FILE NAME ONLY (no path):
--   cards.logo      = rohit-agrawal7256-profile.jpg
--   cards.bg_img    = rohit-agrawal7256-background.jpg
--   cards.bg_url    = rohit-agrawal7256-background.jpg
-- App resolves names to /uploads/cards/{name} (or Supabase public URL) for display.
