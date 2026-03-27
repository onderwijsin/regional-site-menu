# AI Integration

This document describes the AI integration currently implemented in `regional-site-menu`.

## Scope

Implemented:

- AI **website analysis** endpoint
- AI **briefing generation** endpoint
- Staged client orchestration (analysis first, briefing second)
- Multi-stage report generation UI (`config -> ai-loading -> briefing-review`)
- Editable AI briefing before final PDF generation
- Prompt management via **Nuxt Content** collection
- PDF inclusion of AI sections
- Traceability metadata for analysed/source URLs

## High-Level Flow

Current report flow with AI enabled:

1. User audits the site and opens report generation.
2. User sets config options (region, notes, optional AI toggles/url).
3. If AI is enabled, client runs `generateAiInsights()` before PDF rendering:
   - stage 1: website analysis
   - stage 2: briefing (optionally using analysis context)
4. Loading stage shows incremental progress using `UChatTool` entries.
5. If briefing is enabled, user reviews/edits briefing in an editor.
6. PDF generation starts and includes AI content.

UX behavior:

- AI results are cached in reactive state for the active slideover session.
- Going back to config does **not** trigger new AI calls if relevant input did not change.
- Closing while generation is ongoing (or when unprocessed AI output exists) shows a confirmation
  guard.

Relevant files:

- [ReportGenerationFlow.vue](../../app/components/report/ReportGenerationFlow.vue)
- [report-ai.ts](../../app/composables/report-ai.ts)
- [report-generation-flow.ts](../../app/composables/report-generation-flow.ts)
- [sections/ai.ts](../../app/composables/report/sections/ai.ts)

## Server Endpoints

### `POST /api/ai/website-analysis`

Purpose:

- Analyze a website against llms criteria.

What the route does:

1. Validates input with Zod (`schema/reportAi.ts`).
2. Crawls the requested domain server-side (capped, same-domain).
3. Loads system prompt from content collection (`content/_prompts`).
4. Fetches reference criteria from `/llms-full.txt` (fallback `/llms.txt`).
5. Sends crawled context + reference to OpenAI.
6. Returns typed response payload with `analysis`, `analysedPages`, and `usedSources`.

Controller + helpers:

- [website-analysis.post.ts](../../server/api/ai/website-analysis.post.ts)
- [analysis.ts](../../server/utils/ai/analysis.ts)
- [crawl.ts](../../server/utils/ai/crawl.ts)
- [reference.ts](../../server/utils/ai/reference.ts)

### `POST /api/ai/briefing`

Purpose:

- Generate a concrete implementation briefing for a web agency.

What the route does:

1. Validates input with Zod.
2. Loads system prompt from content collection.
3. Formats domain input context (region, goals, selected components, notes, optional analysis
   context).
4. Calls OpenAI with structured output parsing.
5. Normalizes markdown and returns typed response.

Controller + helpers:

- [briefing.post.ts](../../server/api/ai/briefing.post.ts)
- [briefing.ts](../../server/utils/ai/briefing.ts)

## Prompt Management

Prompts are stored in Nuxt Content collection `prompts`:

- [01.ai-briefing-system.md](../../content/prompts/01.ai-briefing-system.md)
- [02.ai-website-analysis-system.md](../../content/prompts/02.ai-website-analysis-system.md)

Why:

- editable without route code changes
- typed key lookup
- content-oriented authoring experience (prompt in markdown body)

Prompt key source of truth:

- [schema/fields.ts](../../schema/fields.ts) (`aiPromptKey`)

Prompt loader:

- [prompts.ts](../../server/utils/ai/prompts.ts)

Note: Nuxt Content returns markdown as an AST body. The loader normalizes it into plain text before
sending it to OpenAI.

## Client Orchestration and Progress

Client-side orchestration is in:

- [report-ai.ts](../../app/composables/report-ai.ts)

Key behavior:

- sequential stages (analysis, then briefing)
- briefing can include analysis context (`websiteAnalysisContext`)
- exposes reactive `progress: Ref<AiProgressItem[]>`
  - `text` (stage label)
  - `reasoning` (expanded context)
  - `status` (`running`/`completed`)
- progress timing is configurable via `AI_PROGRESS_CONFIG`
- if the backend finishes early, remaining visual stages are fast-forwarded sequentially
- logs full analysis payload in browser console for debugging

## Data Contracts

Schemas and shared types:

- [schema/reportAi.ts](../../schema/reportAi.ts)

Key response fields:

- `analysis`, `briefing`
- `analysedPages` and `usedSources` for analysis traceability
- `crawledPages` kept for backward compatibility

## PDF Integration

AI output is added to report data and rendered into dedicated PDF pages.

- [report/types.ts](../../app/composables/report/types.ts)
- [sections/ai.ts](../../app/composables/report/sections/ai.ts)
- [sections/document.ts](../../app/composables/report/sections/document.ts)

Additional behavior:

- analysis section appends a Dutch list of analysed URLs after the generated analysis text
- introduction section explicitly distinguishes user-entered audit content vs AI-generated sections

## Verification and Anti-Hallucination Measures

Implemented safeguards:

- strict input/output Zod validation on both endpoints
- server-side same-domain crawl with page caps
- llms-full reference criteria included in analysis prompt
- explicit source URL traceability in API response and PDF output
- browser debug log of raw analysis payload for quality tuning

Remaining risk:

- model output may still over-generalize relative to crawled excerpts
- users should review AI output before finalizing PDF

## Runtime and Config

Runtime config:

- `runtimeConfig.openai.token`
- `runtimeConfig.openai.model` (default `gpt-4.1-mini`)

Environment:

- `OPENAI_API_KEY`
- optional `OPENAI_MODEL`

## Suggested Next Steps

1. Add explicit per-stage retry actions in UI (retry analysis only / briefing only).
2. Add integration tests for endpoint shape + failure cases.
3. Add quality telemetry (e.g. user edits ratio on AI briefing).
4. Consider extracting AI progress config to a dedicated app config file for non-dev tuning.
