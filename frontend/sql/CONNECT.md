# Complete connection (Backend → Database → Frontend)

## Stack
1. **Backend:** Next.js App Router (`frontend/app/api/*`) — TypeScript
2. **Database:** Supabase Postgres
3. **Frontend:** Super Admin Products UI → calls `/api/categories` + `/api/products`

## One-time database setup (required)

Tables are **not created yet** until you run SQL:

1. Open Supabase → **SQL Editor** → New query
2. Paste contents of `frontend/sql/schema.sql`
3. Click **Run**

Then seed defaults:

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
- http://localhost:3000/api/health  → should show `"ok": true`
- http://localhost:3000/super-admin?tab=products

## Stop the old Express folder
Do **not** run `backend/npm run dev` for the main app.
The live API is inside Next.js (`frontend`).
