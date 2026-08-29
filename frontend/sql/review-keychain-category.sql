-- HexaCards — add Review Keychain QR as its own category
-- Safe to re-run. Then POST /api/setup/seed to move the product into it.

insert into public.categories (
  category_id,
  slug,
  category_name,
  category_desc,
  category_img,
  sort_order,
  status
)
values (
  5,
  'review-keychain',
  'Review Keychain QR',
  'NFC + QR keychains that open your Google review page.',
  'keychain-front-back.jpg',
  5,
  1
)
on conflict (category_id) do update set
  slug           = excluded.slug,
  category_name  = excluded.category_name,
  category_desc  = excluded.category_desc,
  category_img   = excluded.category_img,
  sort_order     = excluded.sort_order,
  status         = excluded.status;

-- Move existing review-keychain-qr product into the new category
update public.products
set
  product_category = 5,
  category = 'Review Keychain QR'
where slug = 'review-keychain-qr';

-- Keep social-media-card description accurate (keychain removed)
update public.categories
set category_desc = 'Google review, Instagram, and YouTube social cards.'
where slug = 'social-media-card';

select setval(
  pg_get_serial_sequence('public.categories', 'category_id'),
  (select coalesce(max(category_id), 1) from public.categories)
);
