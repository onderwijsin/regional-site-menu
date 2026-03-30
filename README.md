![github_banner](https://github.com/user-attachments/assets/641fecad-0b75-4fbb-9d53-22ffb0d819a8)

<p>
  <a href="https://nuxt.com/"><img src="https://img.shields.io/badge/Nuxt-28CF8D?style=flat&logo=nuxt.js" alt="Nuxt"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff" alt="TypeScript"></a>
  <a href="https://www.cloudflare.com/">
    <img src="https://img.shields.io/badge/Cloudflare-Deployed-F38020?logo=cloudflare&logoColor=white" alt="Cloudflare Deployed">
  </a>
  <a href="https://ui.nuxt.com/"><img src="https://img.shields.io/badge/Built_with-NuxtUI-28CF8D" alt="Built with NuxtUI"></a>
</p>

# Regional Site Menu

Regional Site Menu is an interactive web app that helps education regions design, evaluate, and
improve their regional website.

Instead of a fixed template, the app provides a flexible “menu” of website components. Users can:

- explore relevant website components (**inspiration**)
- audit their current site (**evaluation**)
- generate a structured PDF briefing (**follow-up / execution**)

The app is fully prerendered in production, with most logic running client-side.

---

## AI Agent Guide

If you are working on this codebase with an AI coding agent, read [`AGENTS.md`](./AGENTS.md) first.

---

## Tech Stack

- Nuxt 4 (edge runtime, Cloudflare-targeted)
- Nuxt UI + Tailwind CSS
- Nuxt Content (Markdown collections)
- Pinia + `pinia-plugin-persistedstate`
- TipTap (rich text input)
- jsPDF (client-side report generation)
- Cloudflare Turnstile via `@nuxtjs/turnstile` (abuse protection for server routes)
- Cloudflare Workers (via NuxtHub / Nitro preset)

---

## Project Structure

- `app/` — pages, layouts, components, composables, store, plugins
- `content/` — markdown collections (`items`, `extras`, `_prompts`)
- `schema/` — Zod schemas (forms, report config, enums)
- `server/` — API routes (e.g. Datahub submission proxy)
- `config/` — app constants and static config (`constants.ts`, `ai.ts`, head/site/robots)
- `shared/types/` — shared TypeScript types
- `docs/` — technical documentation (AI, content, auditing, conventions, CI/CD, PDF pipeline)

---

## Local Development

### Requirements

- Node.js `24` (see `.nvmrc`)
- pnpm `>=10`
- gitleaks

### Setup

```bash
pnpm install
cp .example.env .env
cp example.wrangler.jsonc wrangler.jsonc
```

Update `.env` and `wrangler.jsonc` as needed.

> The wrangler config is only needed locally, because NuxtHub requires it in local development to
> properly resolve bindings. Any config passed to `nitro.cloudflare.wrangler` will be used in
> production.

### Run

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

### Preview

Nuxt preview:

```bash
pnpm preview
```

Cloudflare Worker-like preview:

```bash
pnpm build
npx wrangler --cwd .output dev
```

---

## Common Commands

```bash
pnpm lint
pnpm lint:fix
pnpm typecheck
pnpm test:unit
pnpm test:coverage
pnpm format:check
pnpm format:fix
pnpm analyze
```

---

## Testing

This project uses **Vitest** with **@nuxt/test-utils** for logic-focused testing.

Current scope:

1. Unit tests in Node (`tests/unit/**`) for pure composables, schemas, and server logic.
2. Nuxt runtime tests (`tests/nuxt/**`) for code that depends on Nuxt runtime/auto-imports.
3. Coverage reporting in CI as artifact/reporting output (no hard threshold gate yet).

Run:

```bash
pnpm test:unit
pnpm test:unit:watch
pnpm test:coverage
```

Important note:

- A significant part of the current test baseline has been authored with AI assistance.
- Treat every failing test as a signal to inspect carefully:
  - verify whether the production behavior changed intentionally
  - verify whether test assumptions are still valid
  - avoid blindly changing app logic only to satisfy a potentially stale test

Detailed testing documentation:

- [Testing Guide](./docs/testing/README.md)
- [Turnstile Integration](./docs/turnstile/README.md)
- [Route Guard](./docs/route-guard/README.md)

---

## Environment Variables

Use `.example.env` as template.

### Core

- `MODE` (`dev | preview | prod`)
- `APP_URL`
- `API_TOKEN`
- `TURNSTILE_SITE_KEY` (Cloudflare public site key)
- `TURNSTILE_SECRET_KEY` (Cloudflare server-side secret key)
- `DISABLE_TRACKING`
- `PLAUSIBLE_DOMAIN` (optional override)

### Cloudflare

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_CACHE_NAMESPACE_ID`
- `CLOUDFLARE_D1_DATABASE_ID`
- `CLOUDFLARE_R2_BUCKET`
- `WORKER_NAME`

### Storage Credentials

- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_ENDPOINT`
- `S3_BUCKET` (should be the same as `CLOUDFLARE_R2_BUCKET`)
- `S3_PUBLIC_URL`

### Datahub

- `DATAHUB_URL`
- `DATAHUB_TOKEN`

### OpenAI

- `OPENAI_API_KEY`
- `OPENAI_MODEL`

### Nuxt Studio

- `STUDIO_GITHUB_CLIENT_ID`
- `STUDIO_GITHUB_CLIENT_SECRET`

### Git hooks toggles

- `DISABLE_PRE_COMMIT_FORMAT`
- `DISABLE_PRE_COMMIT_LINT`
- `DISABLE_PRE_PUSH_TYPECHECK`
- `DISABLE_PRE_PUSH_LINT`

---

## Content Management

This project uses [Nuxt Content](https://content.nuxt.com/) for managing and querying content.

### Collections

Defined in `content.config.ts`:

- `items` — main menu content
- `extras` — additional tools/resources
- `_prompts` - system prompts used in AI integrations

### Database architecture

Nuxt Content runs with a database-backed setup in this project:

- Cloudflare Workers runtime uses a D1 binding named `DB`
- Server-side content queries (for example in AI routes) depend on that binding
- Client-side content queries can still use the browser-side WASM SQLite flow for app navigation

Practical implications:

1. Production/staging deployments must expose the `DB` D1 binding.
2. Local development should provide equivalent bindings through `wrangler.jsonc` and `.env`.

## Nuxt Studio

To make the content managable outside of the codebase, the application leverages the
[Nuxt Studio](https://nuxt.studio/) module. This module integrates seamlessly with Nuxt Content and
provides a visual editing experience for the various content collections.

Editor can log in to the studio with their Github Account. Any changes made in the content files are
directly committed to the `main` branch.

The ci/cd pipeline will notice a change to the `content` directory and trigger a rebuild. (This is
the only case where a production deployment triggers automatically. In all other cases, a manual
deploy is required).

For the current temporary Cloudflare Workers build workaround (Nuxt Studio + `sharp`), see:

- `docs/ci-cd/nuxt-studio-cloudflare-patch.md`

### Requirements

- Users that wish to edit content through Nuxt Studio must have a Github Account with access to the
  repo
- A valid Github OAuth app must be configured, and the `STUDIO_GITHUB_CLIENT_ID` and
  `STUDIO_GITHUB_CLIENT_SECRET` environment variables must be set.

### R2 asset storage (Nuxt Studio)

Nuxt Studio media uploads are stored externally in a Cloudflare R2 bucket.

Requirements:

1. Cloudflare Worker must expose an R2 binding named `BLOB`.
2. `CLOUDFLARE_R2_BUCKET` must be configured in environment variables.
3. Local `wrangler.jsonc` should include matching `r2_buckets` binding config.
4. Add the various `s3` environment variables (`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`,
   `S3_ENDPOINT`, `S3_BUCKET`, `S3_PUBLIC_URL`)

Without the `BLOB` binding/bucket config, Studio asset uploads (and related media access) will fail.

---

## Suggestion Submission (Datahub)

Suggestions are submitted via:

```txt
server/api/datahub/submission.post.ts
```

Validation is handled with:

```txt
schema/submission.ts
```

To replace Datahub, update this endpoint.

---

## AI Integration

The app includes a partial AI integration for report generation:

- AI website analysis (`POST /api/ai/website-analysis`)
- AI briefing generation (`POST /api/ai/briefing`)
- staged client orchestration before PDF generation
- prompt management through Nuxt Content (`content/_prompts/*`)
- PDF sections for AI output

### AI route rate limiting (Cloudflare)

At infrastructure level, expensive AI routes are protected with Cloudflare Security Rules:

- limit: a single IP can send at most `4` requests per `10` seconds to the AI endpoints
- enforcement: if exceeded, requests from that IP are blocked for `10` seconds

Detailed integration documentation:

- [AI Integration README](./docs/ai-integration/README.md)

---

## Documentation

Additional technical docs:

- [Nuxt Content Usage](./docs/content/README.md)
- [Auditing Feature](./docs/auditing/README.md)
- [Project Conventions](./docs/conventions/README.md)
- [Testing](./docs/testing/README.md)
- [CI/CD](./docs/ci-cd/README.md)
- [Report PDF Pipeline](./docs/report-pdf/README.md)
- [Report Composables Notes](./app/composables/report/README.md)
- [Report Markdown Notes](./app/composables/report/markdown/README.md)
- [AI API Route Notes](./server/api/ai/README.md)
- [AI Utility Module Notes](./server/utils/ai/README.md)
- [Crawler Module Notes](./server/utils/crawler/README.md)
- [Datahub API Notes](./server/api/datahub/README.md)
- [Config Module Notes](./config/README.md)

---

## PDF Generation

PDF generation is fully client-side using `jsPDF`.

### Pipeline

1. Collect input (config + audit data)
2. Create render context (`jsPDF`, layout, tokens)
3. Parse markdown (TipTap → internal block model)
4. Measure content + handle pagination
5. Render sections in order:
   - cover
   - introduction
   - notes
   - pillar averages
   - detailed audit items
6. Export via `jsPDF.save()`

### ⚠️ Important

This system is fragile and layout-sensitive.

- Small changes can break pagination
- Layout depends on manual measurements
- Markdown rendering is simplified

If you touch this:

- Expect regressions
- Test with real PDFs
- Re-tune spacing

For internals, see:

```txt
docs/report-pdf/README.md
```

---

## Deployment

Target: **Cloudflare Workers** via Nitro + NuxtHub.

- Optimized for Cloudflare
- Can be adapted to other Nitro targets if needed

Cloudflare resource mapping by environment:

- **KV cache** (`CLOUDFLARE_CACHE_NAMESPACE_ID`): preview and production each use a different KV
  namespace.
- **D1 database** (`CLOUDFLARE_D1_DATABASE_ID`, binding `DB`): preview and production each use a
  different D1 database.
- **R2 media bucket** (`CLOUDFLARE_R2_BUCKET`, binding `BLOB`): preview and production share the
  same bucket.

Important preview behavior:

- All preview versions/workers share the same preview KV + preview D1 resources.
- Nuxt Content database provisioning in preview (based on committed markdown content) writes to the
  shared preview D1 database, so those changes affect every preview worker/version.

Migration would involve:

1. Removing NuxtHub-specific features (e.g. KV cache)
2. Updating `nuxt.config.ts` for a new target

---

## CI/CD

Workflows are defined in `.github/workflows`.

### Overview

- **Pull requests**
  - lint + typecheck
  - preview deployment (Worker version)
- **Branches**
  - `<not-main>` → preview environment
  - `main` → production
- **Deploy flow**
  1. Build (`pnpm build`)
  2. Inject environment variables
  3. Deploy via `wrangler deploy`
  4. Preview deployments use `upload_version=true`
  5. Production uses full deploy
- Deployment status is reported back to GitHub

---

## License

This project is licensed under the [MIT License](./LICENSE).
