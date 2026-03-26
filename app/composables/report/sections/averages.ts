import type { ItemsCollectionItem } from '@nuxt/content'
import type { ReportConfig } from '~~/schema/reportConfig'
import type { PillarAverage } from '~~/shared/types/audit'
import type { PdfRenderContext } from '../pdf'
import type { ReportData } from '../types'

import { PILLARS } from '~/composables/content-taxonomy'

import {
	mapScoreColor,
	renderSectionTitle,
	setPdfDrawColor,
	setPdfFillColor,
	setPdfTextColor,
	writeWrappedText,
} from '../pdf'
import { writeRichText } from './shared'

/**
 * Draws a detailed average card for a single pillar.
 *
 * @param ctx - Shared PDF render context.
 * @param args - Card position, dimensions, and average data.
 * @returns Nothing.
 */
export function drawAverageCard(
	ctx: PdfRenderContext,
	args: {
		x: number
		y: number
		width: number
		height: number
		average: PillarAverage<ItemsCollectionItem['pillar']>
	},
): void {
	const { x, y, width, height, average } = args

	setPdfFillColor(ctx.doc, ctx.colors.soft)
	setPdfDrawColor(ctx.doc, ctx.colors.border)
	ctx.doc.roundedRect(x, y, width, height, ctx.layout.borderRadius, ctx.layout.borderRadius, 'FD')

	let cursorY = y + 7

	ctx.doc.setFont('RijksoverheidHeading', 'bold')
	ctx.doc.setFontSize(12)
	setPdfTextColor(ctx.doc, ctx.colors.secondary)
	ctx.doc.text(average.pillar, x + ctx.layout.cardPadding, cursorY)

	cursorY += 8

	if (average.score !== undefined) {
		ctx.doc.setFont('Rijksoverheid', 'bold')
		ctx.doc.setFontSize(18)
		setPdfTextColor(ctx.doc, mapScoreColor(average.color))
		ctx.doc.text(`${average.score}/10`, x + ctx.layout.cardPadding, cursorY)
	} else {
		ctx.doc.setFont('Rijksoverheid', 'normal')
		ctx.doc.setFontSize(11)
		setPdfTextColor(ctx.doc, ctx.colors.muted)
		ctx.doc.text('Nog geen score', x + ctx.layout.cardPadding, cursorY)
	}

	cursorY += 7

	ctx.doc.setFont('Rijksoverheid', 'normal')
	ctx.doc.setFontSize(10)
	setPdfTextColor(ctx.doc, ctx.colors.text)

	const labelLines = ctx.doc.splitTextToSize(
		average.label,
		width - ctx.layout.cardPadding * 2,
	) as string[]

	ctx.doc.text(labelLines, x + ctx.layout.cardPadding, cursorY)
}

/**
 * Maps a numeric score to the semantic score token used by the PDF palette.
 *
 * @param score - Rounded score value or `null` when no score is available.
 * @returns Semantic score color key.
 */
export function getScoreColorKey(score: number | null) {
	if (score === null) return 'neutral'
	if (score >= 8) return 'success'
	if (score >= 5) return 'warning'

	return 'error'
}

/**
 * Draws the compact average summary card used in the pillar overview grid.
 *
 * @param ctx - Shared PDF render context.
 * @param title - Card title.
 * @param data - Average data for the pillar.
 * @param x - Start X coordinate.
 * @param y - Start Y coordinate.
 * @param width - Card width.
 * @returns Nothing.
 */
function renderAverageSummaryCard(
	ctx: PdfRenderContext,
	title: string,
	data: PillarAverage<ItemsCollectionItem['pillar']>,
	x: number,
	y: number,
	width: number,
): void {
	const { doc, colors } = ctx
	const height = 32

	setPdfFillColor(doc, colors.commentBg)
	setPdfDrawColor(doc, colors.border)
	doc.roundedRect(x, y, width, height, 3, 3, 'FD')

	doc.setFont('RijksoverheidHeading', 'bold')
	doc.setFontSize(11)
	setPdfTextColor(doc, colors.heading)
	doc.text(title, x + 6, y + 8)

	doc.setFont('RijksoverheidHeading', 'bold')
	doc.setFontSize(18)

	if (data.count === 0 || data.score === undefined) {
		setPdfTextColor(doc, colors.muted)
		doc.text('Nog geen score', x + 6, y + 18)
	} else {
		const score = Math.round(data.score)
		setPdfTextColor(doc, mapScoreColor(getScoreColorKey(score)))
		doc.text(`${score} uit 10`, x + 6, y + 18)
	}

	doc.setFont('Rijksoverheid', 'normal')
	doc.setFontSize(9)
	setPdfTextColor(doc, colors.muted)

	const label =
		data.count === 1
			? 'Op basis van 1 beoordeling'
			: `Op basis van ${data.count ?? 0} beoordelingen`

	doc.text(label, x + 6, y + 26)
}

/**
 * Renders the descriptive copy for a single pillar.
 *
 * @param ctx - Shared PDF render context.
 * @param title - Pillar title.
 * @param body - Pillar description.
 * @param y - Current Y position.
 * @returns Next cursor Y position.
 */
function renderPillarDescription(
	ctx: PdfRenderContext,
	title: string,
	body: string,
	y: number,
): number {
	const { doc, layout, page, colors } = ctx

	doc.setFont('RijksoverheidHeading', 'bold')
	doc.setFontSize(12)
	setPdfTextColor(doc, colors.heading)
	doc.text(title, layout.marginLeft, y)

	y += 5

	y = writeWrappedText(doc, {
		text: body,
		x: layout.marginLeft,
		y,
		maxWidth: page.contentWidth,
		fontSize: 11,
		fontStyle: 'normal',
		color: colors.text,
	})

	return y + 4
}

/**
 * Renders the overview grid of compact pillar summary cards.
 *
 * @param ctx - Shared PDF render context.
 * @param averages - Pillar average data.
 * @param startY - Top Y position of the grid.
 * @returns Nothing.
 */
function renderAveragesGrid(
	ctx: PdfRenderContext,
	averages: ReportData['averages'],
	startY: number,
): void {
	const { layout, page } = ctx

	const gap = 8
	const colWidth = (page.contentWidth - gap) / 2

	// The layout is intentionally fixed to two columns. This keeps card sizing
	// predictable and makes the overview page visually stable.
	Object.values(averages).forEach((value, index) => {
		const col = index % 2
		const row = Math.floor(index / 2)
		const x = layout.marginLeft + col * (colWidth + gap)
		const y = startY + row * 40

		renderAverageSummaryCard(ctx, value.pillar, value, x, y, colWidth)
	})
}

/**
 * Renders the pillar averages overview page.
 *
 * @param ctx - Shared PDF render context.
 * @param data - Report data containing pillar averages.
 * @param config - Report configuration containing the region name.
 * @returns Nothing.
 */
export function renderAveragesSection(
	ctx: PdfRenderContext,
	data: ReportData,
	config: ReportConfig,
): void {
	const { doc, layout } = ctx

	doc.addPage()

	let y = layout.marginTop

	// The page combines editorial explanation and a fixed card grid. The copy is
	// rendered first so the grid can stay in a deterministic position below it.
	y = renderSectionTitle(ctx, 'Overzicht per pijler', y)
	y += 6

	y = writeRichText(
		ctx,
		[
			{
				text: 'Dit overzicht laat per pijler de gemiddelde score zien. De score per pijler is gebaseerd op alle beoordeelde elementen binnen die pijler en geeft daarmee een samenvattend beeld van hoe ',
			},
			{ text: config.region, style: 'bold' },
			{ text: ' op dit moment presteert.' },
		],
		y,
	)

	y += 6

	for (const pillar of PILLARS) {
		y = renderPillarDescription(ctx, pillar, getPillarHint(pillar), y)
	}

	y += 6
	renderAveragesGrid(ctx, data.averages, y)
}
