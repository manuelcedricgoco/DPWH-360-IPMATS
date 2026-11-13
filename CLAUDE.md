# DPWH 360° IPMATS – rules for Claude Code

DEVELOPMENT OF A WEB-BASED DPWH 360°  INFRASTRUCTURE PROJECT MONITORING  AND TRANSPARENCY  SYSTEM WITH GIS MAPPING, FINANCIAL TRACKING, AND AUTOMATED PROJECT FLAGGING

## About the system
Full concept: `docs/SYSTEM_CONCEPT.md` (read it when a task touches a module not yet built). Its "Implementation notes" section, `database/README.md`, and this file take precedence over the proposal text.

- **Purpose:** monitor DPWH infrastructure projects in **Occidental Mindoro** (roads, bridges, flood control) through 360° site images, phase-by-phase progress, financial tracking, GIS mapping and auditing, for transparency.
- **Roles:**
  - `administrator`: users, roles, settings.
  - `dpwh_personnel`: register projects, upload progress and 360° images.
  - `auditor`: review flags (confirm or override with a reason and evidence), findings, reports.
  - `public_viewer`: read-only access to published information.
- **Automatic flags:** green = on track / completed, yellow = needs attention, red = for investigation. They are computed **in the database** (`evaluate_project()` triggers + a daily pg_cron job), never in Node or React. Never re-implement or write the flag or progress columns.
- **Completed** means all phases are at 100%, an actual completion date exists, and a final 360° image exists.
- **Map flow:** a marker click loads `v_project_details`, then a signed URL for `latest_image_path` from the `panoramas` bucket, which opens in Pannellum. With no image, show "No 360° image available yet".
- **Stack:** React + Vite + Tailwind, Express API, Supabase (Postgres, Auth, Storage, RLS), OpenStreetMap, Pannellum, Chart.js.
- **Team:** Goco (leader, back-end, server setup), Julina (back-end API), Tracy (front-end: login, project pages), Jonalyn (front-end: register, contractor and agency pages).
- **Week 1 is done:** auth, roles, the projects/contractors/agencies API, Login/Register/Pending, the project form and list, and the contractor and agency pages. Later modules (phases and progress, 360° upload and viewer, map, flags and audit, finance, reports, dashboard) are still to be built on top of the existing database views and RPCs.
- **Since Week 1:** role dashboards for all four roles, the audit queue, and administrator User Management (`GET /api/users`, `PATCH /api/users/:id/access` → `admin_set_user_access`, see `server/README.md`). Modules without an API yet show a "not available yet" page; never fill them with sample data.
- Automatic flags are a monitoring aid. They don't replace engineering inspection or a formal audit, so UI text must not claim otherwise.

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
