# Report PDF Generation

This directory contains the browser-side PDF generation pipeline for report exports.

## Overview

The report generator is intentionally split into three layers:

1. Entry points
   [`report-generator.ts`](/Users/remihuigen/local-projects/regional-site-menu/app/composables/report-generator.ts)
   creates the PDF context, orchestrates document rendering, and saves the file.
   [`report.ts`](/Users/remihuigen/local-projects/regional-site-menu/app/composables/report.ts)
   opens the UI overlays for the report preview and report configuration flow.
2. Shared rendering primitives
   [`pdf.ts`](/Users/remihuigen/local-projects/regional-site-menu/app/composables/report/pdf.ts)
   owns jsPDF setup, layout metrics, colors, text helpers, pagination helpers, and file naming.
   [`fonts.ts`](/Users/remihuigen/local-projects/regional-site-menu/app/composables/report/fonts.ts)
   registers the Rijksoverheid font families.
   [`image.ts`](/Users/remihuigen/local-projects/regional-site-menu/app/composables/report/image.ts)
   loads static assets for PDF embedding.
3. Content normalization and section rendering
   [`markdown/`](/Users/remihuigen/local-projects/regional-site-menu/app/composables/report/markdown)
   converts editor markdown into a simplified block model, estimates block height, and renders those
   blocks into the PDF.
   [`sections/`](/Users/remihuigen/local-projects/regional-site-menu/app/composables/report/sections)
   renders each report page or section using the shared PDF helpers.

## Orchestration Flow

The current rendering flow is:

1. `useReportGenerator().generateReport(config, data)`
2. `createRenderContext()`
3. `renderReportDocument(ctx, config, data)`
4. `renderCoverPage(...)`
5. `renderIntroductionPage(...)`
6. `renderNotesSection(...)`
7. `renderAveragesSection(...)`
8. `renderAuditSection(...)`
9. `savePdf(...)`

Every section mutates the same `jsPDF` instance through the shared `PdfRenderContext`. Page order is
defined entirely by call order in
[`sections/document.ts`](/Users/remihuigen/local-projects/regional-site-menu/app/composables/report/sections/document.ts).

## Directory Layout

- [`constants.ts`](/Users/remihuigen/local-projects/regional-site-menu/app/composables/report/constants.ts)
  Shared layout and color tokens.
- [`errors.ts`](/Users/remihuigen/local-projects/regional-site-menu/app/composables/report/errors.ts)
  Error type used by the generator boundary.
- [`types.ts`](/Users/remihuigen/local-projects/regional-site-menu/app/composables/report/types.ts)
  Shared report data types and PDF-related type aliases.
- [`markdown/parse.ts`](/Users/remihuigen/local-projects/regional-site-menu/app/composables/report/markdown/parse.ts)
  Markdown and TipTap normalization.
- [`markdown/measure.ts`](/Users/remihuigen/local-projects/regional-site-menu/app/composables/report/markdown/measure.ts)
  Height estimation for markdown blocks.
- [`markdown/render.ts`](/Users/remihuigen/local-projects/regional-site-menu/app/composables/report/markdown/render.ts)
  Pagination-aware markdown rendering.
- [`sections/cover.ts`](/Users/remihuigen/local-projects/regional-site-menu/app/composables/report/sections/cover.ts)
  Cover page rendering.
- [`sections/introduction.ts`](/Users/remihuigen/local-projects/regional-site-menu/app/composables/report/sections/introduction.ts)
  Static editorial introduction page.
- [`sections/notes.ts`](/Users/remihuigen/local-projects/regional-site-menu/app/composables/report/sections/notes.ts)
  Optional user-authored notes page.
- [`sections/averages.ts`](/Users/remihuigen/local-projects/regional-site-menu/app/composables/report/sections/averages.ts)
  Pillar descriptions and score overview cards.
- [`sections/audit.ts`](/Users/remihuigen/local-projects/regional-site-menu/app/composables/report/sections/audit.ts)
  Detailed audit item rendering, including multi-page comment handling and left rule continuation.
- [`sections/shared.ts`](/Users/remihuigen/local-projects/regional-site-menu/app/composables/report/sections/shared.ts)
  Reusable text helpers used by multiple sections.

## How Markdown Works

The notes page and audit comments are not rendered directly from TipTap JSON.

Instead:

1. Raw markdown is parsed by TipTap.
2. The TipTap output is validated with Zod.
3. The validated structure is mapped into the local `MarkdownBlock` model.
4. The local model is measured and then rendered into the PDF.

That indirection is deliberate. It gives the PDF layer a stable rendering model and avoids spreading
editor-specific assumptions through section code.

## Things To Keep In Mind

- Keep orchestration explicit. If you add or reorder pages, do it in
  [`sections/document.ts`](/Users/remihuigen/local-projects/regional-site-menu/app/composables/report/sections/document.ts).
- Prefer shared helpers over ad-hoc jsPDF calls. If a new section needs wrapping, color mapping, or
  pagination logic, add or reuse helpers in
  [`pdf.ts`](/Users/remihuigen/local-projects/regional-site-menu/app/composables/report/pdf.ts) or
  [`sections/shared.ts`](/Users/remihuigen/local-projects/regional-site-menu/app/composables/report/sections/shared.ts).
- Treat pagination as a first-class concern. The brittle parts of PDF generation are almost always
  page breaks, not text drawing itself. Measure first when a block must stay visually intact.
- Keep markdown normalization separate from rendering. Do not couple section code directly to TipTap
  node types. Add new markdown behavior in the `markdown/` modules and keep sections working with
  `MarkdownBlock`.
- Be careful with multi-page decorations.
  [`sections/audit.ts`](/Users/remihuigen/local-projects/regional-site-menu/app/composables/report/sections/audit.ts)
  tracks page segments explicitly so the left vertical rule continues correctly across page breaks.
  If you change that layout, verify multi-page items manually.
- Decorative assets should fail softly when possible. The cover logo is intentionally non-fatal.
  Keep that distinction between required assets and decorative assets.
- Keep layout constants centralized. Margin, line-height, and color changes should generally go
  through
  [`constants.ts`](/Users/remihuigen/local-projects/regional-site-menu/app/composables/report/constants.ts)
  unless a section truly needs a local override.

## Safe Extension Points

- Add a new page: Create a new module in `sections/`, export a renderer, and call it from
  `renderReportDocument`.
- Add a new markdown block type: Update `markdown/types.ts`, then implement parsing, measurement,
  and rendering in the three markdown modules.
- Change typography or spacing: Start in `constants.ts`, `pdf.ts`, and `sections/shared.ts` before
  editing individual pages.
- Add richer inline formatting: The current markdown renderer intentionally uses coarse style
  selection for predictable layout. If you need true per-span styling, change `markdown/render.ts`
  carefully and re-verify pagination behavior.

## Verification Checklist

After changing this code, at minimum run:

```bash
pnpm exec eslint app/composables/report app/composables/report.ts app/composables/report-generator.ts
pnpm typecheck
```

For layout-sensitive changes, also generate a real PDF and verify:

- cover page branding and footer link
- notes page markdown rendering
- averages overview card layout
- long audit comments that span multiple pages
- left vertical rule continuity in the audit detail pages
