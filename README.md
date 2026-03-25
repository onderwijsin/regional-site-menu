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

## Introduction

Regional Site Menu is an interactive web application that helps education regions design, evaluate,
and improve their regional websites.

Instead of providing a fixed template, the app offers a flexible “menu” of possible website
components. Users can explore these components, assess their current website, and compile a
structured briefing for further development.

---

## Overview

The application supports three main use cases:

- **Inspiration** — Explore what a strong regional website can include
- **Audit** — Evaluate an existing website based on predefined components
- **Briefing** — Select relevant components and generate a structured output for web agencies

The app is prerendered, and most logic runs client-side.

### Tech stack

- Nuxt (edge runtime)
- Nuxt UI + Tailwind CSS
- Nuxt Content (Markdown-based content management)
- Pinia (persisted state)
- Tiptap (rich text input)
- Cloudflare Workers (via NuxtHub)

---

## Local Development

### Requirements

Make sure you have the following installed:

- Node.js >= 24
- pnpm >= 10
- gitleaks

---

### Setup

```bash
pnpm install
```

Copy the environment file:

```bash
cp .env.example .env
```

Update `.env` as needed.

---

### Run the app

```bash
pnpm dev
```

---

### Build

```bash
pnpm build
```

---

### Preview (Cloudflare Worker)

Preview the built app in a Worker-like environment using Wrangler:

```bash
npx wrangler --cwd .output dev
```

---

### Git hooks behavior

This project uses Husky for automated linting and formatting checks.

You can disable specific checks via environment variables:

```bash
DISABLE_PRE_COMMIT_FORMAT=false
DISABLE_PRE_COMMIT_LINT=false
DISABLE_PRE_PUSH_TYPECHECK=false
DISABLE_PRE_PUSH_FORMAT=false
```

---

## Environment variables

Copy `.env.example` to `.env` and update the values.

### Local / development

```bash
DISABLE_PRE_COMMIT_FORMAT=false
DISABLE_PRE_COMMIT_LINT=false
DISABLE_PRE_PUSH_TYPECHECK=false
DISABLE_PRE_PUSH_FORMAT=true

# Enable debug features (true | false)
DEBUG=false

# Mode: dev | next | prod
MODE="dev"

# Public base URL (required)
APP_URL=http://localhost:3000

# Server routes auth
API_TOKEN="<SEE_PROTON_VAULT>"

# Cloudflare config
CLOUDFLARE_ACCOUNT_ID="<SEE_PROTON_VAULT>"
CLOUDFLARE_API_TOKEN="<SEE_PROTON_VAULT>"
CLOUDFLARE_CACHE_NAMESPACE_ID="<SEE_PROTON_VAULT>"
WORKER_NAME=local

# Optional override (defaults to APP_URL host)
PLAUSIBLE_DOMAIN=

# Disable tracking (true | false)
DISABLE_TRACKING=false

# Datahub (required for suggestions feature)
DATAHUB_URL="<HOST_URL>"
DATAHUB_TOKEN="<SEE_PROTON_VAULT>"
```

### Datahub

The Datahub integration is required for submitting **suggestions**. These are handled and stored in
the _Onderwijs in_ backend ("Datahub").

If you want to use a different storage solution, modify:

```txt
server/api/datahub/submission.post.ts
```

---

## Deployment

