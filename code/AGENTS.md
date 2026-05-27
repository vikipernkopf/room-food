
You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## General Rules

- **Never write summary markdown files** unless explicitly asked for. Only write code, tests, and modifications that directly solve the user's problem.

## Where the App Lives

- Work inside `code/`; the repo root mainly holds docs and deployment config.
- Treat `code/AGENTS.md` as the TypeScript/Angular convention source for implementation details.
- The Angular app is standalone-component based and signal-heavy. Match nearby files rather than introducing NgModules.
- Representative patterns: `code/src/frontend/login/login.ts`, `code/src/frontend/profile/profile.ts`,
  `code/src/frontend/rooms/rooms.ts`.
- Current feature patterns also live in `code/src/frontend/room-management-view/room-management-view.ts`,
  `code/src/frontend/room-management-view/edit-room/edit-room.ts`, `code/src/frontend/room-view/calendar/calendar.ts`,
  `code/src/frontend/recipes/recipe-management/recipe-management.ts`,
  `code/src/frontend/rooms/create-room/create-room.ts`, and `code/src/frontend/rooms/join-room/join-room.ts`.
- Global styling lives in `code/src/frontend/styles.scss`; use the shared palette from
  `code/src/frontend/styles/theme.scss` for component colors, and keep the global Angular Material overlay z-index
  override there in mind when working on menus, dialogs, and dropdowns.

## Runtime and Request Flow

- Browser bootstrap: `code/src/frontend/main.ts`.
- SSR bootstrap: `code/src/frontend/main.server.ts` with server config from `code/src/backend/app/app.config.server.ts`.
- Route map: `code/src/backend/app/app.routes.ts`; SSR always renders via `code/src/backend/app/app.routes.server.ts`.
- Combined server: `code/src/backend/server.ts` mounts `/api` before frontend SSR/static handling.
- Standalone API mode: `code/src/backend/api-server.ts` is started by `backend:dev`/`start-api.ts` and serves the same
  `/api` router without the frontend.
- App startup restores auth state by calling `AuthService.restoreSession()` in `code/src/frontend/app/app.ts`; login
  state is cookie-based (`session` cookie verified by `code/src/backend/auth-middleware.ts`).
- API-only mode is controlled by `SERVE_FRONTEND=false` in `code/package.json` (`backend:start`).

## Backend Boundaries

- Each request gets its own `Unit` from `code/src/backend/unit.ts`; use `new Unit(true)` for reads and
  `new Unit(false)` for writes.
- Always close the unit with `unit.complete(...)`; write handlers pass commit/rollback explicitly.
- Routers live under `code/src/backend/*/*-router.ts` and delegate to matching services (for example `login-sign-up`,
  `rooms`, `meal-management`, `room-view`, `recipes`).
- SQLite schema and migrations are centralized in `code/src/backend/unit.ts`;
  `code/src/backend/model.ts` defines the shared DTOs.
- One-off database repair scripts live in
  `code/scripts/`; use them for backfilling existing data after schema or default-value changes (for example
  `code/scripts/backfill-default-images.ts` with `--db <path>` when targeting a specific SQLite file).

## Frontend API Conventions

- API base resolution is the same in `code/src/frontend/core/auth-service.ts`, `room-service.ts`, `meal-service.ts`, and
  `recipe-service.ts`:
  `window.__API_URL` / `window.API_URL` → `environment.apiUrl` → `/api`.
- Frontend services call REST endpoints such as `/api/login`, `/api/signup`, `/api/room/:code/members`,
  `/api/meals/:username`, `/api/meal/:id`, `/api/recipes/raw`, and `/api/recipes/:id`.
- Route-driven views use `ActivatedRoute`, `effect()`, and signals to reload data when params change; see `room-management-view.ts`.

## Workflow Commands

- Run commands from `code/`.
- `npm run frontend:start` starts the Angular dev server with `proxy.conf.json` pointing `/api` to the local backend.
- `npm run backend:dev` starts the API from TypeScript via `src/backend/start-api.ts`.
- `npm run build` is the production build; it also runs `scripts/postprocess-index.js` to copy `index.csr.html` to
  `dist/roomFood/browser/index.html`.
- `npm run backend:build` + `npm run backend:start` runs the built Node server.
- `npm run init-db` initializes the local SQLite database via `src/backend/init-db.ts`.
- `npm test` runs the Vitest-backed Angular test suite.

## Deployment Clues

- `render.yaml` serves `dist/roomFood/browser` with `serve -s ... -l $PORT`.
- `docs/deploy.md` describes GitHub Pages publishing and the `/room-food/` base href used there.
- `docs/commands.md` is the best quick reference for the active scripts and local proxy variants.
- `README.md` lists current public endpoints: GitHub Pages (`https://vikipernkopf.github.io/room-food/`) and Render
  (`https://roomfood.onrender.com`).
