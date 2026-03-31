# Testing

This repository uses **Vitest + @nuxt/test-utils** for logic-focused testing.

Current implementation intentionally focuses on Vitest-based logic tests. We currently do **not**
run Playwright/browser UX suites in CI for this project.

We currently focus on:

1. **Unit tests** in Node for fast verification of pure composables, schemas, and server-side
   helpers.
2. **Nuxt runtime tests** for logic that relies on Nuxt auto-imports/runtime behavior.

## Commands

```bash
pnpm test:unit
pnpm test:unit:watch
pnpm test:coverage
```

Nuxt runtime tests run with a test-focused Nuxt module set (`isTest` in `nuxt.config.ts`) to keep
the environment deterministic and avoid unrelated plugin/runtime noise.

## Module Usage In Tests

The test environment intentionally does **not** load the full production module list. When `isTest`
is true, Nuxt uses a smaller `testModules` set in `nuxt.config.ts`.

### Why we keep `testModules` small

1. Keep tests fast and deterministic.
2. Avoid module side effects unrelated to the behavior under test.
3. Avoid requiring external/runtime integrations (analytics, studio, platform bindings) during
   logic-focused test runs.
4. Keep failures actionable by reducing environment noise.

### When a module SHOULD be included in `testModules`

Add a module when one or more of these apply:

1. App logic under test directly depends on that module's runtime behavior/injections.
2. It is part of a core behavior contract we must preserve in tests.
3. Excluding it makes the target tests unrealistic or invalid.

Do not include a module only because it exists in production.

### Current included examples

- `@pinia/nuxt`
- `pinia-plugin-persistedstate/nuxt`
- `@vueuse/nuxt`

These are included because state and composable logic in this project depends on them.

### How to include a module in tests

1. Add it to the `testModules` array in [`nuxt.config.ts`](../../nuxt.config.ts).
2. Add/update tests proving the module-dependent behavior.
3. Verify:
   - `pnpm test:unit`
   - `pnpm test:coverage`
   - `pnpm lint`
   - `pnpm typecheck`
4. Update this section with a short reason for inclusion.

### When to remove a module from `testModules`

Remove a module when no tests depend on its runtime behavior. After removal, run the same
verification commands and confirm behavior/coverage remain correct.

## Structure

- All automated test files belong under `tests/**` (never in `app/**` or `server/**`).
- Prefer a path layout that mirrors the source tree under test when practical.
- `tests/unit/**`:
  - fast node-based tests
  - pure utils, schemas, and handler boundary tests
- `tests/nuxt/**`:
  - Nuxt environment tests (auto-import composables/stores)
- `tests/setup/**`:
  - Nuxt test setup (Pinia bootstrap, runtime resets)

## Conventions

1. Keep tests focused on behavior (not implementation details).
2. Prefer deterministic mocks for external services (`$fetch`, OpenAI, Datahub).
3. Prefer Nuxt-native runtime support (`defineVitestProject`, `environment: 'nuxt'`,
   `mockNuxtImport`) over manual global stubs.
4. Keep Nuxt runtime state isolated per test (`tests/setup/nuxt.ts` creates a fresh Pinia).
5. Keep coverage reporting enabled in CI, but do not enforce hard thresholds until the baseline is
   stable.
6. Many tests were authored with AI assistance; inspect failing tests critically before deciding
   whether to change production code or test expectations.

## Dependency Patch Policy

We currently ship one test-related dependency patch:

- `patches/@nuxt__test-utils@4.0.0.patch`

### Why this patch exists

`@nuxt/test-utils@4.0.0` imports `vitest/environments`, which triggers this warning on Vitest
`4.1+`:

`Importing from "vitest/environments" is deprecated since Vitest 4.1. Please use "vitest/runtime" instead.`

The patch updates `@nuxt/test-utils` internals to import from `vitest/runtime`, removing warning
noise in local runs and CI logs.

### When this patch can be removed

Remove the patch once all of the following are true:

1. We upgrade to an `@nuxt/test-utils` release that natively uses `vitest/runtime` (or otherwise no
   longer imports `vitest/environments`).
2. Running `pnpm test:unit` shows no Vitest deprecation warnings.
3. The patch file no longer applies meaningful changes (or is empty after regenerating).

### How to remove it safely

1. Upgrade `@nuxt/test-utils` (or related Nuxt test stack) to the fixed version.
2. Delete `patches/@nuxt__test-utils@4.0.0.patch`.
3. Remove `@nuxt/test-utils@4.0.0` from `pnpm.patchedDependencies` in `package.json`.
4. Run `pnpm install` and re-run:
   - `pnpm test:unit`
   - `pnpm test:coverage`
   - `pnpm lint`
   - `pnpm typecheck`
