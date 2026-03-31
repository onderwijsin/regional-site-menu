# AI API Routes

This directory contains the two server-side AI endpoints used by report generation:

- `POST /api/ai/website-analysis`
- `POST /api/ai/briefing`

Both routes follow the same boundary pattern:

1. Validate request payload with Zod (`schema/reportAi.ts`).
2. Load prompt content from Nuxt Content (`content/_prompts`).
3. Build deterministic input context from validated data.
4. Resolve route-specific model + fixed reasoning config.
5. Call OpenAI using `responses.parse` with structured output where possible.
6. Apply fallback logic for model/runtime edge cases.
7. Return the public response contract (validated again with Zod).

## Reliability and Fallback Strategy

The routes intentionally include defensive fallback behavior because model compatibility and output
shape can vary by model/version.

Implemented safeguards:

- Unsupported parameter/value fallback for:
  - `reasoning.effort`
  - `text.verbosity`
- Retry with increased `max_output_tokens` when response is:
  - `status = incomplete`
  - `incomplete_details.reason = max_output_tokens`
  - no usable `output_parsed` and no `output_text`
- Structured parse fallback:
  - if SDK structured parsing throws JSON parse errors, retry in plain-text mode
    (`responses.create`)
- Output fallback chain:
  - use `output_parsed` when available
  - else try parsing JSON from `output_text`
  - else fallback to sanitized plain markdown text
  - else fail with explicit 502

These settings are configured in:

- [`config/ai.ts`](../../../config/ai.ts)

## Reasoning Configuration

Both routes use a fixed medium reasoning profile from `AI_OPENAI_CONFIG`:

- `analysisRequest`
- `briefingRequest`

Current speed-oriented tuning:

- website-analysis: lower verbosity + tighter output token budget
- briefing: lower verbosity with a moderate output budget

## Model Selection

Model resolution is route-specific:

- `/api/ai/website-analysis` -> `runtimeConfig.openai.models.websiteAnalysis`
- `/api/ai/briefing` -> `runtimeConfig.openai.models.briefing`

Fallback order:

1. route-specific runtime model
2. shared runtime model (`runtimeConfig.openai.model`)
3. static default from `config/ai.ts`

## Observability

Both routes emit step timings via `createServerExecutionTimer`.

Timing logs now include resolved model metadata on:

- `request_composed`
- `openai_response_received`
- `openai_response_retry_received` (when applicable)
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
