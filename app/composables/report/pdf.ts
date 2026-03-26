import type { PdfColor, PdfFontStyle, ScoreColor } from './types'

import { jsPDF } from 'jspdf'

import { PDF_COLORS, PDF_LAYOUT } from './constants'
import { registerFonts } from './fonts'

/**
 * Rendering context shared between helpers.
 */
export type PdfRenderContext = {
	doc: jsPDF
	page: {
		width: number
		height: number
		contentWidth: number
	}
	layout: typeof PDF_LAYOUT
	colors: typeof PDF_COLORS
}

/**
 * Creates a new PDF rendering context with document instance, layout metrics,
 * and shared color tokens.
 *
 * @returns Initialized rendering context.
 * @throws {Error} When font registration fails.
 *
 * @example
 * ```ts
 * const ctx = await createRenderContext()
 * ctx.doc.text('Hello', 20, 20)
 * ```
 */
export async function createRenderContext(): Promise<PdfRenderContext> {
	const doc = new jsPDF({
		orientation: 'portrait',
		unit: 'mm',
		format: 'a4',
		compress: true,
		putOnlyUsedFonts: true,
	})

	await registerFonts(doc)

	return {
		doc,
		page: {
			width: PDF_LAYOUT.pageWidth,
			height: PDF_LAYOUT.pageHeight,
			contentWidth: PDF_LAYOUT.pageWidth - PDF_LAYOUT.marginLeft - PDF_LAYOUT.marginRight,
		},
		layout: PDF_LAYOUT,
		colors: PDF_COLORS,
	}
}

/**
 * Applies an RGB tuple as text color.
 *
 * @param doc - PDF document.
 * @param color - RGB tuple.
 * @returns Nothing.
 */
export function setPdfTextColor(doc: jsPDF, color: PdfColor): void {
	doc.setTextColor(color[0], color[1], color[2])
}

/**
 * Applies an RGB tuple as draw color.
 *
 * @param doc - PDF document.
 * @param color - RGB tuple.
 * @returns Nothing.
 */
export function setPdfDrawColor(doc: jsPDF, color: PdfColor): void {
	doc.setDrawColor(color[0], color[1], color[2])
}

/**
 * Applies an RGB tuple as fill color.
 *
 * @param doc - PDF document.
 * @param color - RGB tuple.
 * @returns Nothing.
 */
export function setPdfFillColor(doc: jsPDF, color: PdfColor): void {
	doc.setFillColor(color[0], color[1], color[2])
}

/**
 * Maps a semantic score token to the centralized PDF color palette.
 *
 * @param color - Semantic color token.
 * @returns RGB tuple.
 */
export function mapScoreColor(color: ScoreColor): PdfColor {
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
 * Sanitizes free text so it can be safely embedded in a generated filename.
 *
 * @param value - Raw filename input.
 * @returns Sanitized filename fragment.
 */
export function sanitizeFilename(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\-_]+/gu, '_')
		.replace(/_+/g, '_')
		.replace(/^_+|_+$/g, '')
}

/**
 * Creates the default filename used for report downloads.
 *
 * @param region - Region name.
 * @returns Filename ending in `.pdf`.
 */
export function createDefaultFilename(region: string): string {
	return `rapport_${sanitizeFilename(region)}_${Date.now()}.pdf`
}

/**
 * Ensures there is enough vertical space for the next content block.
 *
 * @param ctx - Rendering context.
 * @param cursorY - Current Y cursor.
 * @param requiredHeight - Height needed for the next block.
 * @returns Safe Y cursor, reset to the top margin when a new page is added.
 */
export function ensurePageSpace(
	ctx: PdfRenderContext,
	cursorY: number,
	requiredHeight: number,
): number {
	const limit = ctx.page.height - ctx.layout.marginBottom

	if (cursorY + requiredHeight <= limit) {
		return cursorY
	}

	ctx.doc.addPage()

	return ctx.layout.marginTop
}

/**
 * Measures the height of wrapped text without mutating the document.
 *
 * @param doc - PDF document.
 * @param text - Text to measure.
 * @param maxWidth - Maximum width.
 * @param lineHeight - Line height in mm.
 * @returns Measured height in mm.
 */
export function measureWrappedTextHeight(
	doc: jsPDF,
	text: string,
	maxWidth: number,
	lineHeight = PDF_LAYOUT.lineHeight,
): number {
	const lines = doc.splitTextToSize(text, maxWidth) as string[]
	return Math.max(lines.length, 1) * lineHeight
}

/**
 * Writes wrapped text and handles page breaks while drawing.
 *
 * @param doc - PDF document.
 * @param args - Text rendering arguments.
 * @returns Next cursor Y position.
 *
 * @example
 * ```ts
 * const nextY = writeWrappedText(doc, {
 *   text: 'Long body copy',
 *   x: 16,
 *   y: 24,
 *   maxWidth: 178,
 *   fontSize: 11,
 *   fontStyle: 'normal',
 *   color: [17, 17, 17],
 * })
 * ```
 */
export function writeWrappedText(
	doc: jsPDF,
	args: {
		text: string
		x: number
		y: number
		maxWidth: number
		fontSize: number
		fontStyle: PdfFontStyle
		color: PdfColor
		lineHeight?: number
	},
): number {
	const {
		text,
		x,
		y,
		maxWidth,
		fontSize,
		fontStyle,
		color,
		lineHeight = PDF_LAYOUT.lineHeight,
	} = args

	doc.setFont('Rijksoverheid', fontStyle)
	doc.setFontSize(fontSize)
	setPdfTextColor(doc, color)

	const lines = doc.splitTextToSize(text, maxWidth) as string[]

	let cursorY = y

	const pageHeight = doc.internal.pageSize.getHeight()
	const pageLimit = pageHeight - PDF_LAYOUT.marginBottom

	// Render line by line so we can carry the same text block across pages
	// without forcing callers to split content manually.
	for (const line of lines) {
		if (cursorY + lineHeight > pageLimit) {
			doc.addPage()
			cursorY = PDF_LAYOUT.marginTop
		}

		doc.text(line, x, cursorY)
		cursorY += lineHeight
	}

	return cursorY
}

/**
 * Draws the standard horizontal divider used under report section titles.
 *
 * @param ctx - Rendering context.
 * @param y - Y position.
 * @returns Nothing.
 */
export function drawSectionDivider(ctx: PdfRenderContext, y: number): void {
	setPdfDrawColor(ctx.doc, ctx.colors.border)
	ctx.doc.setLineWidth(0.4)
	ctx.doc.line(ctx.layout.marginLeft, y, ctx.page.width - ctx.layout.marginRight, y)
}

/**
 * Renders a section heading and its divider using the shared report styles.
 *
 * @param ctx - Rendering context.
 * @param title - Section title.
 * @param startY - Start position.
 * @returns Next cursor Y.
 */
export function renderSectionTitle(ctx: PdfRenderContext, title: string, startY: number): number {
	let y = ensurePageSpace(ctx, startY, 14)

	ctx.doc.setFont('RijksoverheidHeading', 'bold')
	ctx.doc.setFontSize(18)
	setPdfTextColor(ctx.doc, ctx.colors.primary)
	ctx.doc.text(title, ctx.layout.marginLeft, y)

	y += 3.5
	drawSectionDivider(ctx, y)

	return y + 6
}

/**
 * Saves the PDF document to the browser with a normalized filename.
 *
 * @param doc - PDF document.
 * @param filename - Desired filename.
 * @returns Nothing.
 */
export function savePdf(doc: jsPDF, filename: string): void {
	const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
	doc.save(safeFilename)
}
