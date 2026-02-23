import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from '../backend/app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