This project is designed to run on **Cloudflare Workers** using [NuxtHub](https://hub.nuxt.com/).

### Using a different runtime

If needed, the application can be moved to a different runtime with minimal effort, thanks to
[Nitro’s zero-config compatibility](https://nitro.build/deploy) with a wide range of providers.

The dependency on NuxtHub is intentionally limited. It is primarily used for zero-config cache
integration with Cloudflare KV.

Migrating to a different runtime or provider would roughly involve:

1. removing NuxtHub and implementing an alternative storage/cache solution
2. updating the nitro configuration in `nuxt.config.ts`

---

## CI/CD

All workflows and actions are defined locally in the `.github` directory. No remote workflows are
used.

### Overview

- **Pull requests**
  - Run code quality checks (linting + typechecking)
  - Deploy a preview version of the app (Cloudflare Worker version)
- **Branches**
  - `next` → deployed to the `next` environment
  - `main` → deployed to production
- **Releases**
  - Optional semantic releases using `semantic-release`
  - Versioning and changelogs are generated automatically

---

### Deployment process

Deployments are handled via GitHub Actions and follow this flow:

1. **Build**
   - Nuxt app is built using `pnpm build`
   - Output is generated for Cloudflare Workers
2. **Environment setup**
   - All environment variables (GitHub + secrets) are injected into a `.env` file during CI
3. **Deploy via Wrangler**
   - Uses `wrangler deploy`
   - Environment (`preview`, `next`, `production`) determines target
4. **Preview deployments**
   - For PRs, a **Worker version** is uploaded (not a full deploy)
   - A unique preview URL is generated and posted on the PR
5. **Production deployments**
   - Full deployment (not version upload)
   - Uses `APP_URL` as canonical URL

---

### Notes

- `upload_version=true` is only used for preview environments
- Production deployments always use `wrangler deploy`
- Deployment status is reported back to GitHub (success/failure)

---

## Content Management

This project uses the [Nuxt Content](https://content.nuxt.com/) module for managing Markdown-based
content.

All content is located in the `content` directory, with two collections:

- `items` — the main menu content
- `extras` — additional content, links, and downloads

The collections and their Zod schemas are defined in `content.config.ts`. The content module exposes
a type-safe, Mongo-like API for querying content.

---

### Databaseless

Nuxt Content typically uses an
[SQLite database](https://content.nuxt.com/docs/getting-started/configuration#database) (or variant
thereof). During build, the database is generated and seeded based on the defined schema and
markdown files.

However, since this project is fully prerendered and (almost) all logic runs client-side, no
server-side database is required. No runtime data-fetching requests are made to the server, except
for retrieving prerendered payloads.

Instead, Nuxt Content uses a
[WASM-based SQLite database](https://content.nuxt.com/docs/advanced/database#wasm-sqlite-in-browser)
that runs in the browser. On the first content query, the app downloads a generated dump and
initializes a local database in the client.

As a result, no D1 database binding is configured for the Worker. During local development, you may
see warnings about missing bindings — these can safely be ignored.

## PDF Generation

When the user has completed their audit, they can generate a PDF report. This happens entirely
client-side using the `jspdf` library. No server or external service is involved.

### Processing pipeline

The generation flow is split into a few clear steps:

1. **Input collection**
   - User input (`ReportConfig`)
   - Computed audit data (`averages`, `audits`)
2. **Render context creation**
   - A fresh `jsPDF` instance is created
   - Layout, spacing, and color tokens are initialized
3. **Markdown parsing (TipTap-based)**
   - Audit comments (markdown) are converted to TipTap JSON
   - TipTap JSON is mapped to a simplified internal block model (`MarkdownBlock[]`)
   - This avoids HTML parsing and keeps the structure predictable
4. **Layout + measurement**
   - Text and markdown blocks are measured before rendering
   - Page breaks are handled via `ensurePageSpace`
   - Heights are estimated to prevent overflow
5. **Rendering**
   - Sections are rendered sequentially:
     - Cover page
     - Introduction
     - Pillar averages
     - Detailed audit cards
   - Markdown blocks are rendered via a custom renderer (paragraphs, lists, blockquotes, etc.)
6. **Export**
   - The final document is saved using `jsPDF.save()`
   - The filename is auto-generated based on the selected region

### Known limitations

- Inline formatting (bold/italic) is only partially supported
- Underline and strikethrough are parsed but not visually rendered yet
- Mixed inline styles within a single paragraph are simplified during rendering
- Complex nested structures (deeply nested lists, etc.) may not render perfectly

### ⚠️ Vibe coded warning

This PDF system was **100% vibe coded**.

That means:

- It is pragmatic, not robust
- It works because the current pieces line up just right
- Small changes might break everything

If you touch this:

- Expect layout shifts
- Expect page break regressions
- Expect to re-tune spacing and measurements

Nothing here is sacred — but everything is interconnected.

Proceed with confidence… and caution.
