/* eslint-disable */

import type { ItemsCollectionItem } from '@nuxt/content'
import type { Audit, PillarAverage } from '~~/shared/types/audit'

import { Editor } from '@tiptap/core'
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'
import { jsPDF } from 'jspdf'

/**
 * Options for generating a report.
 */
export type ReportOptions = {
	/**
	 * Filename for the generated PDF.
	 *
	 * @default `rapport_<title>_<timestamp>.pdf`
	 */
	filename?: string
}

/**
 * Supported PDF font weights used in this generator.
 */
type PdfFontStyle = 'normal' | 'bold' | 'italic' | 'bolditalic'

/**
 * Semantic PDF color token.
 */
type PdfColor = readonly [number, number, number]

/**
 * Normalized text block extracted from markdown.
 */
type MarkdownBlock =
	| { type: 'paragraph'; text: string }
	| { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
	| { type: 'bullet'; text: string }
	| { type: 'ordered'; index: number; text: string }

/**
 * Internal layout constants for A4 portrait in millimeters.
 */
const PDF_LAYOUT = {
	pageWidth: 210,
	pageHeight: 297,
	marginTop: 18,
	marginRight: 16,
	marginBottom: 18,
	marginLeft: 16,
	lineHeight: 5.2,
	sectionGap: 8,
	blockGap: 4,
	cardPadding: 5,
	cardGap: 4,
	borderRadius: 2,
}

/**
 * Centralized PDF color palette.
 */
const PDF_COLORS = {
	text: [17, 17, 17],
	muted: [107, 114, 128],
	primary: [169, 0, 97],
	secondary: [0, 123, 199],
	success: [22, 163, 74],
	warning: [245, 158, 11],
	error: [220, 38, 38],
	border: [229, 231, 235],
	soft: [249, 250, 251],
	commentBg: [248, 250, 252],
} as const satisfies Record<string, PdfColor>

/**
 * Error used when report generation fails.
 */
export class ReportGenerationError extends Error {
	/**
	 * @param message - Human readable message.
	 * @param cause - Original error cause.
	 */
	public constructor(message: string, cause?: unknown) {
		super(message, { cause })

		this.name = 'ReportGenerationError'
	}
}

/**
 * Maps semantic score color to a PDF-safe RGB tuple.
 *
 * @param color - Semantic color token.
 * @returns RGB tuple.
 */
function mapColor(color?: string): PdfColor {
	switch (color) {
		case 'success':
			return PDF_COLORS.success
		case 'warning':
			return PDF_COLORS.warning
		case 'error':
			return PDF_COLORS.error
		case 'info':
			return PDF_COLORS.secondary
		case 'primary':
			return PDF_COLORS.primary
		case 'secondary':
			return PDF_COLORS.muted
		default:
			return PDF_COLORS.text
	}
}

/**
 * Applies an RGB color tuple to the current text color.
 *
 * @param doc - PDF document.
 * @param color - RGB tuple.
 * @returns Nothing.
 */
function setTextColor(doc: jsPDF, color: PdfColor): void {
	doc.setTextColor(color[0], color[1], color[2])
}

/**
 * Applies an RGB color tuple to the current draw color.
 *
 * @param doc - PDF document.
 * @param color - RGB tuple.
 * @returns Nothing.
 */
function setDrawColor(doc: jsPDF, color: PdfColor): void {
	doc.setDrawColor(color[0], color[1], color[2])
}

/**
 * Applies an RGB color tuple to the current fill color.
 *
 * @param doc - PDF document.
 * @param color - RGB tuple.
 * @returns Nothing.
 */
function setFillColor(doc: jsPDF, color: PdfColor): void {
	doc.setFillColor(color[0], color[1], color[2])
}

/**
 * Creates a new jsPDF document configured for A4 portrait.
 *
 * @returns Configured jsPDF instance.
 */
function createPdfDocument(): jsPDF {
	return new jsPDF({
		orientation: 'portrait',
		unit: 'mm',
		format: 'a4',
		compress: true,
		putOnlyUsedFonts: true,
	})
}

/**
 * Returns the writable width inside page margins.
 *
 * @returns Inner content width in mm.
 */
function getContentWidth(): number {
	return PDF_LAYOUT.pageWidth - PDF_LAYOUT.marginLeft - PDF_LAYOUT.marginRight
}

/**
 * Creates a stable filename-safe slug.
 *
 * @param value - Raw filename input.
 * @returns Safe filename fragment.
 */
function sanitizeFilename(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\-_]+/gu, '_')
		.replace(/_+/g, '_')
		.replace(/^_+|_+$/g, '')
}

