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
  - formats per-page evidence as compact excerpt + full cleaned semantic content
- `analysis-output.ts`
  - structured schema for website-analysis model output + markdown assembly
- `briefing.ts`
  - builds briefing prompt input blocks from selected audits/context and derived strategic signals
- `text.ts`
  - markdown sanitization and word counting utilities
- `provider.ts`
  - AI SDK provider resolution (`openai` / `mistral`) from runtime config
  - provider-wide model selection + fail-fast API-key checks
  - reads provider registry from `config/ai-providers.ts`

## Design Rules

- Keep Zod validation at route boundaries (`server/api/ai/*`).
- Keep this module pure/deterministic where possible.
- Avoid embedding runtime secrets here; use `useRuntimeConfig` only in dedicated client/bootstrap
  utility (`provider.ts`).
- Keep AI behavior tuning centralized in [`config/ai.ts`](../../../../config/ai.ts).
- Keep provider-specific logic isolated in dedicated utilities (`provider.ts`) so prompt/crawl
  orchestration can be reused for future providers.

## Related Docs

- [AI Integration Overview](../../../ai-integration/README.md)
- [AI API Route Notes](../../api/ai/README.md)
