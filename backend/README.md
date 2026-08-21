# HexaCards Backend

**Preferred API:** Next.js App Router (TypeScript) in `frontend/app/api/*`

This `backend/` folder is an optional standalone **TypeScript + Express** server.
The live app uses the Next.js routes by default.

## Next.js API (recommended)

```bash
cd frontend
cp .env.example .env.local   # add SUPABASE_* keys
# run sql/schema.sql in Supabase
npm run dev
```

Routes:
- `frontend/app/api/categories/**/*.ts`
- `frontend/app/api/products/**/*.ts`

## Optional Express (TypeScript)

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Uses `tsx` to run TypeScript directly.
