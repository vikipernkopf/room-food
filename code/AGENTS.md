
You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

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

- Template binding:

  <form [formRoot]="f" (ngSubmit)="onSubmit()">
    <input id="username" [formField]="f.username" />
    <div *ngIf="f.username().touched() && f.username().invalid()">...</div>
  </form>

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

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection
