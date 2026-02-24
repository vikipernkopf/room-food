import express from 'express';
import { loginRouter } from './login/login-router';

const app = express();
app.use(express.json());

app.get('/_health', (_req, res) => res.json({ ok: true }));

app.use('/api/login', loginRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});

if (require.main === module) {
  const port = process.env["PORT"] || 3001;
  app.listen(port, () => console.log(`API server listening on http://localhost:${port}`));
}

export default app;

