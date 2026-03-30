# Sentry Integration

This document describes how Sentry is implemented in this project (Nuxt + Cloudflare Workers via
Nitro).

## Scope

Implemented:

- Client-side Sentry initialization for issues, tracing, and session replay.
- Cloudflare Nitro server plugin for server-side error and trace capture.
- Source map upload configuration at Nuxt build time.
- OpenAI SDK instrumentation at the shared AI client boundary.
- Zod validation error enrichment for captured exceptions.
- Test route + test page for manual verification.

## Architecture

Main integration files:

- [nuxt.config.ts](../../nuxt.config.ts)
- [sentry.client.config.ts](../../sentry.client.config.ts)
- [server/plugins/sentry-cloudflare-plugin.ts](../../server/plugins/sentry-cloudflare-plugin.ts)
- [server/utils/ai/openai.ts](../../server/utils/ai/openai.ts)
- [server/api/\_sentry/test.get.ts](../../server/api/_sentry/test.get.ts)
- [app/pages/\_sentry.vue](../../app/pages/_sentry.vue)

## Runtime and Build Config

Sentry configuration is split intentionally:

- Build-time Sentry plugin config in `nuxt.config.ts`:
  - `sentry.org`
  - `sentry.project`
  - `sentry.authToken`
- Runtime Sentry config in `runtimeConfig.public.sentry`:
  - `dsn`
  - `release`
  - `environment`

Important convention:

- Server runtime code must not read Sentry values from `process.env`.
- Runtime consumers should use `useRuntimeConfig()` only.

## Environment Mapping

Sentry `environment` is derived from `MODE`:

- `dev -> development`
- `preview -> preview`
- `prod -> production`

## Sampling and Replay Policy

Current policy:

- Error events: `sampleRate = 1.0`
- Tracing: `tracesSampleRate = 1.0`
- Session replay: `replaysSessionSampleRate = 0.2`
- Replay on error: `replaysOnErrorSampleRate = 1.0`

## Integrations

Configured:

- `replayIntegration` (client)
- `zodErrorsIntegration` (client + server)
- `httpClientIntegration` (client)
- OpenAI manual instrumentation via `Sentry.instrumentOpenAiClient(...)` in shared AI client factory

OpenAI instrumentation defaults in this project:

- `recordInputs: false`
- `recordOutputs: false`

## Source Maps

Source map support is enabled as follows:

- Nuxt client and server sourcemaps:
  - `sourcemap.client = "hidden"`
  - `sourcemap.server = "hidden"`
- Sentry upload assets are explicitly scoped to:
  - `.output/public/**/*`
  - `.output/server/**/*`
- Sentry build upload uses:
  - `SENTRY_AUTH_TOKEN`
  - `SENTRY_ORG`
  - `SENTRY_PROJECT`

## Cloudflare Notes

For this project’s Nitro `cloudflare_module` preset:

- Do not manually add `compatibility_flags: ["nodejs_compat"]` in wrangler config unless explicitly
  needed.
- Keep `nitro.cloudflare.wrangler.no_bundle = true` so Wrangler does not rebundle Nitro output.
  Rebundling can break server-side Sentry source map matching.
- Keep Cloudflare Sentry plugin setup in `server/plugins/sentry-cloudflare-plugin.ts`.

## Manual Verification

1. Build and run in production-like mode (server-side capture is not representative in `nuxt dev`).
2. Open `/_sentry`.
3. Click:
   - `Trigger client error`
   - `Trigger server error`
4. Verify data in Sentry:
   - Issues
   - Traces
   - Replays

## Required Environment Variables

- `SENTRY_AUTH_TOKEN` (build-time source map upload auth)
- `SENTRY_PROJECT` (build-time project slug)
- `SENTRY_ORG` (build-time organization slug)
- `SENTRY_DSN` (runtime event ingestion DSN)
- `SENTRY_RELEASE` (recommended for server-side release/artifact matching; in CI this is set to
  `GITHUB_SHA`)
