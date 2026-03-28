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

## Structure

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
   - `pnpm lint`
   - `pnpm typecheck`
