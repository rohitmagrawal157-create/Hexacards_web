# HexaCards API (Next.js App Router + TypeScript)

Server routes live under `app/api/*` (TypeScript Route Handlers) and talk to **Supabase**.

## Setup

1. Copy env:

```bash
cp .env.example .env.local
```

Fill:

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

2. In Supabase SQL Editor, run `sql/schema.sql`.

3. Start Next.js (frontend + TypeScript API together):

```bash
npm run dev
```

## Endpoints

- `GET/POST /api/categories`
- `GET/PUT/DELETE /api/categories/:id`
- `GET/POST /api/products`
- `GET /api/products/by-category`
- `GET/PUT/DELETE /api/products/:id`

Typed helpers: `lib/server/catalog-types.ts`, `lib/admin-catalog-db.ts`
