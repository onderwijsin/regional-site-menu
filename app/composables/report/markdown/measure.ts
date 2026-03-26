import type { jsPDF } from 'jspdf'
import type { MarkdownBlock, RichTextSegment } from './types'

import { measureWrappedTextHeight } from '../pdf'

/**
 * Flattens rich text segments into plain text for coarse layout calculations.
 *
 * @param segments - Rich text segments.
 * @returns Concatenated plain text string.
 */
export function segmentsToPlainText(segments: RichTextSegment[]): string {
	return segments.map((segment) => segment.text).join('')
}

/**
 * Measures a segment collection as a single wrapped text block.
 *
 * @param doc - PDF document used for measurement.
 * @param segments - Rich text segments to measure.
 * @param maxWidth - Available text width.
 * @returns Estimated height in mm.
 */
function measureSegmentsHeight(doc: jsPDF, segments: RichTextSegment[], maxWidth: number): number {
	return measureWrappedTextHeight(doc, segmentsToPlainText(segments), maxWidth)
}

/**
 * Estimates the total height of markdown blocks before rendering.
 *
 * @param doc - PDF document used for text measurement.
 * @param blocks - Markdown blocks to measure.
 * @param maxWidth - Available width for the root block.
 * @returns Estimated height in mm.
 *
 * @example
 * ```ts
 * const height = measureMarkdownBlocksHeight(doc, blocks, 178)
 * ```
 */
export function measureMarkdownBlocksHeight(
	doc: jsPDF,
	blocks: MarkdownBlock[],
	maxWidth: number,
): number {
	let height = 0

	// The measurement model intentionally mirrors the renderer's indentation and
	// block spacing rules so higher-level pagination decisions are predictable.
	for (const block of blocks) {
		switch (block.type) {
			case 'paragraph':
			case 'heading':
				height += measureSegmentsHeight(doc, block.segments, maxWidth) + 2
				break

			case 'bulletList':
				for (const item of block.items) {
					const itemText = segmentsToPlainText(item.segments)

					if (itemText) {
						height += measureWrappedTextHeight(doc, `• ${itemText}`, maxWidth) + 1.5
					}

					if (item.children?.length) {
						height += measureMarkdownBlocksHeight(doc, item.children, maxWidth - 4)
					}
				}
				break

			case 'orderedList':
				block.items.forEach((item, index) => {
					const itemText = segmentsToPlainText(item.segments)

					if (itemText) {
						height +=
							measureWrappedTextHeight(doc, `${index + 1}. ${itemText}`, maxWidth) +
							1.5
					}

					if (item.children?.length) {
						height += measureMarkdownBlocksHeight(doc, item.children, maxWidth - 4)
					}
				})
				break

			case 'blockquote':
				height += measureMarkdownBlocksHeight(doc, block.blocks, maxWidth - 4) + 4
				break

			case 'horizontalRule':
				height += 4
				break
		}
	}

	return height
}
