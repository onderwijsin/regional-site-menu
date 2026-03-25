import type { jsPDF } from 'jspdf'

import { Editor } from '@tiptap/core'
import Underline from '@tiptap/extension-underline'
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'
import { z } from 'zod'

import { PDF_COLORS } from './constants'
import { measureWrappedTextHeight, writeWrappedText } from './pdf'

/**
 * Supported inline mark types from the editor.
 */
export type RichTextMark = 'bold' | 'italic' | 'underline' | 'strike'

/**
 * Inline text segment with formatting marks.
 */
export type RichTextSegment = {
	/**
	 * Raw text content.
	 */
	text: string

	/**
	 * Applied marks for this text segment.
	 */
	marks: RichTextMark[]
}

/**
 * PDF-friendly block model derived from TipTap JSON.
 */
export type MarkdownBlock =
	| {
			type: 'paragraph'
			segments: RichTextSegment[]
	  }
	| {
			type: 'heading'
			level: 1 | 2 | 3
			segments: RichTextSegment[]
	  }
	| {
			type: 'bulletList'
			items: RichTextSegment[][]
	  }
	| {
			type: 'orderedList'
			items: RichTextSegment[][]
	  }
	| {
			type: 'blockquote'
			blocks: MarkdownBlock[]
	  }
	| {
			type: 'horizontalRule'
	  }

/**
 * Minimal TipTap mark.
 */
type TiptapMark = {
	type: string
}

/**
 * Minimal recursive TipTap node.
 */
type TiptapNode = {
	type: string
	attrs?: Record<string, unknown>
	content?: TiptapNode[]
	text?: string
	marks?: TiptapMark[]
}

/**
 * Minimal TipTap document.
 */
type TiptapDoc = {
	type: 'doc'
	content?: TiptapNode[]
}

/**
 * Zod schema for a minimal TipTap mark.
 */
const TiptapMarkSchema = z.object({
	type: z.string(),
})

/**
 * Recursive Zod schema for a minimal TipTap node.
 */
const TiptapNodeSchema: z.ZodType<TiptapNode> = z.lazy(() =>
	z.object({
		type: z.string(),
		attrs: z.record(z.string(), z.unknown()).optional(),
		content: z.array(TiptapNodeSchema).optional(),
		text: z.string().optional(),
		marks: z.array(TiptapMarkSchema).optional(),
	}),
)

/**
 * Zod schema for a minimal TipTap document.
 */
const TiptapDocSchema: z.ZodType<TiptapDoc> = z.object({
	type: z.literal('doc'),
	content: z.array(TiptapNodeSchema).optional(),
})

/**
 * Parses markdown into TipTap JSON.
 *
 * @param markdown - Markdown input.
 * @returns Validated TipTap document JSON.
 */
export function markdownToTiptapDoc(markdown: string): z.infer<typeof TiptapDocSchema> {
	const editor = new Editor({
		extensions: [StarterKit, Markdown, Underline],
		content: '',
	})

	try {
		editor.commands.setContent(markdown, {
			contentType: 'markdown',
		})

		return TiptapDocSchema.parse(editor.getJSON())
	} finally {
		editor.destroy()
	}
}

/**
 * Normalizes raw text.
 *
 * @param value - Raw text input.
 * @returns Normalized text.
 */
function normalizeText(value: string | undefined): string {
	return value?.replace(/\s+/g, ' ').trim() ?? ''
}

/**
 * Maps TipTap marks to the simplified internal mark model.
 *
 * @param marks - Raw TipTap marks.
 * @returns Supported marks only.
 */
function mapMarks(marks: Array<{ type: string }> | undefined): RichTextMark[] {
	if (!marks?.length) {
		return []
	}

	const supportedMarks: RichTextMark[] = []

	for (const mark of marks) {
		switch (mark.type) {
			case 'bold':
			case 'italic':
			case 'underline':
			case 'strike':
				supportedMarks.push(mark.type)
				break
			default:
				break
		}
	}

	return supportedMarks
}

