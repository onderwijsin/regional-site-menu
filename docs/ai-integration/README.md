# AI Integration

This document describes the AI integration currently implemented in `regional-site-menu`.

## Scope

Implemented so far:

- AI **website analysis** endpoint
- AI **briefing generation** endpoint
- Staged client orchestration (analysis first, briefing second)
- Prompt management via **Nuxt Content** collection
- PDF inclusion of AI sections
- Traceability metadata for analysed/source URLs

Not implemented yet:

- dedicated intermediate review UI where users can edit AI output before PDF generation

## High-Level Flow

Current report flow with AI enabled:

1. User audits the site and opens report generation config.
2. User enables AI options.
3. Client calls `generateAiInsights()` before PDF rendering:
   - stage 1: website analysis
   - stage 2: briefing (optionally using analysis context)
4. Generated AI output is passed into the report data object.
5. PDF generator renders AI sections.

Relevant files:

- [ReportConfig.vue](../../app/components/report/ReportConfig.vue)
- [report-ai.ts](../../app/composables/report-ai.ts)
- [sections/ai.ts](../../app/composables/report/sections/ai.ts)

## Server Endpoints

### `POST /api/ai/website-analysis`

Purpose:

- Analyze a website against llms criteria.

What the route does:

1. Validates input with Zod (`schema/reportAi.ts`).
2. Loads system prompt from content collection (`content/prompts`).
3. Fetches reference criteria from `/llms-full.txt` (fallback `/llms.txt`).
4. Calls OpenAI Responses API using web-search tooling.
5. Extracts analysed pages and source URLs from tool-call output.
6. Rejects response if no verifiable source URLs are present.
7. Returns typed response payload.

Controller + helpers:

- [website-analysis.post.ts](../../server/api/ai/website-analysis.post.ts)
- [analysis.ts](../../server/utils/ai/analysis.ts)
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
- exposes reactive `progress: Ref<string[]>` to support richer loading UIs
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

## Verification and Anti-Hallucination Measures

Implemented safeguards:

- strict input/output Zod validation on both endpoints
- structured output parsing with OpenAI SDK
- domain-constrained web search configuration for analysis
- extraction of tool-call evidence URLs
- hard failure when no evidence URLs are present

Remaining risk:

- model may still over-generalize within analysed sources
- review UI and human approval step should remain part of final workflow

## Runtime and Config

Runtime config:

- `runtimeConfig.openai.token`
- `runtimeConfig.openai.model` (default `gpt-4.1-mini`)

Environment:

- `OPENAI_API_KEY`
- optional `OPENAI_MODEL`

## Suggested Next Steps

1. Implement review/edit UI step between AI generation and PDF generation.
2. Surface `progress`, `analysedPages`, and `usedSources` in that UI.
3. Add per-stage retry behavior (retry analysis only, retry briefing only).
4. Add integration tests for endpoint shape + failure cases.
