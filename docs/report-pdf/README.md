# Report PDF Generation

This document is the source of truth for the browser-side PDF pipeline.

## Scope

The PDF generator transforms report input into a deterministic multi-page export:

- user config (`region`, notes, AI toggles)
- audit data (scores, comments, metadata)
- optional AI insights (briefing / website analysis)

Goals:

- explicit, stable section ordering
- predictable pagination and spacing
- isolated markdown parse/measure/render pipeline

## Entry Points

- [report-generator.ts](../../app/composables/report-generator.ts)
  - high-level orchestration (`generateReport`)
  - document metadata construction
  - final save/download
- [use-report.ts](../../app/composables/use-report.ts)
  - report preview state / open-close behavior
- [use-report-config.ts](../../app/composables/use-report-config.ts)
  - report-generation overlay state
- [sections/document.ts](../../app/composables/report/sections/document.ts)
  - canonical section execution order

## Data Contracts

Input contracts:

- [ReportConfig](../../schema/reportConfig.ts)
- [ReportData + PDF section types](../../app/composables/report/types.ts)

Error contract:

- [ReportGenerationError](../../app/composables/report/errors.ts)

## Rendering Pipeline

1. UI collects `ReportConfig` + `ReportData`.
2. `useReportGenerator().generateReport(config, data)` starts export.
3. `createRenderContext()` initializes `jsPDF`, page metrics, colors, and fonts.
4. `setPdfDocumentMetadata()` sets title/subject/author/creator/keywords/language.
5. `renderReportDocument(ctx, config, data)` renders section-by-section.
6. `savePdf()` saves the final file.

Core primitives:

- [pdf.ts](../../app/composables/report/pdf.ts)
  - context creation
  - metadata helpers
  - page-space handling (`ensurePageSpace`)
  - wrapped-text measurement/render helpers
- [fonts.ts](../../app/composables/report/fonts.ts)
  - Rijksoverheid font registration
- [constants.ts](../../app/composables/report/constants.ts)
  - PDF token values used by sections and markdown pipeline

## Canonical Section Order

Defined in [document.ts](../../app/composables/report/sections/document.ts):

1. cover
2. introduction
3. notes
4. AI insights (conditional; no-op when absent)
5. averages
6. audit details

If you add/reorder pages, change `document.ts` first and validate a real PDF.

## Markdown Subsystem

Markdown rendering is intentionally split into:

1. [parse.ts](../../app/composables/report/markdown/parse.ts)
2. [measure.ts](../../app/composables/report/markdown/measure.ts)
3. [render.ts](../../app/composables/report/markdown/render.ts)

Used by notes/comments/AI blocks to keep section renderers focused on layout composition.

Critical invariants:

- preserve meaningful whitespace across inline mark boundaries
- keep measure and render spacing tokens synchronized
- keep line-height assumptions aligned across parse/measure/render usage

See:

- [Report Composables Notes](../app/report-composables/README.md)
- [Report Markdown Notes](../app/report-markdown/README.md)

## High-Risk Areas

- page-break and spacing math (`ensurePageSpace`, wrapped text flow)
- multi-page audit comment rendering (vertical left-rule continuity)
- markdown parser/measurement tweaks that desync renderer behavior
- section token changes (font size, line height, margins) with cascading layout effects

## Verification Checklist

After any PDF-related change:

1. Run:
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test:unit`
2. Generate at least one real report PDF.
3. Validate manually:
   - notes rendering (short + long content)
   - long audit comments over multiple pages
   - averages layout and spacing
   - AI section rendering + analysed URL appendix
   - metadata presence (title/subject/author/creator/keywords/language)

## Non-Goals

- No server-side PDF rendering in current architecture.
- No implicit auto-layout engine; layout remains explicit and token-driven.