/**
 * Extracts rich text segments from a node subtree.
 *
 * @param node - TipTap node.
 * @returns Flattened text segments.
 */
function extractTextSegments(node: z.infer<typeof TiptapNodeSchema>): RichTextSegment[] {
	if (node.type === 'text') {
		const text = normalizeText(node.text)

		if (!text) {
			return []
		}

		return [
			{
				text,
				marks: mapMarks(node.marks),
			},
		]
	}

	if (!node.content?.length) {
		return []
	}

	return node.content.flatMap((child) => extractTextSegments(child))
}

/**
 * Extracts list item text segments from a list item node.
 *
 * @param node - TipTap list item node.
 * @returns Segments for that item.
 */
function extractListItemSegments(node: z.infer<typeof TiptapNodeSchema>): RichTextSegment[] {
	if (!node.content?.length) {
		return []
	}

	const segments: RichTextSegment[] = []

	for (const child of node.content) {
		if (child.type === 'paragraph') {
			segments.push(...extractTextSegments(child))
			continue
		}

		if (child.type === 'text') {
			segments.push(...extractTextSegments(child))
		}
	}

	return segments
}

/**
 * Converts a TipTap node into one or more PDF-friendly blocks.
 *
 * @param node - TipTap node.
 * @returns PDF-friendly render blocks.
 */
function tiptapNodeToBlocks(node: z.infer<typeof TiptapNodeSchema>): MarkdownBlock[] {
	switch (node.type) {
		case 'paragraph': {
			const segments = extractTextSegments(node)

			if (!segments.length) {
				return []
			}

			return [
				{
					type: 'paragraph',
					segments,
				},
			]
		}

		case 'heading': {
			const segments = extractTextSegments(node)

			if (!segments.length) {
				return []
			}

			const level = Number(node.attrs?.level)

			return [
				{
					type: 'heading',
					level: level === 1 || level === 2 || level === 3 ? level : 3,
					segments,
				},
			]
		}

		case 'bulletList': {
			const items =
				node.content
					?.filter((child) => child.type === 'listItem')
					.map((child) => extractListItemSegments(child))
					.filter((segments) => segments.length > 0) ?? []

			if (!items.length) {
				return []
			}

			return [
				{
					type: 'bulletList',
					items,
				},
			]
		}

		case 'orderedList': {
			const items =
				node.content
					?.filter((child) => child.type === 'listItem')
					.map((child) => extractListItemSegments(child))
					.filter((segments) => segments.length > 0) ?? []

			if (!items.length) {
				return []
			}

			return [
				{
					type: 'orderedList',
					items,
				},
			]
		}

		case 'blockquote': {
			const blocks = node.content?.flatMap((child) => tiptapNodeToBlocks(child)) ?? []

			if (!blocks.length) {
				return []
			}

			return [
				{
					type: 'blockquote',
					blocks,
				},
			]
		}

		case 'horizontalRule':
			return [{ type: 'horizontalRule' }]

		default:
			return []
	}
}

/**
 * Converts markdown into PDF-friendly blocks using TipTap JSON as the intermediate format.
 *
 * @param markdown - Markdown input.
 * @returns Renderable blocks.
 */
export function markdownToBlocks(markdown: string): MarkdownBlock[] {
	const documentNode = markdownToTiptapDoc(markdown)
	return documentNode.content?.flatMap((node) => tiptapNodeToBlocks(node)) ?? []
}

/**
 * Converts rich text segments into plain text.
 *
 * @param segments - Rich text segments.
 * @returns Plain text.
 */
function segmentsToPlainText(segments: RichTextSegment[]): string {
	return segments.map((segment) => segment.text).join('')
}

/**
 * Measures a paragraph-like line of rich text as plain text.
 *
 * @param doc - PDF document.
 * @param segments - Rich text segments.
 * @param maxWidth - Available width.
 * @returns Height in mm.
 */
