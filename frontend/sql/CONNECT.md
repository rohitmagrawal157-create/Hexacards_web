# Complete connection (Backend → Database → Frontend)

## Stack
1. **Backend:** Next.js App Router (`frontend/app/api/*`) — TypeScript
2. **Database:** Supabase Postgres
3. **Frontend:** Super Admin Products UI → calls `/api/categories` + `/api/products`
4. **Users / login:** `users` table → `/api/auth/otp/*` + `/api/users`

## Tables (run `frontend/sql/schema.sql`)

| Table | Purpose |
|-------|---------|
| `categories` | Product sections: `category_id`, `category_name`, `category_desc`, `category_img`, then `slug`, `sort_order`, `status`, timestamps |
| `products` | Catalog: `product_id`, `product_name`, `product_category`, `product_desc`, `product_img`, `product_price`, `regular_price`, then `slug` + extras |
| `users` | Login users (`user_id` 1, 2, 3…, `first_name`, `last_name`, `mobile`, `email`, `password`, flags, `otp`, `otp_expiry`) |
| `user_session` | Login sessions (`id`, `session_id`, `session_token`, `datetime`, `user_id`) |
| `country` | Countries — India = `country_id` 1 |
| `state` | India states / UTs (`state_id`, `state_name`, `state_type`, `status`, `country_id`) |
| `city` | Cities / districts linked to state (`city_id`, `city_name`, `state_id`, `status`) — ~729 rows, IDs match source dump |
| `admin` | Super admins (`aid`, `fname`, `lname`, `email`, `mobile`, `password`, `profile`, `status`) |
| `card_theme` | Card layouts (`theme_id`, `theme_name`, `theme_path`, `status`) — classic, basic, modern… |
| `cards` | Digital NFC cards (`card_id`, `unic_card_name`, contact, images, theme…) |
| `links` | Card links — one row per type (`instagram`, `youtube`, `google_review`, `brochure`, `telegram`, …) |
| `orders` | Primary: `order_id`, `user_id`, `product_id`, `name`, `mobile_number`, `designation`, `logo`, address fields, `amount`, `date`, `status`, `payment_status`, shipping fields… then extras (`order_code`, card_design, …) |
| `order_items` | Line items per order (`order_item_id`, `order_id`, product snapshot, qty, prices) |
| `payments` | Gateway payments (`id`, `client_txn_id`, `amount`, `customer_id`, `gateway_order_id`, `created_at`, `txn_at`, `remark`, `status`, `upi_txn_id`, `razorpay_payment_id`, `order_id`) |
| `reviews` | Product reviews (`review_id`, `user_id`, `product_id`, `review_text`, `rating_value` 0–5) |
| `messages` | Card contact leads → Dashboard Messages (`message_id`, `user_id`, `name`, `email`, `phone`, `website`, `message`, `is_read`, `owner_phone`, …) |

## One-time database setup (required)

1. Open Supabase → **SQL Editor** → New query
2. Run in this order:
   1. `frontend/sql/schema.sql`
   2. `frontend/sql/categories-migrate.sql` ← **required if old categories used `id/title/subtitle/image_src`**
   3. `frontend/sql/products-migrate.sql` ← **required if old products used `id/title/price/…`**
   4. `frontend/sql/country-seed.sql`
   5. `frontend/sql/location-tables.sql` ← creates `state` + `city` if missing
   6. `frontend/sql/state-seed.sql`
   7. `frontend/sql/city-seed.sql`
   8. `frontend/sql/admin-seed.sql` ← default admin login
   9. `frontend/sql/card-theme-seed.sql` ← themes (run before cards if cards missing)
  10. `frontend/sql/cards-table.sql` ← digital cards table (if not in latest schema)
  11. `frontend/sql/links-table.sql` ← **card links** (Instagram, YouTube, brochure, …) + migrates from cards columns
  12. `frontend/sql/orders-table.sql` ← orders + order_items (fresh)
  13. `frontend/sql/orders-migrate.sql` ← **required if older orders used `customer_name` / `phone` / `total`**
  14. `frontend/sql/payments-table.sql` ← Razorpay / UPI payment rows
  15. `frontend/sql/reviews-table.sql` ← product reviews
  16. `frontend/sql/messages-table.sql` ← card contact messages (dashboard inbox)
  17. `frontend/sql/review-keychain-category.sql` ← **Review Keychain QR as its own category**
  18. `frontend/sql/card-images-storage.sql` ← **optional** Supabase Storage bucket for card profile/background images

