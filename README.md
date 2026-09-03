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

### 1. Import repo (Services preset)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import **Hexacards_web** from GitHub
3. **Framework Preset:** **Services** (as shown in Vercel UI)
4. Vercel reads root **`vercel.json`** — deploys **frontend only**

> **Why not the `backend/` folder?**  
> Your live API is already inside Next.js at `frontend/app/api/*` (categories, products, health, seed).  
> The `backend/` Express app is optional/local-only. Routing `/api/*` to Express would **break** the Next.js API routes.

### 2. Environment variables

In Vercel → Project → **Settings → Environment Variables**, add:

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Publishable / anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only; for admin CRUD |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Prod forms | reCAPTCHA site key |
| `RECAPTCHA_SECRET_KEY` | Prod forms | reCAPTCHA secret |
| `OTP_SMS_ENABLED` | Login OTP | `true` for live SMS |
| `NIMBUS_SMS_USER_ID` | Login OTP | Nimbus IT user id |
| `NIMBUS_SMS_PASSWORD` | Login OTP | Nimbus password (server-only) |
| `NIMBUS_SMS_SENDER_ID` | Login OTP | DLT sender id (e.g. `HEXACR`) |
| `NIMBUS_SMS_ENTITY_ID` | Login OTP | DLT entity id |
| `NIMBUS_SMS_TEMPLATE_ID` | Login OTP | DLT OTP template id |

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
| "vercel.json required" for multiple services | Push root `vercel.json` (already in repo) — uses **frontend** service only |
| Build fails / no Next.js detected | Use **Services** preset; `vercel.json` sets `frontend` root |
| `/api/health` 500 | Add Supabase env vars in Vercel; redeploy |
| Super Admin empty products | Run schema SQL + `POST /api/setup/seed` |
| Forms fail reCAPTCHA | Add `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` + `RECAPTCHA_SECRET_KEY` |
