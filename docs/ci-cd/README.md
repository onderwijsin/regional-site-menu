# CI/CD

This project uses GitHub Actions for quality gates, PR preview deployments, releases, and Cloudflare
deployments.

## Workflow Overview

Workflows live in:

- `.github/workflows/`

Key workflows:

- `pull_request.yml`
- `code_quality.yml` (reusable)
- `deploy_worker.yml` (reusable)
- `deploy.yml`
- `content_promote.yml`
- `sync_main_to_content.yml`
- `release.yml`
- `gitleaks.yml`
- `lint_pr_title.yml`

## Pull Request Flow

File:

- `.github/workflows/pull_request.yml`

Behavior:

1. Triggered on PRs targeting `main`.
2. Runs reusable code quality workflow:
   - lint
   - typecheck
   - unit tests + coverage artifact
3. If successful, runs preview deployment via reusable worker deploy workflow.
4. Uses concurrency cancellation per PR branch.

## Content Promotion Flow

Files:

- `.github/workflows/content_promote.yml`
- `.github/workflows/sync_main_to_content.yml`

Behavior:

1. `content_promote.yml` triggers on pushes to `content`.
2. It validates branch diff against `main` using `dorny/paths-filter@v4`.
3. If any file outside `content/**` is present, it fails.
4. If changes are content-only, it merges `content` directly into `main` with a GitHub App token.
5. `sync_main_to_content.yml` triggers on pushes to `main` and merges `main` back into `content` to
   prevent branch drift.
6. `pull_request.yml` skips PR quality/deploy jobs when `head.ref == content`, so content promotions
   do not wait for PR checks.

Required secrets for content promotion:

- `RELEASE_APP_ID`
- `RELEASE_APP_PRIVATE_KEY`

## Code Quality Workflow

File:

- `.github/workflows/code_quality.yml`

Behavior:

- reusable workflow (`workflow_call`)
- supports configurable build/lint/typecheck commands
- runs `lint`, `typecheck`, and `test` as separate jobs
- enforces warning-free linting by running `pnpm lint --max-warnings 0`
- enforces warning-free TypeScript diagnostics (fails on `warning TS...` output)
- enforces changed-file line coverage for touched `app/**`, `config/**`, `schema/**`, `server/**`,
  and `shared/**` TypeScript files (default threshold: `80%`)

### Changed-file coverage gate

The PR code quality workflow compares changed files between PR base/head SHAs and validates line
coverage for changed TypeScript files in:

- `app/**`
- `config/**`
- `schema/**`
- `server/**`
- `shared/**`

Implementation:

- `.github/workflows/code_quality.yml` (`Changed files coverage gate` step)
- `scripts/ci/changed-coverage-gate.mjs`

If no files in this scope changed, the gate is skipped.

### Local verification commands

Run these before opening/updating a PR:

- `pnpm lint --max-warnings 0`
- `APP_URL=https://example.com CLOUDFLARE_D1_DATABASE_ID=local-test-db CLOUDFLARE_R2_BUCKET=local-test-bucket pnpm typecheck`
- `pnpm test:coverage`

To run the changed-file coverage gate locally after generating coverage:

1. Create a changed-files list (example against `origin/main`):
   - `git diff --name-only origin/main...HEAD > changed-files.txt`
2. Run gate script:
   - `node scripts/ci/changed-coverage-gate.mjs --coverage coverage/coverage-summary.json --changed changed-files.txt --threshold 80`

## Preview / Environment Deployments

Files:

- `.github/workflows/deploy_worker.yml` (core deploy logic)
- `.github/workflows/deploy.yml` (orchestration wrapper)

Highlights:

- builds Nuxt app
- deploys via Wrangler
- supports:
  - normal deploys (`wrangler deploy`)
  - preview version uploads (`wrangler versions upload`) followed by promotion
    (`wrangler versions deploy <version-id>@100% --env preview`)
- auto-promotion for preview uploads is controlled by `promote_uploaded_version` (`true` by default)
- keeps the preview environment URL on the latest uploaded preview version
- posts preview URL comments back to PRs for preview runs
- can optionally apply D1 migrations
  - controlled via `apply_db_migrations` workflow input (defaults to `false`)

## Release Flow

Files:

- `.github/workflows/release.yml`
- `.github/workflows/deploy.yml`

Highlights:

- semantic-release workflow is reusable (`workflow_call`)
- uses GitHub App token for release operations
- supports root/all/package-scoped release execution

## Security and Policy Checks

### Secret scanning

File:

- `.github/workflows/gitleaks.yml`

Behavior:

- scans repository history for leaked secrets

### PR title linting

File:

- `.github/workflows/lint_pr_title.yml`

Behavior:

- validates PR titles against semantic PR format

## Environments and Branch Mapping

From deployment orchestration:

- `main` -> `production` (automatic only for content-only pushes)
- PR previews -> `preview` (version uploads)
- `content` -> promoted to `main` via automation workflow

Manual dispatch in `deploy.yml` can override environment selection.

## Operational Notes

1. Deployment uses exported `.env` assembled from GitHub vars + secrets.
2. Preview uploads are restricted to preview environment.
3. For preview uploads, promotion to deployed (`100%`) in `preview` is enabled by default and can be
   disabled with `promote_uploaded_version: false`.
4. `APP_URL` is required for non-preview deployments.
5. Worker deployment status is reflected via GitHub deployment status updates.
6. Cloudflare environments must expose the D1 binding `DB` (including `CLOUDFLARE_D1_DATABASE_ID`).
7. Cloudflare environments must expose the R2 binding `BLOB` (including `CLOUDFLARE_R2_BUCKET`).

## Known Build Workaround

- Nuxt Studio has a temporary Cloudflare edge build patch in this repo:
  - `docs/ci-cd/nuxt-studio-cloudflare-patch.md`