/**
 * Ensures there is enough room for the next block on the current page.
 *
 * @param doc - PDF document.
 * @param cursorY - Current Y cursor.
 * @param requiredHeight - Height needed for the next block.
 * @returns Safe Y cursor, possibly on a new page.
 */
function ensurePageSpace(doc: jsPDF, cursorY: number, requiredHeight: number): number {
	const limit = PDF_LAYOUT.pageHeight - PDF_LAYOUT.marginBottom

	if (cursorY + requiredHeight <= limit) {
		return cursorY
	}

	doc.addPage()

	return PDF_LAYOUT.marginTop
}

/**
 * Draws a page header line separator.
 *
 * @param doc - PDF document.
 * @param y - Y position.
 * @returns Nothing.
 */
function drawSectionDivider(doc: jsPDF, y: number): void {
	setDrawColor(doc, PDF_COLORS.border)
	doc.setLineWidth(0.4)
	doc.line(PDF_LAYOUT.marginLeft, y, PDF_LAYOUT.pageWidth - PDF_LAYOUT.marginRight, y)
}

/**
 * Writes wrapped text and returns the next cursor position.
 *
 * @param doc - PDF document.
 * @param text - Text to render.
 * @param x - X position.
 * @param y - Y position.
 * @param maxWidth - Maximum text width.
 * @param fontSize - Font size in points.
 * @param fontStyle - Font style.
 * @param color - Text color.
 * @param lineHeight - Line height in mm.
 * @returns Next Y cursor.
 */
function writeWrappedText(
	doc: jsPDF,
	text: string,
	x: number,
	y: number,
	maxWidth: number,
	fontSize: number,
	fontStyle: PdfFontStyle,
	color: PdfColor,
	lineHeight = PDF_LAYOUT.lineHeight,
): number {
	doc.setFont('helvetica', fontStyle)
	doc.setFontSize(fontSize)
	setTextColor(doc, color)

	const lines = doc.splitTextToSize(text, maxWidth) as string[]

	doc.text(lines, x, y)

	return y + lines.length * lineHeight
}

/**
 * Measures the rendered height of wrapped text.
 *
 * @param doc - PDF document.
 * @param text - Text to measure.
 * @param maxWidth - Maximum text width.
 * @returns Height in mm.
 */
function measureWrappedTextHeight(doc: jsPDF, text: string, maxWidth: number): number {
	const lines = doc.splitTextToSize(text, maxWidth) as string[]
	return Math.max(lines.length, 1) * PDF_LAYOUT.lineHeight
}

/**
 * Converts markdown to HTML using TipTap.
 *
 * @param markdown - Markdown input.
 * @returns HTML string.
 */
function markdownToHtml(markdown: string): string {
	const editor = new Editor({
		extensions: [StarterKit, Markdown],
		content: '',
	})

	editor.commands.setContent(markdown, {
		contentType: 'markdown',
	})

	const html = editor.getHTML()

	editor.destroy()

	return html
}

/**
 * Extracts simplified semantic blocks from HTML.
 *
 * This intentionally keeps the model modest. Full CSS-like rendering in a PDF
 * library is where sanity goes to die.
 *
 * @param html - HTML input string.
 * @returns Structured markdown-ish blocks.
 */
function htmlToBlocks(html: string): MarkdownBlock[] {
	const parser = new DOMParser()
	const documentNode = parser.parseFromString(html, 'text/html')
	const blocks: MarkdownBlock[] = []

	const bodyChildren = Array.from(documentNode.body.children)

	for (const child of bodyChildren) {
		const tagName = child.tagName.toLowerCase()
		const text = child.textContent?.replace(/\s+/g, ' ').trim() ?? ''

		if (!text) {
			continue
		}

		if (/^h[1-6]$/.test(tagName)) {
			blocks.push({
				type: 'heading',
				level: Number(tagName.replace('h', '')) as 1 | 2 | 3 | 4 | 5 | 6,
				text,
			})
			continue
		}

		if (tagName === 'ul') {
			const items = Array.from(child.querySelectorAll(':scope > li'))

			for (const item of items) {
				const itemText = item.textContent?.replace(/\s+/g, ' ').trim() ?? ''
				if (itemText) {
					blocks.push({ type: 'bullet', text: itemText })
				}
			}

			continue
		}

		if (tagName === 'ol') {
			const items = Array.from(child.querySelectorAll(':scope > li'))

			items.forEach((item, index) => {
				const itemText = item.textContent?.replace(/\s+/g, ' ').trim() ?? ''
				if (itemText) {
					blocks.push({ type: 'ordered', index: index + 1, text: itemText })
				}
			})

			continue
		}

		blocks.push({
			type: 'paragraph',
			text,
		})
	}

	return blocks
}

/**
 * Converts audit markdown comments into renderable block arrays.
 *
 * @param items - Audits with optional markdown comments.
 * @returns Map by audit id.
 */
function markdownToBlockMap(items: Audit<ItemsCollectionItem>[]): Map<string, MarkdownBlock[]> {
	const map = new Map<string, MarkdownBlock[]>()

	for (const item of items) {
		const markdown = item.comment?.trim()

		if (!markdown) {
			map.set(item.id, [])
			continue
		}

		const html = markdownToHtml(markdown)
		const blocks = htmlToBlocks(html)

		map.set(item.id, blocks)
	}

	return map
}

/**
 * Renders a section title and divider.
 *
 * @param doc - PDF document.
 * @param text - Section title.
 * @param y - Current Y cursor.
 * @returns Next Y cursor.
 */
function renderSectionTitle(doc: jsPDF, text: string, y: number): number {
	let cursorY = ensurePageSpace(doc, y, 14)

	doc.setFont('helvetica', 'bold')
	doc.setFontSize(16)
	setTextColor(doc, PDF_COLORS.primary)
	doc.text(text, PDF_LAYOUT.marginLeft, cursorY)

	cursorY += 3.5
	drawSectionDivider(doc, cursorY)

	return cursorY + 6
}

/**
 * Renders a simple cover page.
 *
 * @param doc - PDF document.
 * @param title - Report title.
 * @returns Nothing.
 */
function renderCoverPage(doc: jsPDF, title: string): void {
	let y = 70

	doc.setFont('helvetica', 'bold')
	doc.setFontSize(28)
	setTextColor(doc, PDF_COLORS.primary)
	doc.text(title, PDF_LAYOUT.marginLeft, y)

	y += 14

	doc.setFont('helvetica', 'normal')
	doc.setFontSize(12)
	setTextColor(doc, PDF_COLORS.muted)
	doc.text(`Gegenereerd op ${new Date().toLocaleDateString('nl-NL')}`, PDF_LAYOUT.marginLeft, y)
}

/**
 * Renders the introduction page.
 *
 * @param doc - PDF document.
 * @returns Nothing.
 */
function renderIntroductionPage(doc: jsPDF): void {
	doc.addPage()

	let y = PDF_LAYOUT.marginTop

	y = renderSectionTitle(doc, 'Introductie', y)

	y = writeWrappedText(
		doc,
		'Dit rapport geeft inzicht in de kwaliteit van de website op basis van verschillende pijlers. Per onderdeel zijn scores en toelichtingen opgenomen.',
		PDF_LAYOUT.marginLeft,
		y,
		getContentWidth(),
		11,
		'normal',
		PDF_COLORS.text,
	)

	void y
}

/**
 * Renders the pillar averages overview.
 *
 * @param doc - PDF document.
 * @param averages - Pillar averages.
 * @returns Nothing.
 */
function renderAveragesSection(
	doc: jsPDF,
	averages: PillarAverage<ItemsCollectionItem['pillar']>[],
): void {
	doc.addPage()

	let y = PDF_LAYOUT.marginTop
	y = renderSectionTitle(doc, 'Overzicht per pijler', y)

	const pageWidth = getContentWidth()
	const columnGap = 6
	const columnWidth = (pageWidth - columnGap) / 2
	const cardHeight = 34

	averages.forEach((average, index) => {
		const isLeft = index % 2 === 0
		const rowIndex = Math.floor(index / 2)
		const x = PDF_LAYOUT.marginLeft + (isLeft ? 0 : columnWidth + columnGap)
		const cardY = y + rowIndex * (cardHeight + PDF_LAYOUT.cardGap)

		const safeY = ensurePageSpace(doc, cardY, cardHeight + 4)

		if (safeY !== cardY) {
			y = safeY

			const adjustedRowIndex = 0
			const adjustedCardY = y + adjustedRowIndex * (cardHeight + PDF_LAYOUT.cardGap)
			const adjustedX = PDF_LAYOUT.marginLeft + (isLeft ? 0 : columnWidth + columnGap)

			drawAverageCard(doc, adjustedX, adjustedCardY, columnWidth, cardHeight, average)

			if (!isLeft) {
				y = adjustedCardY + cardHeight + PDF_LAYOUT.cardGap
			}

			return
		}

		drawAverageCard(doc, x, cardY, columnWidth, cardHeight, average)

		if (!isLeft) {
			y = cardY + cardHeight + PDF_LAYOUT.cardGap
		}
	})
}