function measureSegmentsHeight(doc: jsPDF, segments: RichTextSegment[], maxWidth: number): number {
	return measureWrappedTextHeight(doc, segmentsToPlainText(segments), maxWidth)
}

/**
 * Measures total block height for markdown content.
 *
 * @param doc - PDF document.
 * @param blocks - Blocks to measure.
 * @param maxWidth - Available width.
 * @returns Estimated height in mm.
 */
export function measureMarkdownBlocksHeight(
	doc: jsPDF,
	blocks: MarkdownBlock[],
	maxWidth: number,
): number {
	let height = 0

	for (const block of blocks) {
		switch (block.type) {
			case 'paragraph':
				height += measureSegmentsHeight(doc, block.segments, maxWidth) + 2
				break

			case 'heading':
				height += measureSegmentsHeight(doc, block.segments, maxWidth) + 2
				break

			case 'bulletList':
				for (const item of block.items) {
					height +=
						measureWrappedTextHeight(doc, `• ${segmentsToPlainText(item)}`, maxWidth) +
						1.5
				}
				break

			case 'orderedList':
				block.items.forEach((item, index) => {
					height +=
						measureWrappedTextHeight(
							doc,
							`${index + 1}. ${segmentsToPlainText(item)}`,
							maxWidth,
						) + 1.5
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

/**
 * Chooses a best-effort PDF font style from segment marks.
 *
 * @param marks - Segment marks.
 * @returns PDF font style.
 *
 * @remarks
 * jsPDF does not support underline/strike as native font styles.
 * Those marks are currently ignored at the font level.
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
 * Renders rich text segments.
 *
 * @param doc - PDF document.
 * @param segments - Segments to render.
 * @param x - Start X.
 * @param y - Start Y.
 * @param maxWidth - Available width.
 * @param fontSize - Font size.
 * @returns Next cursor Y.
 *
 * @remarks
 * This version uses plain wrapped text for layout and applies the dominant
 * style when segments are mixed. Full per-span inline layout can be added later.
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
 * Renders markdown blocks.
 *
 * @param doc - PDF document.
 * @param blocks - Blocks to render.
 * @param x - Start X.
 * @param y - Start Y.
 * @param maxWidth - Available width.
 * @returns Next cursor Y.
 */
export function renderMarkdownBlocks(
	doc: jsPDF,
	blocks: MarkdownBlock[],
	x: number,
	y: number,
	maxWidth: number,
): number {
	let cursorY = y

	for (const block of blocks) {
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
				for (const item of block.items) {
					cursorY = writeWrappedText(doc, {
						text: `• ${segmentsToPlainText(item)}`,
						x,
						y: cursorY,
						maxWidth,
						fontSize: 10,
						fontStyle: 'normal',
						color: PDF_COLORS.text,
					})
					cursorY += 1
				}
				break

			case 'orderedList':
				block.items.forEach((item, index) => {
					cursorY = writeWrappedText(doc, {
						text: `${index + 1}. ${segmentsToPlainText(item)}`,
						x,
						y: cursorY,
						maxWidth,
						fontSize: 10,
						fontStyle: 'normal',
						color: PDF_COLORS.text,
					})
					cursorY += 1
				})
				break

			case 'blockquote':
				doc.setDrawColor(180, 180, 180)
				doc.setLineWidth(0.8)
				doc.line(
					x,
					cursorY,
					x,
					cursorY + measureMarkdownBlocksHeight(doc, block.blocks, maxWidth - 4),
				)

				cursorY = renderMarkdownBlocks(doc, block.blocks, x + 4, cursorY + 1, maxWidth - 4)
				cursorY += 1
				break

			case 'horizontalRule':
				doc.setDrawColor(220, 220, 220)
				doc.setLineWidth(0.4)
				doc.line(x, cursorY, x + maxWidth, cursorY)
				cursorY += 4
				break
		}
	}

	return cursorY
}
