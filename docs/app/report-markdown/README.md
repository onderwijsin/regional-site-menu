# Report Markdown Pipeline

This submodule converts markdown text into measured, paginated PDF output.

It is intentionally split into three stages:

1. `parse.ts`
   - parse markdown into local block model
   - normalize inline text/marks to a stable representation
2. `measure.ts`
   - estimate block heights for pagination decisions
3. `render.ts`
   - draw markdown blocks into jsPDF with page-space checks

## Why This Exists

The app uses rich text/markdown in several report sections. Directly rendering raw markdown AST in
page sections caused fragile coupling. This module centralizes markdown-specific logic and keeps
section renderers focused on composition/layout.

## Important Invariants

- Preserve meaningful whitespace across inline mark boundaries.
- Keep measurement constants in sync with render constants.
- Horizontal rule spacing must stay aligned in both measure and render phases.
- New block/mark types should be added to all three layers (parse, measure, render).

## Failure Modes to Watch

- merged words caused by aggressive normalization
- over/under-estimated block heights causing page-break drift
- regressions in long multi-page comments/notes

## Related Docs

- [PDF Pipeline Documentation](../../report-pdf/README.md)
