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
- Cloudflare Workers (via NuxtHub / Nitro preset)

---

## Project Structure

- `app/` — pages, layouts, components, composables, store, plugins
- `content/` — markdown collections (`items`, `extras`, `prompts`)
- `schema/` — Zod schemas (forms, report config, enums)
- `server/` — API routes (e.g. Datahub submission proxy)
- `config/` — head, site, robots config
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
```

Update `.env` as needed.

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
pnpm format:check
pnpm format:fix
pnpm analyze
```

---

## Environment Variables

Use `.example.env` as template.

### Core

- `MODE` (`dev | next | preview | live-preview | prod`)
- `APP_URL`
- `API_TOKEN`
- `DISABLE_TRACKING`
- `PLAUSIBLE_DOMAIN` (optional override)

### Cloudflare

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_CACHE_NAMESPACE_ID`
- `WORKER_NAME`

### Datahub

- `DATAHUB_URL`
- `DATAHUB_TOKEN`

### Git hooks toggles

- `DISABLE_PRE_COMMIT_FORMAT`
- `DISABLE_PRE_COMMIT_LINT`
- `DISABLE_PRE_PUSH_TYPECHECK`
- `DISABLE_PRE_PUSH_LINT`

---

## Content Management

This project uses [Nuxt Content](https://content.nuxt.com/).

### Collections

Defined in `content.config.ts`:

- `items` — main menu content
- `extras` — additional tools/resources

### Databaseless architecture

Nuxt Content typically uses SQLite at build/runtime. In this project:

- The app is fully prerendered
- No server-side database is used at runtime
- Content is queried client-side via a **WASM SQLite database in the browser**

Flow:

1. Build generates a content dump
2. Client downloads dump on first query
3. Local SQLite instance is initialized in-browser

Result:

- No D1 binding required
- Local warnings about missing bindings can be ignored (if no actual errors)

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
- prompt management through Nuxt Content (`content/prompts/*`)
- PDF sections for AI output

Detailed integration documentation:

- [AI Integration README](./docs/ai-integration/README.md)

---

## Documentation

Additional technical docs:

- [Nuxt Content Usage](./docs/content/README.md)
- [Auditing Feature](./docs/auditing/README.md)
- [Project Conventions](./docs/conventions/README.md)
- [CI/CD](./docs/ci-cd/README.md)
- [Report PDF Pipeline](./docs/report-pdf/README.md)

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
  - `next` → staging environment
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
