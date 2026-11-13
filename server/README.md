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
