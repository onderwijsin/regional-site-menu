# Report Composables Module

This directory contains the browser-side PDF/report generation internals.

Primary orchestration flow:

1. `useReportGenerator().generateReport(...)` in `report-generator.ts`
2. `createRenderContext(...)` in `pdf.ts`
3. `renderReportDocument(...)` in `sections/document.ts`
4. `savePdf(...)` in `pdf.ts`

## Module Responsibilities

- `pdf.ts`
  - shared render context, page-space utilities, text rendering helpers, primitives
- `constants.ts`
  - local PDF tokens that map to centralized values in `config/constants.ts`
- `fonts.ts`
  - custom font registration
- `types.ts`
  - internal report/PDF type contracts
- `sections/*`
  - concrete report pages and section order orchestration
- `markdown/*`
  - markdown parse/measure/render layer used in notes/comments/AI sections
- `errors.ts`
  - report generation error contracts

## Invariants

- Section order is controlled by `sections/document.ts` and should stay explicit.
- Page-break behavior must remain deterministic (`ensurePageSpace` and section-local measurement).
- Markdown measure/render spacing tokens must stay aligned.
- Keep PDF-specific layout logic here; do not leak jsPDF concerns into UI components.

## Related Docs

- [PDF Pipeline Documentation](../../report-pdf/README.md)
- [Markdown Submodule Notes](../report-markdown/README.md)
