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
import { loginRouter } from './login/login-router';

if (typeof globalThis.__filename === 'undefined') {
  globalThis.__filename = fileURLToPath(import.meta.url);
}
if (typeof globalThis.__dirname === 'undefined') {
  globalThis.__dirname = dirname(fileURLToPath(import.meta.url));
}

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();


app.use(cors());
app.use(express.json());

app.use("/api", loginRouter);

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
