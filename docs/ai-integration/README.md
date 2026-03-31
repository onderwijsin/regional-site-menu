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
- Confirmed close while generation is ongoing aborts in-flight AI requests and exits without
  additional error toasts.

Relevant files:

- [ReportGenerationFlow.vue](../../app/components/report/ReportGenerationFlow.vue)
- [ReportGenerationConfigStage.vue](../../app/components/report/generation/ReportGenerationConfigStage.vue)
- [ReportGenerationAiLoadingStage.vue](../../app/components/report/generation/ReportGenerationAiLoadingStage.vue)
- [ReportGenerationBriefingReviewStage.vue](../../app/components/report/generation/ReportGenerationBriefingReviewStage.vue)
- [report-ai.ts](../../app/composables/report-ai.ts)
- [report-generation-flow.ts](../../app/composables/report-generation-flow.ts)
- [report-generation-execution.ts](../../app/composables/report-generation-execution.ts)
- [report-generation-ui.ts](../../app/composables/report-generation-ui.ts)
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
5. Requires at least one crawled page with meaningful textual evidence.
6. Formats per-page evidence blocks with compact excerpt + full cleaned semantic content.
7. Sends validated crawl context + reference to OpenAI.
8. Returns typed response payload with `analysis`, `analysedPages`, and `usedSources`.

Controller + helpers:

- [website-analysis.post.ts](../../server/api/ai/website-analysis.post.ts)
- [analysis.ts](../../server/utils/ai/analysis.ts)
- [analysis-output.ts](../../server/utils/ai/analysis-output.ts)
- [website.ts](../../server/utils/crawler/website.ts)
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
   - falls back to plain-text response mode if structured SDK parsing fails.
5. Normalizes markdown and returns typed response.

Controller + helpers:

- [briefing.post.ts](../../server/api/ai/briefing.post.ts)
- [briefing.ts](../../server/utils/ai/briefing.ts)

## Prompt Management

Prompts are stored in Nuxt Content collection `_prompts`:

- [01.ai-briefing-system.md](../../content/_prompts/01.ai-briefing-system.md)
- [02.ai-website-analysis-system.md](../../content/_prompts/02.ai-website-analysis-system.md)

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

Database note:

- Prompt loading is runtime `queryCollection(event, '_prompts')`.
- In Cloudflare environments this requires the D1 `DB` binding to be available.

## Client Orchestration and Progress

Client-side orchestration is in:

- [report-ai.ts](../../app/composables/report-ai.ts)

Key behavior:

- sequential stages (analysis, then briefing)
- briefing can include analysis context (`websiteAnalysisContext`)
- in-flight AI requests support abort via `AbortController` when the flow is closed intentionally
- exposes reactive `progress: Ref<AiProgressItem[]>`
  - `text` (stage label)
  - `details` (expanded context)
  - `status` (`running`/`completed`)
- progress timing is configurable via `REPORT_AI_PROGRESS_CONFIG` in `config/ai.ts`
- stage duration is based on fixed medium-profile durations
- analysis timing uses a capped crawl scale + capped per-page model-overhead boost
- if the backend finishes early, remaining visual stages are fast-forwarded sequentially
- fast-forwarding happens only on success (failed runs do not show fully completed stage output)
- config stage shows a rounded minute-based ETA hint (`minder dan 1 minuut`, `1-2 minuten`, ...)
- logs full analysis payload in browser console for debugging

## Reasoning Configuration

The report flow now uses a fixed medium reasoning profile for reliability and predictable runtime.

The user-facing timing hint still adapts to:

- whether analysis, briefing, or both are enabled
- selected `maxPages` for analysis

## Data Contracts

Schemas and shared types:

- [schema/reportAi.ts](../../schema/reportAi.ts)

Key response fields:

- `analysis`, `briefing`
- `analysedPages` and `usedSources` for analysis traceability
- `usedSources` includes the requested URL plus evidence-page URLs with meaningful crawl evidence
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
- Sentry Zod integration enriches captured `ZodError` events with issue details
- server-side same-domain crawl with page caps
- llms-full reference criteria included in analysis prompt
- crawler extraction uses Readability-first with fallback to the existing simple extraction path
- per-page evidence blocks include compact excerpt plus full cleaned semantic HTML
- structured model output parsing before analysis markdown assembly
- OpenAI SDK calls are instrumented through the shared client factory (`server/utils/ai/openai.ts`)
- compatibility fallback for model-specific unsupported reasoning/verbosity params
- retry with higher output token budget when response ends `incomplete` due `max_output_tokens`
- fallback from structured parse mode to plain-text mode when SDK JSON parsing fails
- output fallback path (`output_text` + JSON-in-text parsing + plain markdown fallback)
- explicit source URL traceability in API response and PDF output
- browser debug log of raw analysis payload for quality tuning
- per-endpoint timing logs include the resolved model and request tuning metadata

Remaining risk:

- model output may still over-generalize relative to crawled excerpts
- larger crawls (especially with full semantic page evidence) increase token pressure and may
  require tuning of `max_output_tokens`
- users should review AI output before finalizing PDF

## Runtime and Config

Current provider implementation:

- OpenAI (`server/utils/ai/openai.ts`)
- provider-compatibility fallback handling in `server/utils/ai/response.ts` and
  `server/utils/ai/route-request.ts`
- prompt/crawl shaping (`analysis.ts`, `briefing.ts`, `crawler/*`) remains provider-agnostic and
  reusable

Runtime config:

- `runtimeConfig.openai.token`
- `runtimeConfig.openai.model` (shared fallback)
- `runtimeConfig.openai.models.websiteAnalysis`
- `runtimeConfig.openai.models.briefing`

Static AI defaults:

- [config/ai.ts](../../config/ai.ts)
- endpoint-specific behavior docs: [server/api/ai/README.md](../../server/api/ai/README.md)
- crawler behavior docs: [server/utils/crawler/README.md](../../server/utils/crawler/README.md)

Environment:

- `OPENAI_API_KEY`
- optional `OPENAI_MODEL` (shared fallback)
- optional `OPENAI_MODEL_WEBSITE_ANALYSIS`
- optional `OPENAI_MODEL_BRIEFING`

## Suggested Next Steps

1. Add explicit per-stage retry actions in UI (retry analysis only / briefing only).
2. Add integration tests for endpoint shape + failure cases.
3. Add quality telemetry (e.g. user edits ratio on AI briefing).
4. Add fallback observability metrics (how often structured parse fallback/retry paths are used).
