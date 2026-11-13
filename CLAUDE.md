# DPWH 360° IPMATS – rules for Claude Code

DEVELOPMENT OF A WEB-BASED DPWH 360°  INFRASTRUCTURE PROJECT MONITORING  AND TRANSPARENCY  SYSTEM WITH GIS MAPPING, FINANCIAL TRACKING, AND AUTOMATED PROJECT FLAGGING

## Layout (monorepo, npm workspaces)
- `server/` – Node.js + Express (ES modules), port **4000**, all routes under **`/api`**.
- `client/` – React + Vite + Tailwind, port **5173** (proxies `/api` → 4000).
- `database/` – Supabase/PostgreSQL migrations, seed, tests. **Finished and live in Supabase project IPMATS.**
- `docs/` – proposal, progress report, weekly guides.
- `npm run dev` at the root runs server and client together (concurrently).

## Database rules
- The database is **finished**. **Never edit `database/` and never change the schema** (no migrations, no DDL).
- Read `database/README.md` first. Use the **exact** table, view, column, enum and RPC names it lists.
- Roles: `administrator`, `dpwh_personnel`, `auditor`, `public_viewer`. Every privilege requires an approved and active profile.
- Engine-computed columns (progress, flags, `completion_status`, `is_published` …) are read-only through the API; never try to write them.
- Who may read/write each record type lives in one place: `server/src/config/permissions.js`. Keep it in sync with the RLS rules in the README.

## Keys and secrets
- The **service_role key is used only in `server/`** (`supabaseAdmin`), and only for server-side jobs – **never for normal user requests**.
- Normal requests use `req.db` (a client built with the anon key + the user's access token), so the database RLS applies to that user.
- The client only ever gets the anon key (`VITE_SUPABASE_ANON_KEY`).
- **Never commit `.env` files.** Only `.env.example` files go in git.

## Server conventions
- Protect routes with `requireAuth()` / `optionalAuth` (`server/src/middleware/auth.js`) and `requireRole(...)` (`middleware/role.js`).
- Throw/forward Supabase errors with `next(error)`; `middleware/errorHandler.js` maps Postgres codes to HTTP statuses.
