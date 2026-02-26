# Project commands

This file documents the npm scripts defined in `code/package.json` and gives example commands to run the frontend and backend locally.

Notes / defaults
- Frontend dev server (Angular) default port: 4200
- API dev server default port: 3001
- Built SSR server default port: 3000
- The backend uses the environment variable `SERVE_FRONTEND` to control whether the built server serves the frontend (static files + SSR) or only exposes the API. When `SERVE_FRONTEND=false`, non-API routes return 404.

Important change (source-run behavior)
- The file `code/src/backend/api-server.ts` no longer calls `listen()` on import. Instead it exports `createApiApp()` and `startServer()`.
- Any npm script that expects importing the module to start the API must call `startServer()` explicitly. A tiny wrapper has been added to support running TypeScript directly in development:
  - `code/src/backend/start-api.ts` — imports and calls `startServer()` so you can run the API with `npx tsx src/backend/start-api.ts`.

Scripts (exact names from `code/package.json`)

- `ng`
  - Alias for the Angular CLI. Use to run Angular CLI subcommands (for example, `npm run ng -- build`).

- `start`
  - Alias that starts the frontend dev server.
  - Equivalent to `npm run frontend:start`.
  - Example (PowerShell):
    ```powershell
    npm run start
    ```

- `watch`
  - Builds the frontend in watch mode for development: `ng build --watch --configuration development`.

- `build`
  - Runs `ng build` (default frontend build).

- `build:ssr`
  - Builds the Server-Side Rendering (SSR) artifacts for the Angular app (produces the server bundle under `dist/roomFood`).
  - Internally: `ng run roomFood:build:production`.

- `frontend:build`
  - Builds the frontend for production with the repository's options and then post-processes the generated `index.csr.html` to produce two ready-to-deploy index files:
    ```text
    ng build --configuration production --output-hashing none --base-href /room-food/ && node scripts/postprocess-index.js
    ```
  - The postprocess script lives at `code/scripts/postprocess-index.js`.
  - Output (in `dist/roomFood/browser`):
    - `index.csr.html` (original build output)
    - `index.room-food.html` (base href set to `/room-food/`) — use when deploying the app under the `/room-food/` path.
    - `index.html` (base href set to `/` and asset links adjusted to be relative) — use when deploying the app at the site root.
  - Use this output to host the static frontend (e.g., GitHub Pages, static hosting).

- `frontend:start`
  - Runs the Angular dev server (`ng serve`).
  - Example (PowerShell):
    ```powershell
    npm run frontend:start
    ```

- `frontend`
  - Runs the production build then starts the frontend dev server:
    ```powershell
    npm run frontend:build && npm run frontend:start
    ```
  - This script is a convenience that builds the frontend assets and then runs the dev server.

- `backend:build`
  - Alias for the SSR build: runs `npm run build:ssr` and produces `dist/roomFood`.

- `backend:dev`
  - Run the API-only backend from source using `tsx` (executes TypeScript directly). Starts the API server which listens on port 3001 by default.
  - Important: this now runs the tiny wrapper that calls `startServer()` instead of importing a module that auto-starts.
  - Example:
    ```powershell
    npm run backend:dev
    # (runs: npx tsx src/backend/start-api.ts)
    ```

- `backend:start`
  - Starts the built server in API-only mode by setting `SERVE_FRONTEND=false` (uses `cross-env` in the script).
  - Runs the server artifact at `dist/roomFood/server/server.mjs` but disables serving the frontend.
  - Example (PowerShell):
    ```powershell
    npm run backend:start
    ```

- `backend:start:full`
  - Starts the built server with frontend serving enabled (SSR + API). Runs `node dist/roomFood/server/server.mjs`.
  - Example (PowerShell):
    ```powershell
    npm run backend:start:full
    ```

- `backend:full`
  - Convenience script: build SSR artifacts and then start the full SSR server:
    `npm run backend:build && npm run backend:start:full`.

- `test`
  - Runs the Angular unit tests (`ng test`).

- `init-db`
  - Initializes the database using the TypeScript script:
    ```powershell
    npm run init-db
    # (this runs: npx tsx src/backend/init-db.ts)
    ```

## Configuring the backend URL

The frontend uses `environment.apiUrl` to determine where to send API requests. By default:

- Local development (`src/environments/environment.ts`) points to `/api`.
- Production (`src/environments/environment.prod.ts`) is configured to `https://roomfood-backend.black2.cf/api` so the deployed frontend will call your hosted backend.

### Development with local backend (recommended)

When running both frontend and backend locally:

1. **Ensure `code/proxy.conf.json` targets localhost**:
   ```json
   {
     "/api": {
       "target": "http://localhost:3001",
       "secure": false,
       "changeOrigin": true,
       "pathRewrite": {}
     }
   }
   ```

2. **Start both services in separate terminals**:
   - Terminal 1: `npm run backend:dev` (starts API on port 3001)
   - Terminal 2: `npm run frontend` (starts frontend on port 4200, proxies `/api` to localhost:3001)

### Development with remote backend

To test against the hosted backend while developing locally:

1. **Update `code/proxy.conf.json` to target the remote backend**:
   ```json
   {
     "/api": {
       "target": "https://roomfood-backend.black2.cf",
       "secure": true,
       "changeOrigin": true,
       "pathRewrite": {}
     }
   }
   ```
   
   Then start only the frontend: `npm run frontend`

## Index files produced by `frontend:build`

After running `npm run frontend:build` the following files will be present in `dist/roomFood/browser`:

- `index.csr.html` — the original build output (base href `/room-food/`).
- `index.room-food.html` — explicitly set to base href `/room-food/` (same behavior as the original build).
- `index.html` — modified to use base href `/` and with asset paths adjusted to be relative so the site can be served from the domain root.

Deployment notes
- If you deploy the `browser` folder to a host at the domain root (https://example.com/), use `index.html`.
- If you deploy under a sub-path `/room-food/` (https://example.com/room-food/), use `index.room-food.html` or `index.csr.html`.
- Some static hosts let you pick a custom index file name — configure it to point to `index.room-food.html` when serving at `/room-food/`.

Deployment hints
- To deploy the backend as an API-only service (e.g., Render), either:
  - Use the Start Command: `npm run backend:start` (recommended), or
  - Set the environment variable `SERVE_FRONTEND=false` in the service settings and run the built server normally.

- To split frontend and backend into two services:
  - Build the frontend (`npm run frontend:build`) and deploy the browser output as a static site.
  - Deploy the backend using `npm run backend:start` (API-only) or `npm run backend:start:full` for SSR+API.

Troubleshooting
- If `/login` or other frontend routes appear while you expected only the API, double-check which script you ran. The SSR server (`backend:start:full`) serves frontend routes; `backend:start` disables serving them.
- If `backend:start` fails on Windows because of differences in environment variable handling, `cross-env` is included in devDependencies so the script should be cross-platform.

## Runtime API URL override (no rebuild needed)

If you want the deployed static frontend to point at a remote backend without rebuilding the app, you can inject the API base URL at runtime by adding a small script in your `index.html` before the main bundle is loaded.

Example (add to the `<head>` of `index.html` or before the `<script src="./main.js">` tag):

```html
<script>
  // Set the remote API base URL for the frontend to use at runtime
  // Replace the value with your backend's URL (no trailing slash):
  window.__API_URL = 'https://roomfood-backend.black2.cf/api';
</script>
```

With the `AuthService` changes, the frontend will pick up `window.__API_URL` if present and send all `/login` and `/signup` requests to that URL. This avoids rebuilding the frontend when you change the backend location.
