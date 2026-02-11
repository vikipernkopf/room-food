# Deployment Guide

This project uses two deployments:

1. GitHub Pages (static): serves the Angular browser build at https://<your-user>.github.io/room-food/
2. Render.com (SSR + API): optional, for full SSR + backend with database

## GitHub Pages (static)

The GitHub Actions workflow at `.github/workflows/deploy-pages.yml` builds the Angular app and publishes the browser output to the `gh-pages` branch.

How it works:
- On push to `main`, the workflow runs `npm ci` in `code/` and builds the Angular app with production configuration and `--base-href /room-food/` so routes work under the subpath.
- The build output from `code/dist/roomFood/browser` is published to `gh-pages`.

To set up:
1. Ensure repository name is `room-food`.
2. Make sure GitHub Pages is configured to serve from the `gh-pages` branch (Settings → Pages → Branch: gh-pages).
3. If you want a custom domain, configure it in GitHub Pages settings and set CNAME in the repo.

## Render.com (SSR)

You connected the repository to Render. The `render.yaml` file provides a basic configuration that uses `npm run build` and `npm run serve:ssr:roomFood`. Render will run the server in Node and can serve SSR pages.

Important:
- Render runs the commands in the repo root. `render.yaml` specifies `cd code && npm install && npm run build` which builds the app.
- Ensure environment variables (like `PORT` and DB_PATH) are configured in the Render service settings.

## Notes
- Because GitHub Pages is static, any server-side API must be hosted separately (Render or another provider).
- The GitHub Pages deployment sets the `base-href` so the app is served under `/room-food/` correctly.

