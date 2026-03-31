# Project Conventions

This document captures practical development rules and conventions for this repository.

## Primary Sources

- Agent/developer guardrails: [AGENTS.md](../../AGENTS.md)
- Detailed agent playbook: [docs/agent-guide/README.md](../agent-guide/README.md)
- Runtime/config constraints: [nuxt.config.ts](../../nuxt.config.ts)

## Architecture Conventions

1. Keep presentational concerns in components and reusable logic in composables.
2. Keep server boundary logic in `server/api/*`; keep helper logic in `server/utils/*`.
3. Validate boundary payloads with Zod (`schema/*`).
4. Reuse shared taxonomy/types instead of duplicating string literals.

## Nuxt Auto-Import Conventions

1. In Nuxt runtime files, rely on Nuxt auto-imports for low-level Vue primitives and Nuxt
   composables/utilities.
2. This applies to both runtime code and types.
3. Do not explicitly import APIs that Nuxt auto-imports in these contexts (for example `ref`,
   `computed`, `watch`, `Ref`, `ComputedRef`, `useAsyncData`, `useState`).
4. In files outside Nuxt auto-import scope (for example isolated scripts), explicit imports are
   acceptable.

## Type Conventions

1. Prefer shared primitive aliases from:
   - [shared/types/primitives.d.ts](../../shared/types/primitives.d.ts)
2. Avoid deriving domain types via `ItemsCollectionItem['...']` in app code when shared aliases
   exist.
3. Keep enum/type source of truth in:
   - [schema/fields.ts](../../schema/fields.ts)

## Function Documentation Conventions

1. Every function should include a concise TSDoc/JSDoc comment.
2. At minimum, document:
   - a brief description of behavior
   - inputs and output (`@param` / `@returns`)
   - thrown errors (`@throws`) when applicable
3. Add `@example` for complex functions.
4. Add additional tags when useful (`@remarks`, `@see`, `@deprecated`, etc.).

## Config Documentation Conventions

1. In `config/*` files, every config object property should have a concise one-line JSDoc comment.
2. In config-related type definitions, each type property should include a one-line TSDoc/JSDoc
   comment.
3. Keep comments concrete and behavioral (what the setting controls), not implementation trivia.

## Composable Naming and Import Conventions

1. Standard composables are named `useSomeComposable`.
2. In explicit-import scenarios, deviation from the `use*` naming pattern is allowed when
   intentional.
3. Composables starting with `use` rely on Nuxt auto-imports and should not be explicitly imported.
4. Files that define `use*` composables should export only that composable, and filename and
   composable name should match.
5. Non-`use*` composables/constants/helpers should be explicitly imported so origin remains clear.
6. Examples:
   - Explicit import required:
     - `import { GOALS, PILLARS } from '~/composables/content-taxonomy'`
   - Explicit import not allowed:
     - `import { useReportGenerationExecution } from '~/composables/report-generation-execution'`

## State Conventions

1. Persisted store keys are part of user-facing contract; treat changes as breaking.
2. Keep audit state in Pinia store (`state.ts`) and avoid parallel state systems.
3. Preserve deletion semantics (`delete`) where relied upon for persistence/reactivity.

## PDF Conventions

1. PDF layout is fragile; treat spacing and pagination as high-risk changes.
2. Keep section ordering explicit in `sections/document.ts`.
3. Prefer shared PDF helpers over ad-hoc `jsPDF` calls.
4. Verify with real report output after PDF-related changes.

Reference:

- [docs/report-pdf/README.md](../../docs/report-pdf/README.md)

## AI Conventions

1. Keep prompts in content (`content/_prompts`) with typed keys.
2. Keep route files controller-level; move parsing/formatting helpers to `server/utils/ai`.
3. Preserve strict request/response schema validation.
4. Include analysis traceability metadata for verification.

Reference:

- [docs/ai-integration/README.md](../../docs/ai-integration/README.md)

## Sentry and Cloudflare Conventions

1. With Nitro `cloudflare_module`, do not manually add `compatibility_flags: ["nodejs_compat"]` in
   wrangler config files unless a specific override is required.
2. Do not read Sentry runtime values from `process.env` in server runtime code (`server/*`, plugins,
   routes, middleware). Configure values in `nuxt.config.ts` `runtimeConfig` and consume via
   `useRuntimeConfig()`.
3. Set Sentry `environment` from `MODE` using the mapping:
   - `dev -> development`
   - `preview -> preview`
   - `prod -> production`
4. Keep the Sentry integration baseline enabled unless intentionally scoped:
   - `zodErrorsIntegration` in Sentry init (client + server) for enriched Zod validation context.
   - Keep AI provider selection centralized in `server/utils/ai/provider.ts`; avoid ad-hoc provider
     initialization in route files.

## Tooling and Quality Gates

1. Run `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, and `pnpm test:coverage` for meaningful
   changes.
2. Keep formatting/linting consistent with project config.
3. Resolve `eslint-plugin-jsdoc` findings for exported functions in app/server/schema/shared code.
4. Respect Husky hooks unless intentionally bypassed for specific workflows.

## Testing Conventions

1. Use Vitest for unit/integration tests and keep tests close to behavior contracts.
2. Use `@nuxt/test-utils` for Nuxt runtime tests and auto-import mocking.
3. Keep external integrations mocked in tests unless explicitly testing network boundaries.

## Change Management

1. Prefer small, scoped changes.
2. Avoid introducing dependencies unless required.
3. Avoid broad rewrites in high-risk modules (PDF/report generation) without explicit need.
4. Document non-obvious architectural changes in `docs/`.

## Commit and PR Conventions

1. Use Conventional Commit messages: `<type>(<optional-scope>): <subject>`.
2. Keep commit `type` in the allowed set from [`commitlint.config.js`](../../commitlint.config.js):
   - `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `build`, `perf`, `revert`
3. Keep commit subjects compliant with commitlint checks (for example max header length and subject
   rules).
4. Use semantic PR titles in the same conventional format so CI title validation passes
   ([`.github/workflows/lint_pr_title.yml`](../../.github/workflows/lint_pr_title.yml)).
