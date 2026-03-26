import type { jsPDF } from 'jspdf'
import type { MarkdownBlock, RichTextMark, RichTextSegment } from './types'

import { PDF_COLORS } from '../constants'
import { measureWrappedTextHeight, writeWrappedText } from '../pdf'
import { measureMarkdownBlocksHeight, segmentsToPlainText } from './measure'

const MARKDOWN_PAGE_MARGIN_TOP = 18
const MARKDOWN_PAGE_MARGIN_BOTTOM = 18

/**
 * Returns the current page height for the active jsPDF document.
 *
 * @param doc - PDF document.
 * @returns Current page height in millimeters.
 */
function getPageHeight(doc: jsPDF): number {
	return doc.internal.pageSize.getHeight()
}

/**
 * Ensures there is enough vertical room for a markdown block.
 *
 * @param doc - PDF document.
 * @param currentY - Current render cursor.
 * @param requiredHeight - Estimated height required for the next block.
 * @returns Safe Y position on the current page or the top margin of a new page.
 */
function ensureMarkdownPageSpace(doc: jsPDF, currentY: number, requiredHeight: number): number {
	const pageHeight = getPageHeight(doc)
	const pageLimit = pageHeight - MARKDOWN_PAGE_MARGIN_BOTTOM

	if (currentY + requiredHeight <= pageLimit) {
		return currentY
	}

	doc.addPage()

	return MARKDOWN_PAGE_MARGIN_TOP
}

/**
 * Maps inline markdown marks to the closest jsPDF font style.
 *
 * @param marks - Rich-text marks applied to a text fragment.
 * @returns Best matching jsPDF font style.
 */
function marksToFontStyle(marks: RichTextMark[]): 'normal' | 'bold' | 'italic' {
	const isBold = marks.includes('bold')
	const isItalic = marks.includes('italic')

	if (isBold) {
		return 'bold'
	}

	if (isItalic) {
		return 'italic'
	}

	return 'normal'
}

/**
 * Renders a segment array as a single wrapped text run.
 *
 * @param doc - PDF document.
 * @param segments - Rich-text segments to render.
 * @param x - Start X coordinate.
 * @param y - Start Y coordinate.
 * @param maxWidth - Available width.
 * @param fontSize - Font size in points.
 * @returns Next cursor Y position.
 */
function renderSegments(
	doc: jsPDF,
	segments: RichTextSegment[],
	x: number,
	y: number,
	maxWidth: number,
	fontSize: number,
): number {
	const text = segmentsToPlainText(segments)
	const dominantMarks = segments.flatMap((segment) => segment.marks)
	const fontStyle = marksToFontStyle(dominantMarks)

	// The renderer currently chooses one dominant style for the whole line.
	// That keeps pagination predictable until true inline span layout is added.
	return writeWrappedText(doc, {
		text,
		x,
		y,
		maxWidth,
		fontSize,
		fontStyle,
		color: PDF_COLORS.text,
	})
}

/**
 * Renders a single markdown block with indentation and pagination rules.
 *
 * @param doc - PDF document.
 * @param block - Markdown block to render.
 * @param x - Start X coordinate.
 * @param y - Start Y coordinate.
 * @param maxWidth - Available width for the block.
 * @returns Next cursor Y position.
 */
function renderMarkdownBlock(
	doc: jsPDF,
	block: MarkdownBlock,
	x: number,
	y: number,
	maxWidth: number,
): number {
	let cursorY = y

	switch (block.type) {
		case 'paragraph':
			cursorY = renderSegments(doc, block.segments, x, cursorY, maxWidth, 10)
			cursorY += 1.5
			break

		case 'heading':
			cursorY = renderSegments(
				doc,
				block.segments,
				x,
				cursorY,
				maxWidth,
				block.level === 1 ? 13 : block.level === 2 ? 12 : 11,
			)
			cursorY += 1.5
			break

		case 'bulletList':
			// Each list item is measured and paginated separately so a long list can
			// flow across pages without forcing the whole list onto one page.
			for (const item of block.items) {
				const itemText = segmentsToPlainText(item.segments)
				const itemHeight = measureWrappedTextHeight(doc, `• ${itemText}`, maxWidth) + 1.5

				cursorY = ensureMarkdownPageSpace(doc, cursorY, itemHeight)

				if (itemText) {
					cursorY = writeWrappedText(doc, {
						text: `• ${itemText}`,
						x,
						y: cursorY,
						maxWidth,
						fontSize: 10,
						fontStyle: 'normal',
						color: PDF_COLORS.text,
					})
					cursorY += 1
				}

				if (item.children?.length) {
					cursorY = renderMarkdownBlocks(doc, item.children, x + 4, cursorY, maxWidth - 4)
				}
			}
			break

		case 'orderedList':
			block.items.forEach((item, index) => {
				const itemText = segmentsToPlainText(item.segments)
				const itemHeight =
					measureWrappedTextHeight(doc, `${index + 1}. ${itemText}`, maxWidth) + 1.5

				cursorY = ensureMarkdownPageSpace(doc, cursorY, itemHeight)

				if (itemText) {
					cursorY = writeWrappedText(doc, {
						text: `${index + 1}. ${itemText}`,
						x,
						y: cursorY,
						maxWidth,
						fontSize: 10,
						fontStyle: 'normal',
						color: PDF_COLORS.text,
					})
					cursorY += 1
				}

				if (item.children?.length) {
					cursorY = renderMarkdownBlocks(doc, item.children, x + 4, cursorY, maxWidth - 4)
				}
			})
			break

		case 'blockquote': {
			const blockquoteStartY = cursorY

			// Render quoted content first so the vertical rule can stretch exactly
			// from the first rendered line to the final one.
			cursorY = renderMarkdownBlocks(doc, block.blocks, x + 4, cursorY + 1, maxWidth - 4)

			doc.setDrawColor(180, 180, 180)
			doc.setLineWidth(0.8)
			doc.line(x, blockquoteStartY, x, cursorY)

			cursorY += 1
			break
		}

		case 'horizontalRule': {
			const spacingBottom = 10

			cursorY = ensureMarkdownPageSpace(doc, cursorY, spacingBottom)

			doc.setDrawColor(220, 220, 220)
			doc.setLineWidth(0.4)
			doc.line(x, cursorY, x + maxWidth, cursorY)

			cursorY += spacingBottom
			break
		}
	}

	return cursorY
}

/**
 * Renders normalized markdown blocks into the current PDF document.
 *
 * @param doc - PDF document.
 * @param blocks - Markdown blocks to render.
 * @param x - Start X coordinate.
 * @param y - Start Y coordinate.
 * @param maxWidth - Available width for the root block.
 * @returns Next cursor Y position after the final block.
 *
 * @example
 * ```ts
 * const nextY = renderMarkdownBlocks(doc, blocks, 16, 40, 178)
 * ```
 */
export function renderMarkdownBlocks(
	doc: jsPDF,
	blocks: MarkdownBlock[],
	x: number,
	y: number,
	maxWidth: number,
): number {
	let cursorY = y

	// Paragraphs can be split naturally by writeWrappedText, but most other block
	// types are treated as atomic so the visual structure stays intact.
	for (const block of blocks) {
		const isSplittable = block.type === 'paragraph'

		if (!isSplittable) {
			const blockHeight = measureMarkdownBlocksHeight(doc, [block], maxWidth)
			cursorY = ensureMarkdownPageSpace(doc, cursorY, blockHeight)
		}

		cursorY = renderMarkdownBlock(doc, block, x, cursorY, maxWidth)
	}

	return cursorY
}
