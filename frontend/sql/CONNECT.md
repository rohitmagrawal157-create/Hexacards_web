# Complete connection (Backend → Database → Frontend)

## Stack
1. **Backend:** Next.js App Router (`frontend/app/api/*`) — TypeScript
2. **Database:** Supabase Postgres
3. **Frontend:** Super Admin Products UI → calls `/api/categories` + `/api/products`
4. **Users / login:** `users` table → `/api/auth/otp/*` + `/api/users`

## Tables (run `frontend/sql/schema.sql`)

| Table | Purpose |
|-------|---------|
| `categories` | Super Admin product sections |
| `products` | Catalog products |
| `users` | Login users (`user_id` 1, 2, 3…, `first_name`, `last_name`, `mobile`, `email`, `password`, flags, `otp`, `otp_expiry`) |
| `user_session` | Login sessions (`id`, `session_id`, `session_token`, `datetime`, `user_id`) |
| `country` | Countries — India = `country_id` 1 |
| `state` | India states / UTs (`state_id`, `state_name`, `state_type`, `status`, `country_id`) |
| `city` | Cities / districts linked to state (`city_id`, `city_name`, `state_id`, `status`) — ~729 rows, IDs match source dump |
| `admin` | Super admins (`aid`, `fname`, `lname`, `email`, `mobile`, `password`, `profile`, `status`) |
| `card_theme` | Card layouts (`theme_id`, `theme_name`, `theme_path`, `status`) — classic, basic, modern… |
| `cards` | Digital cards (`card_id`, `unic_card_name`, profile fields, `theme_id`, social URLs, `status`) |

## One-time database setup (required)

1. Open Supabase → **SQL Editor** → New query
2. Run in this order:
   1. `frontend/sql/schema.sql`
   2. `frontend/sql/country-seed.sql`
   3. `frontend/sql/location-tables.sql` ← creates `state` + `city` if missing
   4. `frontend/sql/state-seed.sql`
   5. `frontend/sql/city-seed.sql`
   6. `frontend/sql/admin-seed.sql` ← default admin login
   7. `frontend/sql/card-theme-seed.sql` ← themes (run before cards if cards missing)
   8. `frontend/sql/cards-table.sql` ← digital cards table (if not in latest schema)

If you already ran an older `schema.sql` without these tables, run the matching create/seed files above.

Then seed catalog defaults:

```bash
curl -X POST http://localhost:3000/api/setup/seed
```

## Env (already in frontend/.env.local)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

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
```

## Stop the old Express folder
Do **not** run `backend/npm run dev` for the main app.
The live API is inside Next.js (`frontend`).
