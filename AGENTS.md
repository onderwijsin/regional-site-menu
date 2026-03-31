# AGENTS.md

Operational contract for AI coding agents working in this repository.

## Critical Rules (MUST)

- You MUST not introduce breaking UX or data-shape changes without explicit request.
- You MUST keep edge/runtime compatibility intact (avoid Node-only APIs in shared/client code).
- You MUST treat the PDF pipeline as high-risk and avoid layout/math rewrites unless necessary and
  verified.
- You MUST not add dependencies unless explicitly asked.
- You MUST preserve persisted store keys and semantics in `app/stores/state.ts`.
- You MUST preserve existing naming and file contracts unless explicitly requested.
- You MUST reuse shared taxonomy (`app/composables/content-taxonomy.ts`) instead of re-hardcoding
  literals.
- You MUST follow coding conventions documented in `docs/conventions/README.md`.

## Working Defaults (SHOULD)

- You SHOULD keep presentational concerns in components and reusable logic in composables.
- You SHOULD keep server route logic in `server/api/*` and helper logic in `server/utils/*`.
- You SHOULD use Zod for boundary validation.
- You SHOULD prefer small, scoped changes that follow existing patterns.

## Commit and PR Rules

- You MUST use Conventional Commit messages.
- Commit header format: `<type>(<optional-scope>): <subject>` (for example
  `feat(report): add AI loading stage toggles`).
- Allowed commit `type` values: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`,
  `build`, `perf`, `revert`.
- You MUST keep commit subject compatible with `commitlint` rules (see `commitlint.config.js`,
  including max header length).
- You MUST use semantic PR titles in the same conventional format so PR title lint passes
  (`.github/workflows/lint_pr_title.yml`).

## Definition of Done

1. Relevant checks pass: `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, and `pnpm test:coverage`.
2. For PDF-related changes, a real report is generated and visually verified.
3. Persisted store semantics remain intact.
4. Any non-obvious convention/architecture changes are reflected in `docs/`.

## Rule Priority (When Rules Conflict)

1. User-facing data contracts and persisted-state semantics
2. Runtime/edge compatibility and deployment constraints
3. Correctness and safety in high-risk modules (especially PDF/report generation)
4. Existing architecture patterns and module boundaries
5. Style and naming conventions

## Documentation Map

- Project overview: `README.md`
- Agent playbook (detailed): `docs/agent-guide/README.md`
- Conventions and coding rules: `docs/conventions/README.md`
- Auditing domain notes: `docs/auditing/README.md`
- Content domain notes: `docs/content/README.md`
- PDF/report domain notes: `docs/report-pdf/README.md`
- AI integration domain notes: `docs/ai-integration/README.md`
- Sentry/observability notes: `docs/sentry/README.md`
- Turnstile/security domain notes: `docs/turnstile/README.md`
- Testing guide: `docs/testing/README.md`
- CI/CD guide: `docs/ci-cd/README.md`
- Config guide: `docs/config/README.md`
- App report composables guide: `docs/app/report-composables/README.md`
- App report markdown guide: `docs/app/report-markdown/README.md`
- Server AI API guide: `docs/server/api/ai/README.md`
- Server Datahub API guide: `docs/server/api/datahub/README.md`
- Server AI utilities guide: `docs/server/utils/ai/README.md`
- Server crawler utilities guide: `docs/server/utils/crawler/README.md`

## Quick Commands

```bash
pnpm dev
pnpm build
pnpm preview
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:coverage
```