If you already ran an older `schema.sql` without these tables, run the matching create/seed files above.
If Super Admin Products breaks after a schema update, run `categories-migrate.sql` → `products-migrate.sql`, then re-seed.
If orders API fails after column rename, run `orders-migrate.sql`.
After adding Review Keychain category, run `review-keychain-category.sql` then:

```bash
curl -X POST http://localhost:3000/api/setup/seed
```

### Card links (`links` table)
- Run `frontend/sql/links-table.sql` once in Supabase
- Stores each card link as its own row: `website`, `facebook`, `instagram`, `linkedin`, `twitter`, `youtube`, `google_review`, `telegram`, `snapchat`, `pinterest`, `tripadvisor`, `brochure`
- Edit Card / card APIs read & write `links` (legacy columns on `cards` are left as fallback only)
- Inspect: `GET /api/links?card_id=1`

### Card profile + background images
- Edit Card uploads overwrite fixed files named `{unic_card_name}-profile.jpg` and `{unic_card_name}-background.jpg`
- DB stores **file name only** on `cards.logo`, `cards.bg_img`, `cards.bg_url` (e.g. `rohit-agrawal7256-profile.jpg`)
- App resolves names to `/uploads/cards/{name}` for display
- Local files: `frontend/public/uploads/cards/`
- Production: run `card-images-storage.sql` (or create public bucket `card-images` in Supabase Dashboard)
- Optional env: `CARD_IMAGES_BUCKET=card-images`

## Env (already in frontend/.env.local)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RAZORPAY_KEY_ID` — Razorpay **Key ID** (test: `rzp_test_…`, live: `rzp_live_…`)
- `RAZORPAY_KEY_SECRET` — Razorpay **Key Secret** (server only — never commit or use `NEXT_PUBLIC_`)

### Razorpay on Vercel (required for checkout)
1. Vercel → Project → **Settings** → **Environment Variables**
2. Add both variables for **Production** (and Preview if you test preview URLs):
   - `RAZORPAY_KEY_ID` = your Key ID from Razorpay Dashboard → Account & Settings → API Keys
   - `RAZORPAY_KEY_SECRET` = matching Key Secret
3. **Redeploy** (Deployments → … → Redeploy) — env changes do not apply until redeploy
4. Local: same keys in `frontend/.env.local`, then restart `npm run dev`

If checkout shows *"Razorpay keys are not configured"*, one or both env vars are missing on that deployment.

## Run app
```bash
cd frontend
npm run dev
```

Check:
- http://localhost:3000/api/health  → should show `"ok": true` and table checks
- http://localhost:3000/super-admin?tab=products
- http://localhost:3000/login  → OTP stored in Supabase `users` table

## User / location API

```bash
# Send OTP (creates/updates user row)
curl -X POST http://localhost:3000/api/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Rohit","lastName":"Agrawal","mobile":"9876543210"}'

# Verify OTP (creates user_session + returns session token)
curl -X POST http://localhost:3000/api/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9876543210","otp":"123456"}'

# List users (admin)
curl http://localhost:3000/api/users

# List countries (India first)
curl http://localhost:3000/api/countries

# List India states
curl http://localhost:3000/api/states

# List cities for Maharashtra (state_id=22)
curl "http://localhost:3000/api/cities?state_id=22"

# Super admin login (DB-backed)
curl -X POST http://localhost:3000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hexacards.com","password":"superadmin123"}'

# List admins
curl http://localhost:3000/api/admins

# Cards
curl http://localhost:3000/api/cards
curl http://localhost:3000/api/cards/by-slug/shripad-borde

# Card themes
curl http://localhost:3000/api/card-themes

# Messages (card contact → dashboard)
curl "http://localhost:3000/api/messages?ownerPhone=9876543210"

# Payments (created automatically on checkout)
curl http://localhost:3000/api/payments

# Reviews
curl http://localhost:3000/api/reviews
curl -X POST http://localhost:3000/api/reviews \
  -H "Content-Type: application/json" \
  -d '{"productSlug":"nfc-business-card","reviewText":"Great card","ratingValue":5,"ownerPhone":"9876543210"}'
```

## Stop the old Express folder
Do **not** run `backend/npm run dev` for the main app.
The live API is inside Next.js (`frontend`).
