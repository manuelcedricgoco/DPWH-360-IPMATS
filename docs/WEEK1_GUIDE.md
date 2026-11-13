# DPWH 360° – Week 1 Guide (Goco, Julina, Jonalyn, Tracy)

The database is already **finished and live** in Supabase project **IPMATS**. Week 1 is only the server (Node/Express) and the client (React + Vite + Tailwind) built on top of it. **Do not change the database schema.**


## 1. Should you inspect the database first? Yes, briefly, and read-only
Spend about 10 minutes on this before writing code:

| Check | Where | Why |
|---|---|---|
| 22 tables and 7 views exist (`projects`, `contractors`, `implementing_agencies`, `profiles`, `municipalities`, `barangays`, `v_project_details` …) | Supabase Dashboard → Table Editor, or Claude Code with the Supabase MCP in **read-only** mode | Make sure you're connected to the right project |
| Your 6 accounts and roles (admin, 3 DPWH personnel, auditor, public viewer) | Table Editor → `profiles` | You need one approved account per role to test Login |
| Project URL, **anon/publishable key**, **service_role key** | Dashboard → Project Settings → API | These go in the `.env` files |
| Auth → Email: is "Confirm email" on? | Dashboard → Authentication → Sign In / Providers | Affects how Register behaves while you test |
| Read `database/README.md` | the zip | Column names, enums, which roles can write which tables |

Exact values the Week 1 forms must use (all enforced by the database):

**Projects** (Tracy's form, Julina's API):
- **Fields:** `project_code`, `contract_reference_no`, `name`, `description`, `project_type`, `agency_id`, `contractor_id`, `approved_budget`, `contract_amount`, `municipality_id`, `barangay_id`, `latitude`, `longitude`, `notice_to_proceed`, `duration_days`, `target_completion_date` (optional, auto = NTP + duration − 1), `status`.
- **Allowed values:**
  - `project_type` is `road`, `bridge` or `flood_control`.
  - `status` is `active`, `suspended` or `cancelled`.
  - `latitude` must be between 12.10 and 13.95, and `longitude` between 119.95 and 121.20.
  - `contract_amount` must not exceed `approved_budget`.
- **Read-only** (computed by the database): progress, flags, completion status, `is_published`.

**Contractors** (Jonalyn):
- Fields: `name`, `license_number`, `address`, `contact_person`, `contact_email`, `contact_phone`, `is_active`.
- Admin and DPWH personnel can add and edit; only admin can delete.

**Agencies** (Jonalyn):
- Fields: `name`, `acronym`, `office_type` (`regional_office`, `district_engineering_office`, `provincial_office`, `central_office`, `other`), `address`, `contact_email`, `contact_phone`, `is_active`.
- Only admin can write.

**Register** (Jonalyn):
- Call `supabase.auth.signUp({ email, password, options: { data: { full_name, office, requested_role } } })`.
- `requested_role` is `dpwh_personnel` or `auditor`.
- The database creates the profile as an *unapproved* public viewer until an admin approves it.

**Login** (Tracy):
- After sign-in, read `profiles` (`role`, `is_approved`, `is_active`).
- Redirect by role: administrator → `/admin`, dpwh_personnel → `/dpwh`, auditor → `/auditor`, public_viewer → `/public`. An unapproved user sees a "waiting for approval" notice.

---

## 2. Folder structure: one repo, front end and back end side by side
```
dpwh-360-system/
├── package.json            ← root: npm workspaces ["server","client"], script "dev" runs both (concurrently)
├── .gitignore              ← node_modules, .env, dist
├── README.md
├── CLAUDE.md               ← rules for Claude Code (see §4)
├── docs/                   ← proposal, progress report
├── database/               ← DONE (from the zip): migrations 000–006, seed, tests, README – do not edit
├── server/                 ← Node.js + Express (port 4000)
│   ├── package.json
│   ├── .env.example        ← SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, PORT, CLIENT_URL
│   └── src/
│       ├── server.js, app.js
│       ├── config/supabase.js
│       ├── middleware/  auth.js, role.js, validate.js, errorHandler.js
│       ├── routes/      projects.js, contractors.js, agencies.js, lookups.js
│       └── controllers/ projects.controller.js, contractors.controller.js, agencies.controller.js
└── client/                 ← React + Vite + Tailwind (port 5173, proxies /api → 4000)
    ├── package.json, vite.config.js, index.html
    ├── .env.example        ← VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY  (never the service key)
    └── src/
        ├── main.jsx, App.jsx
        ├── lib/        supabaseClient.js, api.js
        ├── context/    AuthContext.jsx
        ├── routes/     ProtectedRoute.jsx
        ├── components/ layout/, common/
        └── pages/
            ├── auth/   Login.jsx, Register.jsx, PendingApproval.jsx
            ├── admin/  AgenciesPage.jsx, ContractorsPage.jsx
            └── dpwh/   ProjectListPage.jsx, ProjectFormPage.jsx
```
How the two halves talk:
- **Login and Register** go straight to Supabase Auth from the client.
- **Project, contractor and agency data** go client → `/api/...` (Node) → Supabase.
- **The server forwards the user's login token**, so the database's role rules (RLS) still apply. The service key is only for server-only jobs, never for normal user requests.

