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

Regional Site Menu is an interactive web application designed to help education regions design,
evaluate, and improve their regional website.

Instead of providing a fixed template, the app offers a flexible “menu” of possible website
components. Users can explore these components, assess their current website, and compile a
structured briefing for further development.

---

## Overview

The application supports three main use cases:

- **Inspiration** Explore what a strong regional website can include.

- **Audit** Evaluate an existing website based on predefined components.

- **Briefing** Select relevant components and generate a structured output for web agencies.

The app is fully client-side and built with:

- Nuxt (edge runtime)
- Nuxt UI + Tailwind CSS
- Pinia (persisted state)
- Tiptap (planned for rich text input)
- Cloudflare Workers (via NuxtHub)

---

## Local Development

### Requirements

Make sure you have the following installed globally:

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

Build and preview:

```bash
pnpm build
pnpm preview
```

---

### Git hooks behavior

This project uses Husky + linting/formatting checks.

You can disable specific checks via environment variables:

```bash
DISABLE_PRE_COMMIT_FORMAT=false
DISABLE_PRE_COMMIT_LINT=false
DISABLE_PRE_PUSH_TYPECHECK=false
DISABLE_PRE_PUSH_FORMAT=false
```

---

## Deployment

This project is designed to run on **Cloudflare Workers** using NuxtHub.

---

### 1. Configure environment variables

Set the following in NuxtHub (or your deployment environment):

```bash
MODE=prod
APP_URL=https://your-domain.com

CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_CACHE_NAMESPACE_ID=
WORKER_NAME=
```

Optional:

```bash
PLAUSIBLE_DOMAIN=
API_TOKEN=
GH_ORG=
GH_REPO=
```

---

### 2. CI/CD

Deployment is handled via GitHub Actions using the shared onderwijsin workflows.

Typical flow:

- Pull requests → preview deployments
- `next` branch → staging
- `main` branch → production

---

### 3. Build output

Nuxt builds a Cloudflare-compatible worker using:

```bash
pnpm build
```

The output is deployed via NuxtHub and Cloudflare Workers.

---

## Notes

- All content is managed via Markdown in `/content`
- State is persisted in the browser (no backend)
- Analytics is handled via Plausible (privacy-friendly)
