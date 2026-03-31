# AI API Routes

This directory contains the two server-side AI endpoints used by report generation:

- `POST /api/ai/website-analysis`
- `POST /api/ai/briefing`

Both routes follow the same boundary pattern:

1. Validate request payload with Zod (`schema/reportAi.ts`).
2. Load prompt content from Nuxt Content (`content/_prompts`).
3. Build deterministic input context from validated data.
4. Resolve provider + provider-wide model from runtime config.
5. Call AI SDK Core (`generateText`) with structured output (`Output.object`).
6. Return the public response contract (validated again with Zod).

## Reliability Strategy

The routes keep AI integration intentionally simple and rely on AI SDK behavior as the standard
execution path.

Implemented safeguards:

- strict request and response schema validation (Zod)
- structured output generation with AI SDK Core
- briefing route plain-text retry when provider structured output fails schema matching
- explicit 502 failures for provider generation errors
- deterministic crawl evidence filtering before analysis generation

These settings are configured in:

- [`config/ai.ts`](../../../../config/ai.ts)

## Request Configuration

Both routes use fixed request budgets from `AI_ROUTE_REQUEST_CONFIG`:

- `analysisRequest`
- `briefingRequest`

Each request config includes:

- `maxOutputTokens`
- `temperature`
- `maxRetries`

Provider/model resolution is provider-wide:

- `/api/ai/website-analysis` -> `runtimeConfig.<provider>.model`
- `/api/ai/briefing` -> `runtimeConfig.<provider>.model`

Fallback order:

1. provider runtime model (`runtimeConfig.<provider>.model`)
2. static default from `config/ai-providers.ts` for the selected provider

## Observability

Both routes emit step timings via `createServerExecutionTimer`.

Timing logs now include resolved model metadata on:

- `request_composed`
- `ai_response_received`
- final `done` summary

## File Ownership

- `website-analysis.post.ts`
  - crawl evidence validation
  - includes compact excerpt + full cleaned semantic page content in prompt evidence
  - criteria-based analysis generation
  - source traceability fields
- `briefing.post.ts`
  - implementation briefing generation
  - integration of audit + optional website-analysis context

Shared helpers live under:

- `server/utils/ai/*`
- crawler internals in `server/utils/crawler/*`