- `code/src/environments/environment.prod.ts` points the frontend at `https://roomfood-backend.black2.cf/api`, and
  `code/proxy.conf.json` proxies `/api` to `https://roomfood-backend.black2.cf` for `npm run frontend:start`.
- `code/src/frontend/styles/theme.scss` holds the global color variables and theming, while `code/src/frontend/styles.scss`
  imports Angular Material, Bootstrap, and Inter globally; component styles are in their respective `.scss` files, and
  color choices should stay on the shared theme variables.

## Default Image Data

- Keep the default image URLs in `src/frontend/core/user-form-validation.ts` and
  `scripts/backfill-default-images.ts` in sync.
- When the room or recipe default image changes, update both the UI fallback and the backfill script so existing
  database rows match newly created ones.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Do NOT rely on a mysterious default for `standalone`. Always explicitly set `standalone: true` on standalone components and directives so intent is clear.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

### Angular 21 and Signal-forms (recommended)

- This project targets Angular 21.x. When working with forms prefer the new "signal-forms" API which is the recommended pattern for reactive forms in Angular 21+.
- Import the signal-forms entry from `@angular/forms/signals` (not from the package root). Example imports you will commonly use:
  - `form`, `validate`, `validateTree`, `submit`, `email`, `required`, `pattern`, etc.
  - `FormRoot` and `FormField` directives for template binding
  - `SignalFormControl` or other compatibility adapters when bridging to legacy reactive-form APIs

- Key signal-forms patterns:
  - Use a WritableSignal model as the single source of truth: const model = signal({ ... });
  - Create the form around that model: const f = form(model, schemaOrOptions);
  - Use declarative schema functions (or pre-built schema objects) to attach validators such as `required`, `email`, `minLength`, `maxLength`, `pattern`.
  - Use `validateTree` for cross-field validation (e.g. password / repeat password mismatch). The schema callbacks receive typed helpers for `value()` and `fieldTree` to attach field-level errors.
  - Bind native inputs using the `formRoot` directive on `<form>` and `formField` on inputs: `<form [formRoot]="f"> <input [formField]="f.username">`.
  - Use `submit(f, options)` to perform submission flows and attach server-side errors to fields.

- Why signal forms in this repo?
  - They unify component state and form state into signals which makes templates and tests simpler and avoids many ExpressionChangedAfterItHasBeenCheckedError issues caused by mutating plain class properties during async flows.

### Migration notes & gotchas

- Always import from `@angular/forms/signals` for the signal-based APIs and directives.
- If upgrading Angular or rebuilding dependencies, check peer-deps: `@angular/build` may require `vitest@^4`. Update `devDependencies` accordingly when upgrading tests.
- When converting a component:
  1. Replace FormGroup/FormControl usage with a WritableSignal model and `form(model, schemaFn)`.
  2. Convert any UI state that is mutated as a result of async events (for example `saving`, `activePopup`, `creating`) to signals to avoid change-detection errors.
  3. Update templates to use `[formRoot]` and `[formField]` and access field state via the FieldState signals (e.g. `field().invalid()`, `field().errors()`, `field().touched()`).
  4. Update unit tests to set the model via `model.set({...})` and to assert field state via the FieldState signals.

### Example patterns

- Creating a form around a model:

  const model = signal({ username: '', password: '', repeatPassword: '' });
  const f = form(model, (m) => {
    required(m.username);
    required(m.password);
    required(m.repeatPassword);
    validateTree(m, ({ value, fieldTree }) => {
      const { password, repeatPassword } = value();
      if (!password || password === repeatPassword) return null;
      return [{ kind: 'passwordMismatch', message: 'Passwords do not match', fieldTree: fieldTree.repeatPassword }];
    });
  });

### Testing tips

- Update unit tests to read/write the model signal directly:
  - `component.model.set({ ... })` to populate values prior to detectChanges
  - Use `component.form.username().invalid()` or examine `component.form.username().errors()` to assert validation results
- When upgrading the project to Angular 21, run `npm install` and watch for peer dependency hints. If `npm` reports ERESOLVE problems related to `vitest`, upgrade `vitest` to a 4.x release in `devDependencies`.


## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.
- Do not write arrow functions in templates (they are not supported).
- **Do NOT use inline styles in HTML templates**. All styling must be defined in the corresponding `.scss` file using SCSS classes. Use `class` bindings in templates to apply styles dynamically.

## Styling

- All styling must be in the component's `.scss` file, never use inline `style` attributes in HTML
- Use the shared theme variables and colors from `code/src/frontend/styles/theme.scss`
- Avoid hardcoded colors; always use theme variables like `$color-orange-2`, `$color-input-bg`, etc.
- Component styles are scoped to the component and don't leak globally
- For dynamic styling, use Angular's `class` bindings instead of `ngClass` or `style` attributes

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection
