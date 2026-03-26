import type {
	MarkdownBlock,
	MarkdownListItem,
	RichTextMark,
	RichTextSegment,
	TiptapDoc,
	TiptapNode,
} from './types'

import { Editor } from '@tiptap/core'
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'
import { z } from 'zod'

const TiptapMarkSchema = z.object({
	type: z.string(),
})

const TiptapNodeSchema: z.ZodType<TiptapNode> = z.lazy(() =>
	z.object({
		type: z.string(),
		attrs: z.record(z.string(), z.unknown()).optional(),
		content: z.array(TiptapNodeSchema).optional(),
		text: z.string().optional(),
		marks: z.array(TiptapMarkSchema).optional(),
	}),
)

const TiptapDocSchema: z.ZodType<TiptapDoc> = z.object({
	type: z.literal('doc'),
	content: z.array(TiptapNodeSchema).optional(),
})

/**
 * Parses markdown into validated TipTap JSON.
 *
 * @param markdown - Raw markdown content from the editor.
 * @returns Validated TipTap document JSON.
 * @throws {ZodError} When the generated TipTap structure does not match the expected shape.
 *
 * @example
 * ```ts
 * const doc = markdownToTiptapDoc('## Titel\\n\\n- Punt')
 * ```
 */
export function markdownToTiptapDoc(markdown: string): z.infer<typeof TiptapDocSchema> {
	const editor = new Editor({
		extensions: [StarterKit, Markdown],
		content: '',
	})

	try {
		editor.commands.setContent(markdown, {
			contentType: 'markdown',
		})

		// TipTap is used only as a parser here. We immediately validate and
		// convert the result so the PDF layer can stay independent of editor APIs.
		return TiptapDocSchema.parse(editor.getJSON())
	} finally {
		editor.destroy()
	}
}

/**
 * Normalizes raw text extracted from TipTap nodes.
 *
 * @param value - Raw node text.
 * @returns Trimmed text with collapsed whitespace.
 */
function normalizeText(value: string | undefined): string {
	return value?.replace(/\s+/g, ' ').trim() ?? ''
}

/**
 * Filters TipTap marks down to the subset supported by the PDF renderer.
 *
 * @param marks - Raw TipTap marks.
 * @returns Supported text marks.
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
 * Extracts flat rich-text segments from a TipTap node subtree.
 *
 * @param node - TipTap node to flatten.
 * @returns Text segments that preserve supported marks.
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
 * Converts a TipTap list item node into the simplified markdown list model.
 *
 * @param node - TipTap list item node.
 * @returns Structured list item or `null` when the node has no renderable content.
 */
function extractListItem(node: z.infer<typeof TiptapNodeSchema>): MarkdownListItem | null {
	if (!node.content?.length) {
		return null
	}

	const segments: RichTextSegment[] = []
	const children: MarkdownBlock[] = []

	// A list item can contain both its own paragraph content and nested child
	// lists or blockquotes. We keep those concerns separate for rendering.
	for (const child of node.content) {
		if (child.type === 'paragraph' || child.type === 'text') {
			segments.push(...extractTextSegments(child))
			continue
		}

		if (
			child.type === 'bulletList' ||
			child.type === 'orderedList' ||
			child.type === 'blockquote'
		) {
			children.push(...tiptapNodeToBlocks(child))
		}
	}

	if (!segments.length && !children.length) {
		return null
	}

	return {
		segments,
		children: children.length > 0 ? children : undefined,
	}
}

/**
 * Converts one TipTap node into one or more PDF-friendly markdown blocks.
 *
 * @param node - TipTap node to transform.
 * @returns Normalized markdown blocks understood by the PDF renderer.
 */
function tiptapNodeToBlocks(node: z.infer<typeof TiptapNodeSchema>): MarkdownBlock[] {
	switch (node.type) {
		case 'paragraph': {
			const segments = extractTextSegments(node)

			if (!segments.length) {
				return []
			}

			return [{ type: 'paragraph', segments }]
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
					.map((child) => extractListItem(child))
					.filter((item): item is MarkdownListItem => item !== null) ?? []

			return items.length ? [{ type: 'bulletList', items }] : []
		}

		case 'orderedList': {
			const items =
				node.content
					?.filter((child) => child.type === 'listItem')
					.map((child) => extractListItem(child))
					.filter((item): item is MarkdownListItem => item !== null) ?? []

			return items.length ? [{ type: 'orderedList', items }] : []
		}

		case 'blockquote': {
			// Nested blocks are preserved because the renderer needs to apply an
			// indentation and visual rule around the whole quoted section.
			const blocks = node.content?.flatMap((child) => tiptapNodeToBlocks(child)) ?? []
			return blocks.length ? [{ type: 'blockquote', blocks }] : []
		}

		case 'horizontalRule':
			return [{ type: 'horizontalRule' }]

		default:
			return []
	}
}

/**
 * Converts markdown into the simplified block model used by the PDF layer.
 *
 * @param markdown - Raw markdown content.
 * @returns Renderable markdown blocks.
 * @throws {ZodError} When TipTap JSON validation fails.
 *
 * @example
 * ```ts
 * const blocks = markdownToBlocks('## Titel\\n\\nEen paragraaf')
 * ```
 */
export function markdownToBlocks(markdown: string): MarkdownBlock[] {
	const documentNode = markdownToTiptapDoc(markdown)
	return documentNode.content?.flatMap((node) => tiptapNodeToBlocks(node)) ?? []
}
