import type { PdfRenderContext } from '../pdf'

import { setPdfTextColor, writeWrappedText } from '../pdf'

export type RichSegment = {
	text: string
	style?: 'normal' | 'bold' | 'italic'
}

/**
 * Renders a subsection heading inside a section body.
 *
 * @param ctx - Shared PDF render context.
 * @param text - Heading text.
 * @param y - Current Y position.
 * @returns Next cursor Y position.
 */
export function renderSubheading(ctx: PdfRenderContext, text: string, y: number): number {
	const { doc, layout, colors } = ctx

	doc.setFont('RijksoverheidHeading', 'bold')
	doc.setFontSize(14)
	setPdfTextColor(doc, colors.heading)
	doc.text(text, layout.marginLeft, y)

	return y + 6
}

/**
 * Renders a simple bullet list using the shared body styles.
 *
 * @param ctx - Shared PDF render context.
 * @param items - Bullet items to render.
 * @param startY - Starting Y position.
 * @returns Next cursor Y position.
 */
export function renderBulletList(ctx: PdfRenderContext, items: string[], startY: number): number {
	const { doc, layout, page, colors } = ctx

	let y = startY

	for (const item of items) {
		doc.setFont('Rijksoverheid', 'normal')
		doc.setFontSize(11)
		setPdfTextColor(doc, colors.text)
		doc.text('•', layout.marginLeft, y)

		y = writeWrappedText(doc, {
			text: item,
			x: layout.marginLeft + 4,
			y,
			maxWidth: page.contentWidth - 4,
			fontSize: 11,
			fontStyle: 'normal',
			color: colors.text,
		})
	}

	return y + 2
}

/**
 * Renders inline rich text segments with simple word-wrapping.
 *
 * @param ctx - Shared PDF render context.
 * @param segments - Text segments with optional font emphasis.
 * @param y - Starting Y position.
 * @returns Next cursor Y position.
 *
 * @example
 * ```ts
 * writeRichText(ctx, [
 *   { text: 'Regio ' },
 *   { text: 'Friesland', style: 'bold' },
 * ], 40)
 * ```
 */
export function writeRichText(ctx: PdfRenderContext, segments: RichSegment[], y: number): number {
	const { doc, layout, page, colors } = ctx

	let cursorX = layout.marginLeft
	let cursorY = y

	const lineHeight = 5
	const maxWidth = page.contentWidth

	// This helper keeps formatting intentionally lightweight: it wraps at the
	// word level and lets callers combine short emphasized fragments.
	for (const segment of segments) {
		doc.setFont('Rijksoverheid', segment.style ?? 'normal')
		doc.setFontSize(11)
		setPdfTextColor(doc, colors.text)

		for (const word of segment.text.split(' ')) {
			const text = `${word} `
			const width = doc.getTextWidth(text)

			if (cursorX + width > layout.marginLeft + maxWidth) {
				cursorX = layout.marginLeft
				cursorY += lineHeight
			}

			doc.text(text, cursorX, cursorY)
			cursorX += width
		}
	}

	return cursorY + lineHeight
}
