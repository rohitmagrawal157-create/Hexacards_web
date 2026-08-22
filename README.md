# HexaCards

NFC business cards, standees, and digital profile products — Next.js frontend with Supabase-backed admin catalog.

## Quick start (local)

```bash
cd frontend
cp .env.example .env.local   # add Supabase keys
# run frontend/sql/schema.sql in Supabase
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Structure

- `frontend/` — Next.js app (UI + `/api` backend routes)
- `backend/` — optional standalone Express API (**not used on Vercel**)

On Vercel you deploy **one project** from `frontend/`. The Next.js `/api/*` routes are your backend — no separate Express deploy needed.

See `frontend/sql/CONNECT.md` for database setup.

---

## Deploy on Vercel

### 1. Import repo

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import **Hexacards_web** from GitHub
3. **Root Directory:** set to `frontend` (required — Next.js lives here)
4. Framework: **Next.js** (auto-detected)
5. Build command: `npm run build` (default)
6. Output: default (`.next`)

### 2. Environment variables

In Vercel → Project → **Settings → Environment Variables**, add:

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Publishable / anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only; for admin CRUD |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Prod forms | reCAPTCHA site key |
| `RECAPTCHA_SECRET_KEY` | Prod forms | reCAPTCHA secret |

**Do not set** `NEXT_PUBLIC_API_URL` on Vercel — leave it empty so the app calls same-origin `/api/*`.

Apply to **Production**, **Preview**, and **Development**.

### 3. Database (one-time)

1. Supabase → SQL Editor → run `frontend/sql/schema.sql`
2. After deploy, seed products (once):

```bash
curl -X POST https://YOUR-APP.vercel.app/api/setup/seed
```

### 4. Verify

- `https://YOUR-APP.vercel.app/api/health` → `"ok": true`
- `https://YOUR-APP.vercel.app/super-admin?tab=products`

### 5. Redeploy

Push to `main` on GitHub — Vercel redeploys automatically.

Or in Vercel dashboard: **Deployments → ⋯ → Redeploy**.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails / no Next.js detected | Set **Root Directory** to `frontend` |
| `/api/health` 500 | Add Supabase env vars in Vercel; redeploy |
| Super Admin empty products | Run schema SQL + `POST /api/setup/seed` |
| Forms fail reCAPTCHA | Add `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` + `RECAPTCHA_SECRET_KEY` |
