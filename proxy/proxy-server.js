import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT ?? 3002;
const BACKEND_URL = process.env.BACKEND_URL ?? 'https://roomfood-backend.black2.cf';

// Allow requests from your frontend domain(s)
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? 'https://roomfood.onrender.com,http://localhost:4200')
.split(',')
.map(o => o.trim());

app.use(cors({
	origin: (origin, callback) => {
		if (!origin || ALLOWED_ORIGINS.includes(origin)) {
			callback(null, true);
		} else {
			callback(new Error(`CORS: origin ${origin} not allowed`));
		}
	},
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
	allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
	exposedHeaders: ['Set-Cookie'],
}));

// Health check so Render knows the service is up
app.get('/_health', (_req, res) => res.json({ ok: true }));

// Forward everything under /api to the real backend
app.use('/api', createProxyMiddleware({
	target: BACKEND_URL,
	changeOrigin: true,
	// Keep the /api prefix – the real backend already expects it
	pathRewrite: { '^/api': '/api' },
	on: {
		error: (err, _req, res) => {
			console.error('Proxy error:', err.message);
			res.status(502).json({ error: 'Bad gateway – backend unreachable' });
		},
	},
}));

app.listen(PORT, () => console.log(`Proxy listening on port ${PORT} → ${BACKEND_URL}`));