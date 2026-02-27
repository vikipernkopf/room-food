import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import cors from 'cors';
import { createApiRouter } from './api-server';

if (typeof globalThis.__filename === 'undefined') {
  globalThis.__filename = fileURLToPath(import.meta.url);
}
if (typeof globalThis.__dirname === 'undefined') {
  globalThis.__dirname = dirname(fileURLToPath(import.meta.url));
}

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();

const angularApp = new AngularNodeAppEngine({
	allowedHosts: ['localhost', 'roomfood.onrender.com'],
});

app.use(cors());

// Don't apply express.json() globally — it consumes the request stream and prevents
// the Angular SSR handler from constructing a fresh Request from the raw incoming
// message. Parse JSON only for API routes below.

// Mount API router under /api and apply JSON body parsing only for API routes
app.use('/api', express.json(), createApiRouter());

// Only mount the frontend (static assets + SSR) if SERVE_FRONTEND !== 'false'
const serveFrontend = (process.env['SERVE_FRONTEND'] ?? 'true') !== 'false';

if (serveFrontend) {
  app.use(
    express.static(browserDistFolder, {
      maxAge: '1y',
      index: false,
      redirect: false,
    }),
  );

  app.use((req, res, next) => {
    angularApp
      .handle(req)
      .then((response) =>
        response ? writeResponseToNodeResponse(response, res) : next(),
      )
      .catch(next);
  });
} else {
  // If frontend is disabled, return 404 for non-API routes to avoid serving the app
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/_health') {
      return next();
    }
    res.status(404).send('Frontend disabled on this server instance');
  });
}

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const { Unit } = await import('./unit.js');

  const unit = new Unit(true);
  unit.complete();
  console.log("Database room-food.db created!");

  const port = process.env['PORT'] || 3000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);
