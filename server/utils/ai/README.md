# AI Utility Module

Shared AI helpers used by `server/api/ai/*` routes.

This module separates prompt/input/output shaping logic from route/controller logic so endpoint
files remain focused on boundary handling and orchestration.

## Files and Responsibilities

- `prompts.ts`
  - loads prompt content from Nuxt Content (`_prompts`) and normalizes markdown AST to plain text
- `reference.ts`
  - fetches llms criteria documents (`/llms-full.txt`, fallback `/llms.txt`)
- `analysis.ts`
  - builds website-analysis prompt input blocks from crawl evidence and metadata
- `analysis-output.ts`
  - structured schema for website-analysis model output + markdown assembly
- `briefing.ts`
  - builds briefing prompt input blocks from selected audits/context and derived strategic signals
- `text.ts`
  - markdown sanitization and word counting utilities
- `openai.ts`
  - OpenAI client construction + compatibility error parsing helpers for model fallback handling

## Design Rules

- Keep Zod validation at route boundaries (`server/api/ai/*`).
- Keep this module pure/deterministic where possible.
- Avoid embedding runtime secrets here; use `useRuntimeConfig` only in dedicated client/bootstrap
  utility (`openai.ts`).
- Keep AI behavior tuning centralized in [`config/ai.ts`](../../../config/ai.ts).

## Related Docs

- [AI Integration Overview](../../../docs/ai-integration/README.md)
- [AI API Route Notes](../../api/ai/README.md)
