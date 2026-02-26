// TypeScript
import express from 'express';
import { loginSignUpRouter } from './login-sign-up/login-sign-up-router';
import {roomViewRouter} from './room-view/room-view-router';

declare global {
	var __roomFoodServerStarted: boolean | undefined;
}

export function createApiRouter() {
	const router = express.Router();

	router.get('/_health', (_req, res) => res.json({ ok: true }));

	// Also mount the same router at the API root so callers can POST to /api/signup and /api/login
	// (the frontend expects /api/signup and /api/login).
	router.use('/', loginSignUpRouter);
	router.use('/', roomViewRouter);

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

export function startServer() {
	if (globalThis.__roomFoodServerStarted) return;
	globalThis.__roomFoodServerStarted = true;

	const port = Number(process.env['PORT'] ?? '3001');
	const host = process.env['HOST'] ?? '0.0.0.0';

	const app = createApiApp();
	const server = app.listen(port, host, () =>
		console.log(`API server listening on http://localhost:${port}`)
	);

	server.on('error', (err: NodeJS.ErrnoException & { code?: string }) => {
		if (err && err.code === 'EADDRINUSE') {
			console.error(`Port ${port} in use, exiting.`);
			process.exit(1);
		}
		console.error('Server error:', err);
		process.exit(1);
	});

	return server;
}

// NOTE: removed automatic startup when imported. Call `startServer()` explicitly
// from your main process (or mount `createApiApp()` into your SSR/combined server).

export default createApiApp;
