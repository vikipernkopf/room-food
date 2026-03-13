# Project commands

This file documents the active npm scripts in `code/package.json`.
Only commands used for Render frontend deploy, remote backend deploy, and local testing are listed.

## Active scripts

- `build`
  - Builds the production frontend bundle and creates a static `dist/roomFood/browser/index.html` from Angular's `index.csr.html` output.
  - Command: `ng build --configuration production --output-hashing none && node scripts/postprocess-index.js`

- `frontend:start`
  - Starts Angular dev server for local frontend testing.
  - Command: `ng serve --proxy-config proxy.conf.json`

- `backend:build`
  - Builds backend server output (creates `dist/roomFood/server/server.mjs`).
  - Command: `ng run roomFood:build:production`

- `backend:dev`
  - Starts API backend directly from TypeScript source for local testing.
  - Command: `npx tsx src/backend/start-api.ts`

- `backend:start`
  - Starts built backend in API-only mode.
  - Command: `cross-env SERVE_FRONTEND=false node dist/roomFood/server/server.mjs`

- `test`
  - Runs unit tests.
  - Command: `ng test`

- `init-db`
  - Initializes local database.
  - Command: `npx tsx src/backend/init-db.ts`

## Render frontend deployment

Render service config (`render.yaml`) uses:

- Build command:
```powershell
cd code
npm ci
npm run build
```

- Start command:
```powershell
cd code
npx serve -s dist/roomFood/browser -l $PORT
```

Why this works:
- Angular currently emits `index.csr.html` for the browser bundle.
- `scripts/postprocess-index.js` copies it to `index.html` after the build.
- `serve -s` serves that file as the app entrypoint and also falls back to it for client-side routes.

## Remote backend deployment

For API-only backend hosting:

- Build + start:
```powershell
cd code
npm ci
npm run backend:build
npm run backend:start
```

If your host expects one command, chain it:

```powershell
npm ci && npm run backend:build && npm run backend:start
```

## Local testing

### 1) Local frontend + local backend

Terminal 1:
```powershell
cd code
npm run backend:dev
```

Terminal 2:
```powershell
cd code
npm run frontend:start
```

### 2) Local frontend + remote backend

Set `code/proxy.conf.json` target to your remote backend host, then run:

```powershell
cd code
npm run frontend:start
```

## Backend URL sources

Frontend API base URL is resolved in this order:

1. `window.__API_URL` / `window.API_URL` (runtime override)
2. `src/environments/environment*.ts` (`environment.apiUrl`)
3. fallback `/api`

Current defaults:
- `src/environments/environment.ts` -> `/api`
- `src/environments/environment.prod.ts` -> `https://roomfood-backend.black2.cf/api`
