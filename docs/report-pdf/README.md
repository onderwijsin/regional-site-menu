# Report PDF Generation

This document describes the browser-side PDF pipeline used by report exports.

## Purpose

The report generator converts user input (region, notes, audits, optional AI insights) into a
deterministic multi-page PDF.

Main goals:

- keep section ordering explicit
- keep pagination predictable
- isolate markdown normalization from PDF rendering

## Entry Points

- [report-generator.ts](../../app/composables/report-generator.ts) orchestrates generation and
  saving.
- [use-report.ts](../../app/composables/use-report.ts) controls report preview overlays.
- [use-report-config.ts](../../app/composables/use-report-config.ts) controls report generation
  overlays.
- [sections/document.ts](../../app/composables/report/sections/document.ts) defines canonical page
  order.

## Pipeline

1. UI collects `ReportConfig` + report data.
2. `useReportGenerator().generateReport(config, data)` is called.
3. `createRenderContext()` initializes `jsPDF`, tokens, and layout.
4. `renderReportDocument(ctx, config, data)` renders section-by-section.
5. `savePdf()` downloads the file.

## Core Modules

- [pdf.ts](../../app/composables/report/pdf.ts) shared PDF primitives (layout, text wrapping,
  page-space helpers, colors).
- [fonts.ts](../../app/composables/report/fonts.ts) registers Rijksoverheid fonts.
- [markdown/](../../app/composables/report/markdown) markdown parsing, measuring, and rendering.
- [sections/](../../app/composables/report/sections) concrete page renderers.
- local module docs:
  - [report/README.md](../../app/composables/report/README.md)
  - [report/markdown/README.md](../../app/composables/report/markdown/README.md)

## Section Order

The current `document.ts` order is:

1. cover
2. introduction
3. notes
4. AI insights (optional)
5. averages
6. audit details

If you need to insert/reorder pages, do it in:

- [document.ts](../../app/composables/report/sections/document.ts)

## Markdown Rendering Model

TipTap/editor markdown is normalized before rendering:

1. parse markdown
2. validate/normalize to local block model
3. measure blocks
4. render blocks with pagination checks

This keeps report sections independent from TipTap-specific node details.

Invariant to preserve:

- markdown text normalization must keep meaningful whitespace between inline segments
- markdown measurement spacing tokens must stay aligned with renderer spacing tokens

## Risk Areas

- pagination and spacing logic
- multi-page audit comments (left-rule continuity)
- section layout regressions after small token/line-height changes

## Verification Checklist

After changing report/PDF logic:

1. Run:
   `pnpm exec eslint app/composables/report app/composables/use-report.ts app/composables/use-report-config.ts app/composables/report-generator.ts`
2. Run: `pnpm typecheck`
3. Generate a real report and verify:
   - notes rendering
   - long comments over multiple pages
   - averages card layout
   - AI section content and analysed URL appendix
