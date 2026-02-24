import express from 'express';
import { loginSignUpRouter } from './login-sign-up/login-sign-up-router';
import { fileURLToPath } from 'node:url';

export function createApiRouter() {
  const router = express.Router();

  router.get('/_health', (_req, res) => res.json({ ok: true }));

  // Also mount the same router at the API root so callers can POST to /api/signup and /api/login
  // (the frontend expects /api/signup and /api/login).
  router.use('/', loginSignUpRouter);

  return router;
}

export function createApiApp() {
  const app = express();
  app.use(express.json());

  // mount router under /api for standalone app
  app.use('/api', createApiRouter());

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  });

  return app;
}

// If this file is executed directly, start the API-only server
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const port = process.env['PORT'] || 3001;
  const app = createApiApp();
  app.listen(port, () => console.log(`API server listening on http://localhost:${port}`));
}

export default createApiApp;
