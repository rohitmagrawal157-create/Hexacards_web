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
| `country` | Countries (`country_id`, `iso`, `country_name`, `nicename`, `iso3`, `numcode`, `phonecode`, `status`) — India = 1 |

## One-time database setup (required)

Tables are **not created yet** until you run SQL:

1. Open Supabase → **SQL Editor** → New query
2. Paste contents of `frontend/sql/schema.sql` → **Run**
3. Paste contents of `frontend/sql/country-seed.sql` → **Run** (fills ~240 countries; India = `country_id` 1)

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
- http://localhost:3000/api/health  → should show `"ok": true` and `users` check
- http://localhost:3000/super-admin?tab=products
- http://localhost:3000/login  → OTP stored in Supabase `users` table

## User API

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
```

## Stop the old Express folder
Do **not** run `backend/npm run dev` for the main app.
The live API is inside Next.js (`frontend`).
