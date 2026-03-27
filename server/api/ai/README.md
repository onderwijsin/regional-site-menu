# AI API Routes

This directory contains the two server-side AI endpoints used by report generation:

- `POST /api/ai/website-analysis`
- `POST /api/ai/briefing`

Both routes follow the same boundary pattern:

1. Validate request payload with Zod (`schema/reportAi.ts`).
2. Load prompt content from Nuxt Content (`content/_prompts`).
3. Build deterministic input context from validated data.
4. Call OpenAI using `responses.parse` with structured output where possible.
5. Apply fallback logic for model/runtime edge cases.
6. Return the public response contract (validated again with Zod).

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

## File Ownership

- `website-analysis.post.ts`
  - crawl evidence validation
  - criteria-based analysis generation
  - source traceability fields
- `briefing.post.ts`
  - implementation briefing generation
  - integration of audit + optional website-analysis context

Shared helpers live under:

- `server/utils/ai/*`
- crawler internals in `server/utils/crawler/*`
