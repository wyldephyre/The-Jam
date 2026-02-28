# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Two-package Node.js monorepo (not a workspace monorepo): `backend/` (Express API on port 3001) and `frontend/` (React + Vite on port 5173). See `README.md` for full setup and usage docs.

### Running the dev servers

**Backend (Express):** The project uses ESM (`"type": "module"`) and `dotenv.config()` in the module body, but ESM static imports are hoisted before the body executes. This means `.env` vars are not available when `services/supabase.js` is imported. You must source the env file into the shell before starting:

```bash
cd backend && set -a && source .env && set +a && npx nodemon src/index.js
```

**Frontend (Vite):** Standard Vite dev server with API proxy to `localhost:3001`:

```bash
cd frontend && npm run dev
```

### Environment variables

- `backend/.env` — requires `VIEWER_PASSWORD`, `ADMIN_PASSWORD`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`. Spotify vars are optional.
- `frontend/.env` — requires `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- For local dev without a real Supabase project, use placeholder values. Auth endpoints (`/api/auth/verify`, `/api/health`) work without Supabase; routes touching the database will return 500s.

### Testing passwords (local dev)

Default dev passwords: `VIEWER_PASSWORD=testviewer`, `ADMIN_PASSWORD=testadmin`.

### No lint/test tooling

This project has no ESLint, Prettier, or automated test configuration. The only checks available are `npm run build` (frontend) and verifying that the backend starts (`/api/health` returns `{"status":"ok"}`).

### External dependencies

Supabase (PostgreSQL + Realtime) and Spotify Web API are external SaaS services. Without real Supabase credentials, database-dependent features (viewer tracking, song requests, admin management) will error. The core UI, routing, and auth password-gate work with placeholder credentials.
