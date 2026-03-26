import type { ReportConfig } from '~~/schema/reportConfig'
import type { PdfRenderContext } from '../pdf'

import { markdownToBlocks, renderMarkdownBlocks } from '../markdown'
import { renderSectionTitle } from '../pdf'

/**
 * Renders the optional free-form notes page from the report configuration form.
 *
 * @param ctx - Shared PDF render context.
 * @param config - Report configuration containing the notes field.
 * @returns Nothing.
 * @throws {ZodError} When markdown parsing produces invalid normalized blocks.
 */
export function renderNotesSection(ctx: PdfRenderContext, config: ReportConfig): void {
	const raw = config.notes?.trim()

	if (!raw) {
		return
	}

	const { doc, layout, page } = ctx

	doc.addPage()

	let y = layout.marginTop
	y = renderSectionTitle(ctx, 'Algemene opmerkingen van regio', y)

	// Notes are normalized into the markdown block model before rendering so the
	// rest of the report never needs to know about TipTap internals.
	const blocks = markdownToBlocks(raw)
	y += 4

	renderMarkdownBlocks(doc, blocks, layout.marginLeft, y, page.contentWidth)
}
