# DPWH 360° Infrastructure Project Monitoring and Transparency System with GIS Mapping, Financial Tracking, and Automated Project Flagging

A web-based system for monitoring Department of Public Works and Highways (DPWH) infrastructure projects in **Occidental Mindoro**: roads, bridges and flood control. It combines 360° site images, phase-by-phase progress, financial tracking, GIS mapping and automatic project flagging so that project information is transparent to the public and easy to audit.

> **Short name:** DPWH 360° (IPMATS)
> **Repository:** `https://github.com/manuelcedricgoco/DPWH-360-IPMATS`

---

## Table of contents

1. [Project overview](#1-project-overview)
2. [Project directory structure](#2-project-directory-structure)
3. [Prerequisites](#3-prerequisites)
4. [Clone the repository](#4-clone-the-repository)
5. [Backend setup (Express API)](#5-backend-setup-express-api)
6. [Frontend setup (React + Vite)](#6-frontend-setup-react--vite)
7. [Database setup (Supabase)](#7-database-setup-supabase)
8. [Run the complete system](#8-run-the-complete-system)
9. [User roles and access](#9-user-roles-and-access)
10. [Troubleshooting](#10-troubleshooting)
11. [Development guidelines](#11-development-guidelines)
12. [Security reminders](#12-security-reminders)
13. [Documentation and support](#13-documentation-and-support)

---

## 1. Project overview

### Description

DPWH personnel register projects and report their progress, finances and 360° site images. The **database itself** checks every project automatically and gives it a flag:

| Flag | Meaning |
|---|---|
| 🟢 Green | On track, or completed |
| 🟡 Yellow | Needs attention (for example a schedule slip, an old or missing 360° image, or a gap between payments and progress) |
| 🔴 Red | For investigation (for example a large delay, a reused image, or payments above the contract amount) |

Auditors review flagged projects, and published information is visible to the public.

> Automatic flags are a **monitoring aid** based on the submitted data. They do not replace engineering inspection or a formal audit.

### Main objectives

- Monitor DPWH projects in Occidental Mindoro through 360° site images and phase-by-phase progress.
- Track budgets, contract amounts, variation orders and disbursements per project.
- Show projects on a map of the province (GIS).
- Flag projects automatically when the schedule, documentation or finances look wrong.
- Let auditors confirm or override flags with a reason and evidence.
- Publish approved project information to the public for transparency.

### Key features

| Feature | Status |
|---|---|
| Sign-in, registration, administrator approval of new accounts | ✅ Built |
| Role-based dashboards (Administrator, DPWH Personnel, Auditor, Public Viewer) | ✅ Built |
| User management (list, approve, reject, activate, deactivate accounts) | ✅ Built |
| Project registration and project list with filters | ✅ Built |
| Contractors and implementing agencies | ✅ Built |
| Automatic flag engine, completion detection, activity log, Row Level Security | ✅ Built (in the database) |
| Audit queue (read-only list of flagged projects) | ✅ Built |
| Phases and progress updates, 360° image upload and viewer, map, finance, flag decisions, reports | 🚧 Planned – the database views and functions already exist; the pages show "not available yet" |

### Technologies

| Layer | Technology (version in `package.json`) |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4, React Router 7 |
| Backend | Node.js, Express 5 (ES modules), dotenv, cors |
| Database and auth | Supabase: PostgreSQL 17, Supabase Auth, Supabase Storage, Row Level Security, pg_cron |
| Supabase client | `@supabase/supabase-js` 2 (client and server) |
| Tooling | npm workspaces, `concurrently` (runs both apps with one command) |
| Planned | OpenStreetMap (map), Pannellum (360° viewer), Chart.js |

### Architecture

```
 Browser (React + Vite, port 5173)
   │
   ├── Sign-in / registration ─────────────► Supabase Auth
   │
   └── /api/...  (Vite proxies to port 4000)
          │
          ▼
   Express API (port 4000)
     • checks the user's token and role
     • queries Supabase WITH THE USER'S TOKEN (anon key + access token)
          │
          ▼
   Supabase PostgreSQL
     • Row Level Security decides what each role can see and change
     • flag engine (triggers + daily pg_cron job) computes progress and flags
     • activity log records every change
```

The client only ever has the public **anon key**. The **service-role key** stays on the server and is used only for server-side jobs, never for normal user requests.

---

## 2. Project directory structure

```
DPWH-360-IPMATS/
├── package.json          npm workspaces ("server", "client") and the root dev scripts
├── package-lock.json     one lockfile for the whole repository
├── .gitignore            keeps node_modules, dist and every real .env file out of Git
├── CLAUDE.md             project rules for Claude Code (and a good summary for people too)
├── README.md             this file
│
├── client/               Frontend – React + Vite + Tailwind (port 5173)
│   ├── .env.example      template for client/.env
│   ├── index.html
│   ├── vite.config.js    dev server on 5173, proxies /api → http://localhost:4000
│   ├── public/images/    DPWH logo and background image
│   └── src/
│       ├── main.jsx, App.jsx      entry point and routes
│       ├── context/               AuthContext (session + profile), ToastContext
│       ├── routes/                ProtectedRoute (login, approval and role checks)
│       ├── lib/                   api.js (calls the Express API), supabaseClient.js, helpers
│       ├── components/            layout, UI kit, charts, dashboards, auth components
│       └── pages/                 auth/, admin/, dpwh/, auditor/, public/
│
├── server/               Backend – Express API (port 4000, all routes under /api)
│   ├── .env.example      template for server/.env
│   ├── README.md         API endpoint list and curl tests
│   └── src/
│       ├── server.js, app.js      start-up and route mounting
│       ├── config/                env.js, supabase.js, permissions.js (who may do what)
│       ├── middleware/            auth.js, role.js, validate.js, errorHandler.js
│       ├── routes/                me, projects, contractors, agencies, lookups, users
│       └── controllers/           the logic behind each route
│
├── database/             Supabase/PostgreSQL – FINISHED and already applied to the IPMATS project
│   ├── README.md         data model, flag rules, roles, views, RPCs, storage buckets
│   ├── migrations/       000_reset.sql … 006_hardening.sql
│   ├── seed/seed.sql     12 fictional sample projects covering every flag scenario
│   └── tests/rls_and_flags_test.sql   role/RLS and flag-engine tests
│
├── docs/                 SYSTEM_CONCEPT.md, WEEK1_GUIDE.md, Final_Progress_Report_Weekly_Tasks.docx
│
├── .claude/skills/       Claude Code project skills (frontend-design), shared with the team
├── skills-lock.json      records where each installed skill came from (source and hash)
├── .gitattributes        stores text files with LF line endings for everyone
```

> `.claude/skills/` and `skills-lock.json` are development aids for Claude Code. They are not needed to run the system. After cloning, Claude Code finds the `frontend-design` skill automatically when you open this folder; nothing has to be installed.
>
> If you install or update a skill with the `npx skills` installer, it also creates an `.agents/` folder. That folder is ignored by Git. Commit the updated copy under `.claude/skills/` (as real files, not a link) together with `skills-lock.json`.

---

## 3. Prerequisites

| Software | Required version | Download |
|---|---|---|
| **Node.js** (includes npm) | **22.12 or newer**. `@supabase/supabase-js` needs Node ≥ 22 and Vite 8 needs ≥ 22.12 (or 20.19). Use the current **LTS** release. Verified on Node 26.13 / npm 11.20. | https://nodejs.org/ |
| **npm** | Comes with Node.js (version 7 or newer is needed for workspaces) | – |
| **Git** | Any recent version | https://git-scm.com/downloads |
| **Code editor** | VS Code recommended | https://code.visualstudio.com/ |
| **Web browser** | A current Chrome, Edge or Firefox | – |
| **Supabase account** | Access to the **IPMATS** project (ask the team leader) or your own project | https://supabase.com/ |

Check your versions in PowerShell:

```powershell
node -v
npm -v
git --version
```

---

## 4. Clone the repository

```powershell
git clone https://github.com/manuelcedricgoco/DPWH-360-IPMATS.git
cd DPWH-360-IPMATS
```

If you use a fork or another remote, replace the URL with `YOUR_GITHUB_REPOSITORY_URL` and the folder with `YOUR_PROJECT_FOLDER`.

### Install all dependencies (once)

This repository is an **npm workspace**. One install at the **root** installs the root tools, the server and the client together:

```powershell
npm install
```

> Running `npm install` inside `server/` or `client/` also works, because npm finds the workspace root, but installing from the root is the simplest and keeps the single `package-lock.json` in sync.

---

## 5. Backend setup (Express API)

### Step 1 – Go to the server folder

```powershell
cd server
```

### Step 2 – Install dependencies

Skip this if you already ran `npm install` at the root.

```powershell
npm install
```

### Step 3 – Create `server/.env`

```powershell
Copy-Item .env.example .env
```

### Step 4 – Fill in the environment variables

Open `server/.env` in VS Code. These are the variables the server reads (`server/src/config/env.js`):

| Variable | Required | What to put |
|---|---|---|
| `SUPABASE_URL` | **Yes** | The Supabase project URL. For IPMATS it is already in the template: `https://indtgynilfigtqaljblc.supabase.co` |
| `SUPABASE_ANON_KEY` | **Yes** | The project's **anon / public** key (Supabase Dashboard → Project Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Server-only key for future background jobs. **Not used by any current route.** Leave it empty unless the team leader tells you otherwise. **Never commit it.** |
| `PORT` | No | API port. Default `4000` |
| `CLIENT_URL` | No | Address allowed by CORS. Default `http://localhost:5173` |

The server stops with `Missing environment variables: ...` if `SUPABASE_URL` or `SUPABASE_ANON_KEY` is empty.

### Step 5 – Supabase connection

There is nothing else to configure. `server/src/config/supabase.js` builds a Supabase client for each request using the anon key **plus the signed-in user's access token**, so the database's Row Level Security applies to that user.

### Step 6 – Database migrations

**Not needed for the IPMATS project** – all migrations and the seed are already applied. Only follow [section 7](#7-database-setup-supabase) if you are setting up a **new** Supabase project.

### Step 7 – Start the API

From `server/`:

```powershell
npm run dev
```

`npm run dev` runs `node --watch src/server.js` and restarts on file changes. `npm start` runs the server without auto-restart.

You should see:

```
DPWH 360 API listening on http://localhost:4000/api
```

### Step 8 – Check that it works

Open a second PowerShell window. In PowerShell use **`curl.exe`**, not `curl`; plain `curl` is an alias for `Invoke-WebRequest`.

```powershell
curl.exe http://localhost:4000/api/health
```

Expected: `{"status":"ok","time":"..."}`

```powershell
curl.exe http://localhost:4000/api/me
```

Expected: `{"error":"Missing bearer token"}` (HTTP 401). This means authentication is active.

The full endpoint list, and how to test with a real token, is in [`server/README.md`](server/README.md).

---

## 6. Frontend setup (React + Vite)

### Step 1 – Open another terminal

Keep the backend terminal running. Open a new PowerShell window or VS Code terminal in the project folder.

### Step 2 – Go to the client folder

```powershell
cd client
```

### Step 3 – Install dependencies

Skip this if you already ran `npm install` at the root.

```powershell
npm install
```

### Step 4 – Create `client/.env`

```powershell
Copy-Item .env.example .env
```

### Step 5 – Fill in the environment variables

| Variable | Required | What to put |
|---|---|---|
| `VITE_SUPABASE_URL` | **Yes** | Same project URL as the server (already in the template for IPMATS) |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | The **anon / public** key. **Never** put the service-role key here: everything in `client/.env` is shipped to the browser. |

If either value is missing, the page stays blank and the browser console shows `Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY`.

> After changing `client/.env`, stop and restart `npm run dev`. Vite reads `.env` only at start-up.

### Step 6 – Start the Vite dev server

```powershell
npm run dev
```

### Step 7 – Open the app

Go to **http://localhost:5173**. You will be sent to the sign-in page.

The client calls the API through relative `/api/...` URLs. In development, Vite forwards them to `http://localhost:4000` (`client/vite.config.js`), so **the backend must be running** for data to load.

### Production build (optional)

```powershell
npm run build
npm run preview
```

`npm run build` writes the static site to `client/dist/`. The `/api` proxy only exists in the Vite dev server, so a real deployment needs a web server or host that forwards `/api` to the Express API.

---

## 7. Database setup (Supabase)

### 7.1 Using the existing IPMATS project (normal case)

The database is **finished and live** in the Supabase project **IPMATS** (`https://indtgynilfigtqaljblc.supabase.co`, PostgreSQL 17). Migrations `000`–`006` and `seed/seed.sql` are already applied.

1. Ask the team leader to invite you to the Supabase project, or to share the **anon key**.
2. Copy the anon key from **Project Settings → API** into `server/.env` and `client/.env` (sections 5 and 6).
3. That's all. **Do not run migrations again on IPMATS.** `000_reset.sql` drops and recreates the schema.

> **Team rule (CLAUDE.md):** never edit the files in `database/` and never change the schema of the live project.

### 7.2 Setting up a new Supabase project (only for a fresh copy)

1. Create a project at https://supabase.com/dashboard.
2. Open **SQL Editor** and run the files **in order**, one at a time:
   ```
   database/migrations/000_reset.sql
   database/migrations/001_core_schema.sql
   database/migrations/002_phases_finance.sql
   database/migrations/003_images_storage.sql
   database/migrations/004_flags_audit.sql
   database/migrations/005_rls_views.sql
   database/migrations/006_hardening.sql
   ```
   - `000` enables the **pg_cron** extension, which the daily flag check needs (`dpwh360-daily-flag-check`).
   - `003` creates the private **storage buckets** `panoramas` (30 MB), `project-documents` (20 MB) and `audit-evidence` (20 MB), with their storage policies. Nothing has to be created by hand.
   - `005` and `006` set up **Row Level Security**, grants, views and RPCs. RLS is configured entirely by these scripts; do not add policies by hand.
3. Create at least one account per role (see 7.3 and 7.4). Then run `database/seed/seed.sql` to load 12 **fictional** sample projects. The seed is re-runnable. It skips the audit samples if no approved auditor exists.
4. Optional check: run `database/tests/rls_and_flags_test.sql`. It must end with `ALL TESTS PASSED`. It runs in a transaction and keeps nothing.
5. Put the new project's URL and anon key in both `.env` files.

Full details are in [`database/README.md`](database/README.md).

### 7.3 Authentication settings (Supabase Dashboard → Authentication)

- **Email sign-in** is what the app uses (email + password). Google and Facebook sign-in are **not** implemented.
- **Email confirmation:** if "Confirm email" is on, new users must click the link in their inbox before signing in. The registration page tells them so.
- **URL configuration:** for local development set **Site URL** to `http://localhost:5173`, so confirmation links come back to the app.
- **Leaked password protection:** turn it on under Authentication → Providers/Policies (recommended in `database/README.md`; it cannot be set from SQL).
- There is **no self-service password reset** in the app yet. The "Forgot password?" link tells users to contact the administrator.

### 7.4 Creating the first administrator

Every sign-up starts as a **public viewer**. People who ask for DPWH Personnel or Auditor access wait until an **administrator** approves them in **User management**. The very first administrator must therefore be set once, **by the project owner**, in the Supabase **SQL Editor**:

1. Register normally in the app with the email that should become administrator.
2. In the SQL Editor run (replace the email):
   ```sql
   update public.profiles
      set role = 'administrator', is_approved = true, is_active = true, requested_role = null
    where email = 'YOUR_ADMIN_EMAIL@example.com';
   ```
3. Sign out and sign in again. You land on the Administrator dashboard.

After that, approve and manage every other account from **User management** in the app. It uses the `admin_set_user_access` database function, and every change is recorded in the activity log.

### 7.5 Verify the database connection

1. With both servers running, sign in at http://localhost:5173.
2. If your dashboard shows project numbers (or an empty-state message) without a red error, the API reached Supabase.
3. API check with a token: see "Current profile with a token" in [`server/README.md`](server/README.md).

---

## 8. Run the complete system

**Start order:** backend first, then frontend. The frontend still loads without the backend, but every data request fails until the API is up.

### Option A – two terminals (clearest)

**Terminal 1 – Express backend**

```powershell
cd DPWH-360-IPMATS
npm run dev:server
```

**Terminal 2 – React/Vite frontend**

```powershell
cd DPWH-360-IPMATS
npm run dev:client
```

`dev:server` and `dev:client` are **root** scripts, so run them from the project root. Inside `server/` or `client/`, use `npm run dev` instead.

### Option B – one terminal

From the project root:

```powershell
npm run dev
```

This uses `concurrently` to start both. The output lines are labelled `server` (blue) and `client` (green).

### Local addresses

| What | URL |
|---|---|
| Web app | http://localhost:5173 |
| API base | http://localhost:4000/api |
| API health check | http://localhost:4000/api/health |
| API through the Vite proxy | http://localhost:5173/api/health |

Stop a server with **Ctrl + C** in its terminal.

---

## 9. User roles and access

| Role | What they can do |
|---|---|
| **Administrator** | Manage users (approve, reject, activate, deactivate, assign roles), agencies and contractors, register and edit projects, read activity logs, edit system settings (flag thresholds). |
| **DPWH Personnel** | Register and edit projects, contractors and barangays; upload progress, finance records, 360° images and documents; update corrective actions assigned to them. |
| **Auditor** | Read all project data; review flags (confirm, or override with a reason and evidence); record findings and corrective actions; publish reviewed information to the public. |
| **Public Viewer** | Read **published** projects and approved images, documents and findings. |

These are the permissions the **database** grants each role. Some of the matching pages (for example image upload, flag decisions and system settings) are still planned; see [Key features](#key-features).

How accounts get access:

1. Anyone can register at `/register` and choose **DPWH Personnel**, **Auditor** or **Public Viewer only**.
2. **Public viewer** accounts are active right away.
3. **DPWH Personnel** and **Auditor** requests wait on a "Waiting for approval" page until an administrator approves them in **User management**. The administrator can confirm or change the role and assign an agency.
4. Every privilege requires an **approved and active** account. These rules are enforced by the database (Row Level Security), not only by the web pages. See the **Roles and permissions** page in the app, or `database/README.md` → "Roles and access (RLS)".

> **Demo accounts:** no shared demo credentials are published in this repository. Ask the team leader for a test account, or create your own as described above. Never write real passwords in this README, in issues or in commit messages.

---

## 10. Troubleshooting

| Problem | What to do |
|---|---|
| **`npm install` fails** | Check `node -v`; you need **22.12 or newer**. Delete `node_modules` (root, and `server/` or `client/` if present) and run `npm install` again from the **root**. Behind a proxy or firewall, check your network settings. |
| **`npm run dev:server` says "Missing script"** | Root scripts only work in the **root** folder. Inside `server/` or `client/`, use `npm run dev`. |
| **`Missing environment variables: SUPABASE_URL, SUPABASE_ANON_KEY`** | `server/.env` is missing or empty. Run `Copy-Item .env.example .env` inside `server/` and fill in the values. |
| **Blank page; console says `Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY`** | Create and fill `client/.env`, then **restart** `npm run dev` in `client/`. |
| **Port already in use (`EADDRINUSE` / "Port 5173 is in use")** | Another program or an old server is using the port. Close the other terminal, or find the process with `netstat -ano \| findstr :4000` (or `:5173`), check what it is, then end it in Task Manager. You can also set another `PORT` in `server/.env`, but then update the proxy target in `client/vite.config.js` too. |
| **"Cannot reach the server. Is it running on port 4000?"** | The Express API is not running, or it runs on another port. Start it with `npm run dev:server` and check http://localhost:4000/api/health. |
| **API returns 401 `Invalid or expired token`** | Your session expired, or the server and client use **different Supabase projects or keys**. Sign out and in again, and make sure both `.env` files point to the same project. |
| **"Waiting for approval" after signing in** | Normal for new DPWH Personnel or Auditor accounts. An administrator must approve the account in User management, then click **Check again**. |
| **"Please confirm your email address first"** | Click the confirmation link Supabase sent, or ask the project owner to check the Auth email settings (section 7.3). |
| **"Incorrect email or password"** | Check the email and password. There is no self-service reset yet; ask the administrator. |
| **User management shows "The server does not recognise /api/users"** | The Express server is running old code. Stop it (Ctrl + C) and start it again. |
| **Page loads but data shows a permission error (403)** | Your role is not allowed to do that action. This is enforced by Row Level Security. See section 9. |
| **Database setup errors on a new project** | Run the migrations **in order** from `000` to `006`, one file at a time, in the SQL Editor. The seed needs approved accounts first (section 7.2). |
| **CORS error in the browser** | Open the app at `http://localhost:5173` (it goes through the Vite proxy). If you serve the client from another address, set `CLIENT_URL` in `server/.env`. |

---

## 11. Development guidelines

### Everyday commands (from the project root)

```powershell
npm install            # install or update dependencies for root, server and client
npm run dev            # start server and client together
npm run dev:server     # start only the Express API (port 4000)
npm run dev:client     # start only the Vite dev server (port 5173)
npm run build -w client   # production build of the frontend
```

There are no automated test or lint scripts in `package.json` yet. Database tests are in `database/tests/rls_and_flags_test.sql`.

### Git workflow

1. Update your local `main`:
   ```powershell
   git checkout main
   git pull origin main
   ```
2. Create a branch for your task:
   ```powershell
   git checkout -b feature/short-description
   ```
3. Commit small, clear steps. The project's history uses messages like `Week 1 – Julina: projects, contractors and agencies API`.
   ```powershell
   git add path\to\changed\files
   git commit -m "Week 2 – Name: what you did"
   ```
4. Push and open a Pull Request on GitHub for review:
   ```powershell
   git push -u origin feature/short-description
   ```
5. Before committing, run `git status` and make sure **no `.env` file** is listed.

### Project rules (see CLAUDE.md)

- **Never edit `database/`** and never change the schema of the live project.
- Use the **exact** table, view, column and RPC names listed in `database/README.md`.
- **Flags, progress and `completion_status` are computed by the database.** Never calculate or write them in Node or React.
- Who may read or write each record type lives in one file: `server/src/config/permissions.js`. Keep it in line with the RLS rules.
- Protect API routes with `requireAuth()` / `optionalAuth` and `requireRole(...)`. Use `req.db` (the user's own client) for normal requests.
- The UI must not claim that flags replace engineering inspection or a formal audit.

---

## 12. Security reminders

**Never commit, paste or share:**

- real `.env` values
- the Supabase **service-role key** (it bypasses all Row Level Security)
- API secrets or access tokens
- real administrator or user passwords
- any other private credential

**Good practice:**

- Document variables only in `server/.env.example` and `client/.env.example`, with empty values or placeholders.
- `.gitignore` already excludes `.env` and `.env.*` (except `.env.example`), keys and certificates. Check `git status` before every commit anyway.
- The service-role key belongs **only** in `server/.env`, and only for server-side jobs. Everything in `client/.env` (`VITE_...`) is visible to anyone who opens the website.
- If a secret is ever committed or shared, **rotate it immediately** in the Supabase Dashboard (Project Settings → API). Deleting the commit is not enough.

---

## 13. Documentation and support

| Topic | Where |
|---|---|
| System concept (approved proposal, objectives, modules, roles) | [`docs/SYSTEM_CONCEPT.md`](docs/SYSTEM_CONCEPT.md) |
| Week 1 guide (folder structure, who built what, workflow) | [`docs/WEEK1_GUIDE.md`](docs/WEEK1_GUIDE.md) |
| Weekly progress report | `docs/Final_Progress_Report_Weekly_Tasks.docx` |
| Database: data model, flag rules, roles and RLS, views, RPCs, storage | [`database/README.md`](database/README.md) |
| API: endpoints, request and response format, curl tests | [`server/README.md`](server/README.md) |
| Project rules and conventions | [`CLAUDE.md`](CLAUDE.md) |
| Field rules for forms (server-side validation) | `server/src/middleware/validate.js` |
| Permissions per record type | `server/src/config/permissions.js` |

**Team**

| Member | Role |
|---|---|
| Goco | Team leader, back-end, server setup |
| Julina | Back-end API |
| Tracy | Front-end: login, project pages |
| Jonalyn | Front-end: register, contractor and agency pages |

For access to the Supabase project, keys or test accounts, contact the team leader.
