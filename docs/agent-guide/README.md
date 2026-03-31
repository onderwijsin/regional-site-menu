# Agent Guide

Detailed playbook for AI coding agents working in this repository.

This document contains the operational detail behind the concise contract in
[`AGENTS.md`](../../AGENTS.md).

## Mission and Product Context

- Project: **Regional Site Menu** (`regional-site-menu`)
- Domain: Supports Dutch education regions in exploring, auditing, and improving regional website
  content.
- Runtime profile:
  - Nuxt 4 app
  - Fully prerendered production output
  - Mostly client-side logic
  - Deployed to Cloudflare Workers

Core user flows:

1. Explore menu items (`items` content collection)
2. Audit items (score + comment)
3. Generate a PDF report client-side from audit state
4. Submit suggestions via server API to external Datahub

## Non-Negotiable Constraints

- Do not introduce breaking UX or data-shape changes without explicit request.
- Keep edge/runtime compatibility intact (avoid Node-only APIs in shared/client code).
- Treat the PDF pipeline as fragile and high-risk:
  - Prioritize readability and safety.
  - Avoid layout/math rewrites unless necessary and verified.
- Do not add dependencies unless explicitly asked.
- Preserve persisted store keys and semantics in `app/stores/state.ts`.

## Quick Start

Requirements:

- Node `24` (see `.nvmrc`)
- pnpm `10+`
- gitleaks (used by pre-commit hook)

Setup:

```bash
pnpm install
cp .example.env .env
pnpm dev
```

Key commands:

```bash
pnpm dev
pnpm build
pnpm preview
pnpm lint
pnpm lint:fix
pnpm typecheck
pnpm format:check
pnpm format:fix
```

Worker-like local preview:

```bash
pnpm build
npx wrangler --cwd .output dev
```

## Architecture Map

Top-level:

- `app/` Nuxt app code (pages, components, composables, store, plugins)
- `content/` Nuxt Content collections (`items`, `extras`, `faqs`, `_prompts`)
- `schema/` Zod schemas for content-adjacent and API payloads
- `server/` server routes (`api/ai/*`, `api/datahub/*`, assets route handlers)
- `config/` static app behavior config (`constants.ts`, `ai.ts`, head/site/robots)
- `shared/types/` shared TypeScript types

Nuxt config:

- `nuxt.config.ts` controls:
  - modules
  - Cloudflare preset (`cloudflare_module`)
  - prerender behavior
  - runtime config
  - content/site/plausible settings

## Core Data and State

### Content

- Defined in `content.config.ts`.
- Collections:
  - `items` (main menu/audit content)
  - `extras` (resources/tools content)
  - `faqs` (help page FAQ data in YAML files)
  - `_prompts` (AI system prompts for server routes)
- Content is queried with `queryCollection(...)` and related helpers.

### Store

- `app/stores/state.ts` is the central persisted state.
- Persisted keys:
  - `mode`, `filter`, `hideWelcome`, `audit`, `region`, `notes`, `url`
- `audit` is a map keyed by item id with `{ score, comment }`.
- Deletion of audit entries is intentionally done with `delete` to preserve expected
  reactivity/persistence behavior.

### Shared Taxonomy

- `app/composables/content-taxonomy.ts` is the source of truth for:
  - `PILLARS`
  - `GOALS`
  - pillar/goal/scope/priority hint text
  - pillar -> icon name mapping
- Reuse it instead of re-hardcoding literals.

## Component and Composable Patterns

### Components

- Keep presentational concerns in components.
- Keep reusable logic in composables.
- Current examples:
  - Badge presentation in `app/components/badges/*`
  - Report UI in `app/components/report/*`
  - Overlay UI in `app/components/overlays/*`

### Overlays

- Overlay/open-close orchestration lives in composables:
  - `app/composables/use-report.ts`
  - `app/composables/use-report-config.ts`
  - `app/composables/suggestion.ts`
  - `app/composables/welcome.ts`
  - `app/composables/comments.ts`
  - `app/composables/confirm-dialog.ts`

### Data Fetching

- Prefer `useAsyncData` with stable keys.
- Content pages typically fetch by route path:
  - `app/pages/[...slug].vue`
  - `app/pages/extras/[...slug].vue`
- Keep fetch/watch patterns explicit and simple.

### Coding Conventions

For conventions around auto-imports, composable naming/import behavior, and TSDoc/JSDoc
requirements, use:

- [`docs/conventions/README.md`](../conventions/README.md)

## PDF Generation (High-Risk Area)

Main files:

- Entry: `app/composables/report-generator.ts`
- Orchestration: `app/composables/report/sections/document.ts`
- Shared rendering primitives: `app/composables/report/pdf.ts`
- Markdown normalization/rendering: `app/composables/report/markdown/*`
- Section renderers: `app/composables/report/sections/*`
- Deep doc: `docs/report-pdf/README.md`

Rules when editing PDF code:

- Preserve page order in `sections/document.ts`.
- Reuse shared helpers before adding ad-hoc `jsPDF` calls.
- Treat page-break logic as first-class (`ensurePageSpace`, measurement helpers).
- Validate with a real generated PDF for long comments and multi-page sections.

## Server/API and Validation

- API routes:
  - `server/api/ai/briefing.post.ts`
  - `server/api/ai/website-analysis.post.ts`
  - `server/api/datahub/submission.post.ts`
- AI helper modules:
  - `server/utils/ai/*`
  - `server/utils/crawler/*`
- Input schema: `schema/submission.ts`
- Report schema: `schema/reportConfig.ts`
- Content field enums: `schema/fields.ts`

Validation rules:

- Use Zod at boundaries (already established pattern).
- Keep server route logic isolated in `server/api/*`.
- Use `runtimeConfig` for secrets/tokens.

## Runtime and Edge Notes

- Production routes are prerendered.
- App is intentionally client-heavy.
- Cloudflare target is configured through Nitro preset and NuxtHub integration.
- Nuxt Content server queries require the D1 binding `DB` in Cloudflare environments.
- Treat missing `DB` binding errors as real runtime failures (not harmless warnings).
- Nuxt Studio media uploads require the R2 binding `BLOB` in Cloudflare environments.

## Naming and Existing Quirks (Do Not “Fix” Casually)

- Preserve existing naming/file contracts unless explicitly requested.
- Much UI copy is Dutch; preserve tone/language consistency when editing copy.

## Recommended Change Workflow

1. Inspect relevant files first.
2. Keep changes small and scoped.
3. Prefer existing patterns over new abstractions.
4. Run verification:
   - `pnpm lint` (or scoped eslint command)
   - `pnpm typecheck`
   - `pnpm test:unit`
   - `pnpm test:coverage`
5. For PDF-related changes: generate and visually verify a report.

## Pre-Commit / Pre-Push Hooks

- `.husky/pre-commit`:
  - gitleaks
  - `pnpm format:fix` unless `DISABLE_PRE_COMMIT_FORMAT=true`
  - `pnpm lint:fix` unless `DISABLE_PRE_COMMIT_LINT=true`
- `.husky/pre-push`:
  - `pnpm typecheck` unless `DISABLE_PRE_PUSH_TYPECHECK=true`
  - `pnpm lint` unless `DISABLE_PRE_PUSH_LINT=true`

## What To Avoid

- Large rewrites of report/PDF modules.
- Introducing new competing state patterns outside Pinia for persisted audit state.
- Copy-pasting pillar/goal literals instead of using shared taxonomy.
- Mixing server-only assumptions into client composables/components.
