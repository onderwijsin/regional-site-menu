# Project Conventions

This document captures practical development rules and conventions for this repository.

## Primary Sources

- Agent/developer guardrails: [AGENTS.md](../../AGENTS.md)
- Runtime/config constraints: [nuxt.config.ts](../../nuxt.config.ts)

## Architecture Conventions

1. Keep presentational concerns in components and reusable logic in composables.
2. Keep server boundary logic in `server/api/*`; keep helper logic in `server/utils/*`.
3. Validate boundary payloads with Zod (`schema/*`).
4. Reuse shared taxonomy/types instead of duplicating string literals.

## Type Conventions

1. Prefer shared primitive aliases from:
   - [shared/types/primitives.d.ts](../../shared/types/primitives.d.ts)
2. Avoid deriving domain types via `ItemsCollectionItem['...']` in app code when shared aliases
   exist.
3. Keep enum/type source of truth in:
   - [schema/fields.ts](../../schema/fields.ts)

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

1. Keep prompts in content (`content/prompts`) with typed keys.
2. Keep route files controller-level; move parsing/formatting helpers to `server/utils/ai`.
3. Preserve strict request/response schema validation.
4. Include analysis traceability metadata for verification.

Reference:

- [docs/ai-integration/README.md](../../docs/ai-integration/README.md)

## Tooling and Quality Gates

1. Run `pnpm lint` and `pnpm typecheck` for meaningful changes.
2. Keep formatting/linting consistent with project config.
3. Respect Husky hooks unless intentionally bypassed for specific workflows.

## Change Management

1. Prefer small, scoped changes.
2. Avoid introducing dependencies unless required.
3. Avoid broad rewrites in high-risk modules (PDF/report generation) without explicit need.
4. Document non-obvious architectural changes in `docs/`.
