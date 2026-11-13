# DPWH 360° – Server (Node.js + Express)

API on port **4000**, all routes under `/api`.

## Setup
1. From the **repo root**, install dependencies once: `npm install`
2. Copy `server/.env.example` to `server/.env` and fill in:
   - `SUPABASE_ANON_KEY`: required. Get it from Supabase Dashboard → IPMATS → Project Settings → API.
   - `SUPABASE_SERVICE_ROLE_KEY`: optional, for server-only jobs. Never commit it and never put it in `client/`.

## Starting the server
Which command to use depends on the folder you're in. npm only reads the `package.json` of the current folder.

| You are in | Command | Notes |
|---|---|---|
| repo root (`DPWH-360-IPMATS/`) | `npm run dev:server` | Root script; it runs `npm run dev -w server` |
| `server/` | `npm run dev` | Restarts automatically on file changes (`node --watch`) |
| `server/` | `npm start` | No auto-restart |
| repo root | `npm run dev` | Starts server **and** client. It needs `client/` to exist. |

`npm run dev:server` does **not** work inside `server/`. That script is defined only in the root `package.json`.

You should see: `DPWH 360 API listening on http://localhost:4000/api`

## Testing
Health check, no login needed. It should return `200 {"status":"ok",...}`:
```
curl http://localhost:4000/api/health
```

Current profile without a token. It should return `401 {"error":"Missing bearer token"}`:
```
curl http://localhost:4000/api/me
```

Current profile with a token:
1. Get an access token for a test account:
   ```
   curl -X POST "https://indtgynilfigtqaljblc.supabase.co/auth/v1/token?grant_type=password" -H "apikey: <ANON_KEY>" -H "Content-Type: application/json" -d "{\"email\":\"you@example.com\",\"password\":\"secret\"}"
   ```
2. Call `/api/me` with the `access_token` from the response. It should return `200 {"profile":{...}}`:
   ```
   curl http://localhost:4000/api/me -H "Authorization: Bearer <access_token>"
   ```

An unapproved account still gets its profile from `/api/me`, with `is_approved: false` and its `requested_role`. Other protected routes return 403 for that account.

In PowerShell, use `curl.exe` instead of `curl`. Plain `curl` is an alias for `Invoke-WebRequest`, which takes different arguments.

## Endpoints

| Method | Path | Who |
|---|---|---|
| GET | `/api/projects` `?municipality_id=&project_type=&status=&contractor_id=&agency_id=&search=&limit=&offset=` | any approved user (RLS: public viewers see published projects only) |
| GET | `/api/projects/:id` | any approved user |
| POST | `/api/projects` | administrator, dpwh_personnel |
| PATCH | `/api/projects/:id` | administrator, dpwh_personnel |
| PATCH | `/api/projects/:id/archive` (soft delete) | administrator, dpwh_personnel |
| GET | `/api/contractors`, `/api/contractors/:id` `?search=&is_active=` | staff |
| POST, PATCH | `/api/contractors`, `/api/contractors/:id` | administrator, dpwh_personnel |
| DELETE | `/api/contractors/:id` | administrator |
| GET | `/api/agencies`, `/api/agencies/:id` | any approved user |
| POST, PATCH, DELETE | `/api/agencies`, `/api/agencies/:id` | administrator |
| GET | `/api/lookups/municipalities`, `/api/lookups/barangays?municipality_id=` | anyone, no token needed |

Responses are `{ "data": ... }` on success and `{ "error": "..." }` on failure. Validation errors also include an `errors` array.
Unknown fields and computed fields (progress, flags, `is_published` …) are rejected with 400.

## Testing the API with a DPWH personnel token
Get a token for an approved `dpwh_personnel` account (see "Current profile with a token" above), then set it once.

In **cmd**:
```
set TOKEN=<access_token>
```
In **PowerShell**, use `$env:TOKEN="<access_token>"` and write `$env:TOKEN` instead of `%TOKEN%` in the commands below.

The commands below are written for cmd. Replace the `<...>` ids with real ones from earlier responses.

```
:: Lookups (no token needed)
curl http://localhost:4000/api/lookups/municipalities
curl "http://localhost:4000/api/lookups/barangays?municipality_id=1"

:: Agencies (read)
curl http://localhost:4000/api/agencies -H "Authorization: Bearer %TOKEN%"

:: Contractors
curl http://localhost:4000/api/contractors -H "Authorization: Bearer %TOKEN%"
curl -X POST http://localhost:4000/api/contractors -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"name\":\"Test Builders Inc.\",\"license_number\":\"PCAB-TEST-001\",\"contact_email\":\"test@example.test\"}"
curl -X PATCH http://localhost:4000/api/contractors/<contractor_id> -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"contact_phone\":\"0917 000 0000\"}"

:: Projects
curl -X POST http://localhost:4000/api/projects -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"project_code\":\"TEST-2026-0001\",\"name\":\"Test Road Concreting\",\"project_type\":\"road\",\"agency_id\":\"<agency_id>\",\"contractor_id\":\"<contractor_id>\",\"approved_budget\":5000000,\"contract_amount\":4800000,\"municipality_id\":1,\"latitude\":13.44,\"longitude\":120.73,\"notice_to_proceed\":\"2026-12-01\",\"duration_days\":120}"
curl "http://localhost:4000/api/projects?search=Test" -H "Authorization: Bearer %TOKEN%"
curl http://localhost:4000/api/projects/<project_id> -H "Authorization: Bearer %TOKEN%"
curl -X PATCH http://localhost:4000/api/projects/<project_id> -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"status\":\"suspended\"}"
curl -X PATCH http://localhost:4000/api/projects/<project_id>/archive -H "Authorization: Bearer %TOKEN%"
```

Expected failures with a DPWH token:

| Request | Expected |
|---|---|
| Project with `contract_amount` above `approved_budget` | 400 `contract_amount must not exceed approved_budget` |
| Project with `latitude` 14.5 | 400 latitude out of range |
| Project body containing `overall_progress` or `auto_flag` | 400 read-only fields |
| Same `project_code` twice | 409 `Record already exists` |
| `POST /api/agencies` | 403 (administrator only) |
| `DELETE /api/contractors/<id>` | 403 (administrator only) |
| Any `/api/projects` call without a token | 401 |

After creating a project, open `project_phases` in the Supabase Table Editor. The phases are created automatically.