/**
 * Draws a single average card.
 *
 * @param doc - PDF document.
 * @param x - X position.
 * @param y - Y position.
 * @param width - Card width.
 * @param height - Card height.
 * @param average - Average data.
 * @returns Nothing.
 */
function drawAverageCard(
	doc: jsPDF,
	x: number,
	y: number,
	width: number,
	height: number,
	average: {
		score?: number
		count?: number
		label: string
		color?: string
		pillar: string
	},
): void {
	setFillColor(doc, PDF_COLORS.soft)
	setDrawColor(doc, PDF_COLORS.border)
	doc.roundedRect(x, y, width, height, PDF_LAYOUT.borderRadius, PDF_LAYOUT.borderRadius, 'FD')

	let cursorY = y + 7

	doc.setFont('helvetica', 'bold')
	doc.setFontSize(12)
	setTextColor(doc, PDF_COLORS.secondary)
	doc.text(average.pillar, x + PDF_LAYOUT.cardPadding, cursorY)

	cursorY += 8

	if (average.score !== undefined) {
		doc.setFont('helvetica', 'bold')
		doc.setFontSize(18)
		setTextColor(doc, mapColor(average.color))
		doc.text(`${average.score}/10`, x + PDF_LAYOUT.cardPadding, cursorY)
	} else {
		doc.setFont('helvetica', 'normal')
		doc.setFontSize(11)
		setTextColor(doc, PDF_COLORS.muted)
		doc.text('Nog geen score', x + PDF_LAYOUT.cardPadding, cursorY)
	}

	cursorY += 7

	doc.setFont('helvetica', 'normal')
	doc.setFontSize(10)
	setTextColor(doc, PDF_COLORS.text)

	const labelLines = doc.splitTextToSize(
		average.label,
		width - PDF_LAYOUT.cardPadding * 2,
	) as string[]
	doc.text(labelLines, x + PDF_LAYOUT.cardPadding, cursorY)
}

/**
 * Measures the height of a markdown comment block.
 *
 * @param doc - PDF document.
 * @param blocks - Markdown blocks.
 * @param maxWidth - Available width.
 * @returns Estimated height in mm.
 */
function measureMarkdownBlocksHeight(
	doc: jsPDF,
	blocks: MarkdownBlock[],
	maxWidth: number,
): number {
	let height = 0

	for (const block of blocks) {
		switch (block.type) {
			case 'heading':
				height += measureWrappedTextHeight(doc, block.text, maxWidth) + 2
				break
			case 'paragraph':
				height += measureWrappedTextHeight(doc, block.text, maxWidth) + 2
				break
			case 'bullet':
				height += measureWrappedTextHeight(doc, `• ${block.text}`, maxWidth) + 1.5
				break
			case 'ordered':
				height +=
					measureWrappedTextHeight(doc, `${block.index}. ${block.text}`, maxWidth) + 1.5
				break
		}
	}

	return height
}

/**
 * Renders markdown-derived blocks inside the current document.
 *
 * @param doc - PDF document.
 * @param blocks - Blocks to render.
 * @param x - X start.
 * @param y - Y start.
 * @param maxWidth - Available width.
 * @returns Next Y cursor.
 */
