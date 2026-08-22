# HexaCards

NFC business cards, standees, and digital profile products — Next.js frontend with Supabase-backed admin catalog.

## Quick start

```bash
cd frontend
cp .env.example .env.local   # add Supabase keys
# run frontend/sql/schema.sql in Supabase
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Structure

- `frontend/` — Next.js app (UI + `/api` routes)
- `backend/` — optional standalone Express API (deprecated; use Next.js API instead)

See `frontend/sql/CONNECT.md` for database setup.