---

## 3. Who owns which files in Week 1, and the order to build them
| Order | Member | Week 1 task | Files |
|---|---|---|---|
| 1 | **Goco** (Leader/Back-end) | Server's Supabase connection and role-based access | root `package.json`, `.gitignore`, `CLAUDE.md`, `server/package.json`, `server/.env.example`, `server/src/server.js`, `app.js`, `config/supabase.js` (a client created per request with the user's token), `middleware/auth.js` (verifies the token and loads the profile), `middleware/role.js` (`requireRole('administrator','dpwh_personnel')`), `middleware/errorHandler.js` |
| 2 | **Julina** (Back-end) | Node.js API for projects, contractors, agencies + user authentication | `routes/projects.js`, `contractors.js`, `agencies.js`, `lookups.js` (municipalities, barangays); `controllers/*.controller.js`; `middleware/validate.js` (checks the field rules from §1) |
| 3 | **Tracy** (Front-end) | Login page; project registration form and project list | `client/` scaffold (Vite + Tailwind), `lib/supabaseClient.js`, `lib/api.js`, `context/AuthContext.jsx`, `routes/ProtectedRoute.jsx`, `components/layout/`, `App.jsx` routes, `pages/auth/Login.jsx`, `pages/dpwh/ProjectFormPage.jsx`, `ProjectListPage.jsx` |
| 4 | **Jonalyn** (Front-end) | Register page; contractor and agency pages | `pages/auth/Register.jsx`, `PendingApproval.jsx`, `pages/admin/ContractorsPage.jsx`, `AgenciesPage.jsx` |

Why this order: Goco's server setup comes before Julina's routes. Tracy's AuthContext and api.js come before the pages that use them, including Jonalyn's.

---

## 4. How to work with Claude Code in the new folder
1. Make the folder, open it in VS Code, and unzip the zip into `database/` and `docs/`.
2. Run `git init`. **Commit after each member's part**, e.g. "Week 1 – Goco: server setup and auth middleware". That gives a clean history per member.
3. Create `CLAUDE.md` with these rules:
   - The database is finished; never change the schema.
   - Read `database/README.md` for table and column names.
   - The service key goes only in `server/.env`.
   - Each form must follow the field rules in §1.
4. Optional: add the Supabase MCP to Claude Code with **read-only** on, so it can check table names itself.
5. Give Claude Code **one member's part at a time**, in the order from §3. Example prompt:
   > "Week 1 – Goco: scaffold the server in `server/` as described in CLAUDE.md: Express app, `config/supabase.js` that creates a Supabase client per request using the user's access token, `middleware/auth.js` that verifies the token and loads `profiles` (role, is_approved, is_active), `middleware/role.js` with `requireRole(...)`, and `errorHandler.js`. Add `.env.example`. Don't touch `database/`."

## Verification (end of Week 1)
- `npm run dev` at the root starts both the server (4000) and the client (5173).
- Log in with each of the 6 accounts. Each lands on the right page; a newly registered DPWH or auditor account sees "waiting for approval".
- A DPWH account can add a project with a contractor and an agency. It shows in the list with phases created automatically (check `project_phases` in the Table Editor).
- An invalid entry, such as a contract amount above the budget or coordinates outside Occidental Mindoro, is rejected with a clear message.
- A public viewer can't reach `/dpwh` or `/admin`, and an API call without a token returns 401.
- `.env` files aren't in git.