function renderMarkdownBlocks(
	doc: jsPDF,
	blocks: MarkdownBlock[],
	x: number,
	y: number,
	maxWidth: number,
): number {
	let cursorY = y

	for (const block of blocks) {
		switch (block.type) {
			case 'heading': {
				const fontSize = block.level <= 2 ? 12 : 11
				cursorY = writeWrappedText(
					doc,
					block.text,
					x,
					cursorY,
					maxWidth,
					fontSize,
					'bold',
					PDF_COLORS.text,
				)
				cursorY += 1.5
				break
			}

			case 'paragraph': {
				cursorY = writeWrappedText(
					doc,
					block.text,
					x,
					cursorY,
					maxWidth,
					10,
					'normal',
					PDF_COLORS.text,
				)
				cursorY += 1.5
				break
			}

			case 'bullet': {
				cursorY = writeWrappedText(
					doc,
					`• ${block.text}`,
					x,
					cursorY,
					maxWidth,
					10,
					'normal',
					PDF_COLORS.text,
				)
				cursorY += 1
				break
			}

			case 'ordered': {
				cursorY = writeWrappedText(
					doc,
					`${block.index}. ${block.text}`,
					x,
					cursorY,
					maxWidth,
					10,
					'normal',
					PDF_COLORS.text,
				)
				cursorY += 1
				break
			}
		}
	}

	return cursorY
}

/**
 * Draws a single audit card.
 *
 * @param doc - PDF document.
 * @param audit - Audit data.
 * @param commentBlocks - Renderable comment blocks.
 * @param startY - Y start position.
 * @returns Next Y cursor.
 */
function drawAuditCard(
	doc: jsPDF,
	audit: Audit<ItemsCollectionItem>,
	commentBlocks: MarkdownBlock[],
	startY: number,
): number {
	const contentWidth = getContentWidth()
	const cardX = PDF_LAYOUT.marginLeft
	const cardWidth = contentWidth
	const innerWidth = cardWidth - PDF_LAYOUT.cardPadding * 2

	const metaText = `${audit.item.pillar} • ${audit.item.priority}`
	const scoreText = audit.score !== undefined ? `${audit.score}/10` : 'Geen score'
	const descriptionText = audit.item.audit?.description?.trim() ?? ''

	const titleHeight = measureWrappedTextHeight(doc, audit.item.title, innerWidth)
	const metaHeight = measureWrappedTextHeight(doc, metaText, innerWidth)
	const scoreHeight = measureWrappedTextHeight(doc, scoreText, innerWidth)
	const descriptionHeight = descriptionText
		? measureWrappedTextHeight(doc, descriptionText, innerWidth)
		: 0

	const commentTitleHeight = commentBlocks.length > 0 ? 5 : 0
	const commentContentHeight =
		commentBlocks.length > 0
			? measureMarkdownBlocksHeight(doc, commentBlocks, innerWidth - 4)
			: 0
	const commentBoxHeight =
		commentBlocks.length > 0 ? commentTitleHeight + commentContentHeight + 6 : 0

	const estimatedHeight =
		6 +
		titleHeight +
		2 +
		metaHeight +
		2 +
		scoreHeight +
		(descriptionText ? 3 + descriptionHeight : 0) +
		(commentBlocks.length > 0 ? 5 + commentBoxHeight : 0) +
		5

	const y = ensurePageSpace(doc, startY, estimatedHeight)

	setFillColor(doc, PDF_COLORS.soft)
	setDrawColor(doc, PDF_COLORS.border)
	doc.roundedRect(
		cardX,
		y,
		cardWidth,
		estimatedHeight,
		PDF_LAYOUT.borderRadius,
		PDF_LAYOUT.borderRadius,
		'FD',
	)

	let cursorY = y + PDF_LAYOUT.cardPadding + 1

	cursorY = writeWrappedText(
		doc,
		audit.item.title,
		cardX + PDF_LAYOUT.cardPadding,
		cursorY,
		innerWidth,
		12,
		'bold',
		PDF_COLORS.text,
	)

	cursorY += 1

	cursorY = writeWrappedText(
		doc,
		metaText,
		cardX + PDF_LAYOUT.cardPadding,
		cursorY,
		innerWidth,
		9,
		'normal',
		PDF_COLORS.muted,
	)

	cursorY += 1

	cursorY = writeWrappedText(
		doc,
		scoreText,
		cardX + PDF_LAYOUT.cardPadding,
		cursorY,
		innerWidth,
		13,
		'bold',
		audit.score !== undefined ? PDF_COLORS.primary : PDF_COLORS.muted,
	)

	if (descriptionText) {
		cursorY += 1.5
		cursorY = writeWrappedText(
			doc,
			descriptionText,
			cardX + PDF_LAYOUT.cardPadding,
			cursorY,
			innerWidth,
			10,
			'normal',
			PDF_COLORS.text,
		)
	}

	if (commentBlocks.length > 0) {
		cursorY += 2.5

		setFillColor(doc, PDF_COLORS.commentBg)
		setDrawColor(doc, PDF_COLORS.secondary)
		doc.roundedRect(
			cardX + PDF_LAYOUT.cardPadding,
			cursorY,
			innerWidth,
			commentBoxHeight,
			PDF_LAYOUT.borderRadius,
			PDF_LAYOUT.borderRadius,
			'FD',
		)

		doc.setLineWidth(0.8)
		setDrawColor(doc, PDF_COLORS.secondary)
		doc.line(
			cardX + PDF_LAYOUT.cardPadding,
			cursorY,
			cardX + PDF_LAYOUT.cardPadding,
			cursorY + commentBoxHeight,
		)

		let commentY = cursorY + 5
		const commentX = cardX + PDF_LAYOUT.cardPadding + 4

		commentY = writeWrappedText(
			doc,
			'Toelichting',
			commentX,
			commentY,
			innerWidth - 6,
			10,
			'bold',
			PDF_COLORS.text,
		)

		commentY += 1
		commentY = renderMarkdownBlocks(doc, commentBlocks, commentX, commentY, innerWidth - 6)

		cursorY += commentBoxHeight
	}

	return y + estimatedHeight + PDF_LAYOUT.cardGap
}

/**
 * Renders the detailed audit section.
 *
 * @param doc - PDF document.
 * @param audits - Audit entries.
 * @returns Nothing.
 */
function renderAuditSection(doc: jsPDF, audits: Audit<ItemsCollectionItem>[]): void {
	doc.addPage()

	let y = PDF_LAYOUT.marginTop
	y = renderSectionTitle(doc, 'Details per onderdeel', y)

	const blockMap = markdownToBlockMap(audits)

	for (const audit of audits) {
		const commentBlocks = blockMap.get(audit.id) ?? []
		y = drawAuditCard(doc, audit, commentBlocks, y)
	}
}

function savePdf(doc: jsPDF, filename: string): void {
	const blob = doc.output('blob')

	if (!blob || blob.size === 0) {
		throw new Error('EMPTY_PDF')
	}

	const url = URL.createObjectURL(blob)

	// 🔥 important: must be sync + attached to DOM
	const link = document.createElement('a')
	link.href = url
	link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
	link.style.display = 'none'

	document.body.appendChild(link)

	// 🔥 critical: direct click, no await, no setTimeout
	link.click()

	document.body.removeChild(link)
	URL.revokeObjectURL(url)
}

/**
 * Main composable for generating an audit PDF report entirely in the browser.
 *
 * This implementation:
 * - uses jsPDF directly
 * - avoids html2canvas/html2pdf
 * - performs manual pagination and text wrapping
 * - converts markdown comments into simplified PDF blocks
 *
 * @returns Report generator API.
 */
export const useReportGenerator = () => {
	/**
	 * Generates and downloads a PDF report.
	 *
	 * @param data - Report data.
	 * @param options - Generation options.
	 * @returns Resolves when the PDF has been saved.
	 * @throws {ReportGenerationError} When PDF generation fails.
	 *
	 * @example
	 * ```ts
	 * const { generateReport } = useReportGenerator()
	 *
	 * await generateReport({
	 *   title: 'Onderwijsloket audit',
	 *   averages,
	 *   audits,
	 * })
	 * ```
	 */
	function generateReport(
		data: {
			title: string
			averages: PillarAverage<ItemsCollectionItem['pillar']>[]
			audits: Audit<ItemsCollectionItem>[]
		},
		options: ReportOptions = {},
	): void {
		try {
			console.log(0)
			const timestamp = Date.now()
			const fallbackFilename = `rapport_${sanitizeFilename(data.title)}_${timestamp}.pdf`
			const filename = options.filename ?? fallbackFilename

			console.log(1)
			const doc = createPdfDocument()

			console.log(2)
			renderCoverPage(doc, `Rapport ${data.title}`)
			console.log(3)
			renderIntroductionPage(doc)
			console.log(4)
			renderAveragesSection(doc, data.averages)
			console.log(5)
			renderAuditSection(doc, data.audits)
			console.log(6)
			savePdf(doc, filename)
			console.log(7)
		} catch (error: unknown) {
			console.error('Failed to generate report PDF', error)
			throw new ReportGenerationError('REPORT_GENERATION_FAILED', error)
		}
	}

	return {
		generateReport,
	}
}
