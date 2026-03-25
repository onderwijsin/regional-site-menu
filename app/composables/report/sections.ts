import type { ItemsCollectionItem } from '@nuxt/content'
import type { ReportConfig } from '~~/schema/reportConfig'
import type { Audit, PillarAverage } from '~~/shared/types/audit'
import type { MarkdownBlock } from './markdown'
import type { PdfRenderContext } from './pdf'
import type { ReportData } from './types'

import { parseURL } from 'ufo'

import { loadImageAsBase64 } from './image'
import { markdownToBlocks, measureMarkdownBlocksHeight, renderMarkdownBlocks } from './markdown'
import {
	ensurePageSpace,
	mapScoreColor,
	measureWrappedTextHeight,
	renderSectionTitle,
	setPdfDrawColor,
	setPdfFillColor,
	setPdfTextColor,
	writeWrappedText,
} from './pdf'

/**
 * Renders the cover page.
 *
 * @param ctx - Rendering context.
 * @param title - Report title.
 * @returns Nothing.
 */
export async function renderCoverPage(ctx: PdfRenderContext, title: string): Promise<void> {
	const { doc, page, layout } = ctx

	// ----------------------
	// Background
	// ----------------------

	setPdfFillColor(doc, ctx.colors.coverBg)
	doc.rect(0, 0, page.width, page.height, 'F')

	// ----------------------
	// Logo
	// ----------------------

	try {
		const logo = await loadImageAsBase64('/logo_with_text.png')

		doc.addImage(
			logo,
			'PNG',
			layout.marginLeft,
			layout.marginTop,
			60, // width
			0, // auto height
		)
	} catch {
		// fail silently → not worth breaking PDF over a logo
	}

	// ----------------------
	// Title block (lower on page)
	// ----------------------

	const startY = page.height * 0.45

	// Label
	doc.setFont('RijksoverheidHeading', 'bold')
	doc.setFontSize(16)
	setPdfTextColor(doc, ctx.colors.primary)

	doc.text('Rapportage', layout.marginLeft, startY)

	// Main title
	doc.setFont('RijksoverheidHeading', 'bold')
	doc.setFontSize(28)
	setPdfTextColor(doc, ctx.colors.heading)

	doc.text(title, layout.marginLeft, startY + 14)

	// Date
	doc.setFont('Rijksoverheid', 'normal')
	doc.setFontSize(12)
	setPdfTextColor(doc, ctx.colors.muted)

	doc.text(
		`Gegenereerd op ${new Date().toLocaleDateString('nl-NL')}`,
		layout.marginLeft,
		startY + 28,
	)

	// ----------------------
	// Footer
	// ----------------------

	doc.setFont('Rijksoverheid', 'italic')
	doc.setFontSize(10)
	setPdfTextColor(doc, ctx.colors.muted)

	const config = useRuntimeConfig()
	const host = parseURL(config.public.siteUrl).host ?? config.public.siteUrl

	const y = page.height - layout.marginBottom

	doc.setFont('Rijksoverheid', 'italic')
	doc.setFontSize(10)
	setPdfTextColor(doc, ctx.colors.muted)

	// jsPDF will automatically create a clickable annotation
	doc.textWithLink(host, layout.marginLeft, y, { url: config.public.siteUrl })
}

/**
 * Renders the introduction page.
 *
 * @param ctx - Rendering context.
 * @param config - Report configuration.
 */
export function renderIntroductionPage(ctx: PdfRenderContext, config: ReportConfig): void {
	const { doc, layout, page, colors } = ctx

	doc.addPage()

	let y = layout.marginTop

	const region = config.region

	// ----------------------
	// Title
	// ----------------------

	y = renderSectionTitle(ctx, 'Introductie', y)

	// ----------------------
	// Section: Wat is dit rapport?
	// ----------------------

	y += 4

	y = renderSubheading(ctx, 'Wat is dit rapport?', y)

	y = writeRichText(
		ctx,
		[
			{
				text: 'Dit rapport geeft inzicht in de kwaliteit en volledigheid van de website van ',
			},
			{
				text: region,
				style: 'bold',
			},
			{
				text: '.',
			},
		],
		y,
	)

	y = writeWrappedText(doc, {
		text: `Het laat zien in hoeverre de site bezoekers informeert, enthousiasmeert en aanzet tot actie. De analyse is opgebouwd rondom vier pijlers:`,
		x: layout.marginLeft,
		y: y + 4,
		maxWidth: page.contentWidth,
		fontSize: 11,
		fontStyle: 'normal',
		color: colors.text,
	})

	y += 4

	y = renderBulletList(
		ctx,
		[
			'Inzicht & Overzicht',
			'Verdieping & Ervaring',
			'Activatie & Deelname',
			'Ondersteuning & Contact',
		],
		y,
	)

	y += 2

	y = writeWrappedText(doc, {
		text: `Elke pijler bestaat uit meerdere elementen: concrete onderdelen die samen een complete en effectieve regiosite vormen.`,
		x: layout.marginLeft,
		y,
		maxWidth: page.contentWidth,
		fontSize: 11,
		fontStyle: 'normal',
		color: colors.text,
	})

	y = writeWrappedText(doc, {
		text: `Per element is een score en korte toelichting opgenomen. Zo wordt snel duidelijk wat goed werkt en waar verbetering nodig is.`,
		x: layout.marginLeft,
		y: y + 4,
		maxWidth: page.contentWidth,
		fontSize: 11,
		fontStyle: 'normal',
		color: colors.text,
	})

	// ----------------------
	// Section: Hoe is dit rapport tot stand gekomen?
	// ----------------------

	y += 8

	y = renderSubheading(ctx, 'Hoe is dit rapport tot stand gekomen?', y)

	y = writeRichText(
		ctx,
		[
			{
				text: 'Dit rapport is gebaseerd op een zelfevaluatie door ',
			},
			{
				text: region,
				style: 'bold',
			},
			{
				text: '. Per element is door de regio zelf aangegeven:',
			},
		],
		y,
	)

	y += 4

	y = renderBulletList(
		ctx,
		[
			'of het aanwezig is',
			'hoe goed het is uitgewerkt',
			'in welke mate het bijdraagt aan het doel van de website',
		],
		y,
	)

	y += 2

	y = writeRichText(
		ctx,
		[
			{
				text: 'De scores en toelichtingen in dit rapport zijn dus een weergave van hoe ',
			},
			{
				text: region,
				style: 'bold',
			},
			{
				text: 'de eigen website op dit moment beoordeelt.',
			},
		],
		y,
	)

	// ----------------------
	// Section: Hoe gebruik je dit rapport?
	// ----------------------

	y += 8

	y = renderSubheading(ctx, 'Hoe gebruik je dit rapport?', y)

	y = writeWrappedText(doc, {
		text: `Gebruik dit rapport als:`,
		x: layout.marginLeft,
		y,
		maxWidth: page.contentWidth,
		fontSize: 11,
		fontStyle: 'normal',
		color: colors.text,
	})

	y += 4

	y = renderBulletList(
		ctx,
		[
			'startpunt voor verbetering van de website',
			'gespreksdocument binnen de regio',
			'input voor doorontwikkeling of een briefing richting een webbureau',
		],
		y,
	)

	y += 2

	void writeWrappedText(doc, {
		text: `De combinatie van scores en toelichtingen helpt om gericht keuzes te maken: wat moet eerst beter, en wat kan later?`,
		x: layout.marginLeft,
		y,
		maxWidth: page.contentWidth,
		fontSize: 11,
		fontStyle: 'normal',
		color: colors.text,
	})
}

/**
 * Draws a single average card.
 *
 * @param ctx - Rendering context.
 * @param args - Card arguments.
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
 * Renders the averages overview page.
 */
export function renderAveragesSection(
	ctx: PdfRenderContext,
	data: ReportData,
	config: ReportConfig,
): void {
	const { doc, layout } = ctx

	doc.addPage()

	let y = layout.marginTop
	const region = config.region

	// ----------------------
	// Title
	// ----------------------

	y = renderSectionTitle(ctx, 'Overzicht per pijler', y)

	// ----------------------
	// Intro (rich text)
	// ----------------------

	y += 6

	y = writeRichText(
		ctx,
		[
			{
				text: 'Dit overzicht laat per pijler de gemiddelde score zien. De score per pijler is gebaseerd op alle beoordeelde elementen binnen die pijler en geeft daarmee een samenvattend beeld van hoe ',
			},
			{
				text: region,
				style: 'bold',
			},
			{
				text: ' op dit moment presteert.',
			},
		],
		y,
	)

	// ----------------------
	// Pillar descriptions
	// ----------------------

	y += 6

	y = renderPillarDescription(
		ctx,
		'Inzicht & Overzicht',
		'De website maakt snel duidelijk waar de regio voor staat, wat het aanbod is en helpt de gebruiker op weg in de oriëntatie.',
		y,
	)

	y = renderPillarDescription(
		ctx,
		'Verdieping & Ervaring',
		'De website helpt de gebruiker om zich te verdiepen en een goed beeld te krijgen van opleidingen, beroepen en ervaringen.',
		y,
	)

	y = renderPillarDescription(
		ctx,
		'Activatie & Deelname',
		'De website biedt de gebruiker concrete handvatten en vervolgacties om verder te komen in zijn stap naar het onderwijs.',
		y,
	)

	y = renderPillarDescription(
		ctx,
		'Ondersteuning & Contact',
		'De website maakt duidelijk welke ondersteuning beschikbaar is en biedt toegankelijke manieren om contact op te nemen.',
		y,
	)

	// ----------------------
	// Cards grid
	// ----------------------

	y += 6

	renderAveragesGrid(ctx, data.averages, y)
}

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

function renderAveragesGrid(
	ctx: PdfRenderContext,
	averages: ReportData['averages'],
	startY: number,
): void {
	const { layout, page } = ctx

	const gap = 8
	const colWidth = (page.contentWidth - gap) / 2

	const items = Object.values(averages)

	items.forEach((value, index) => {
		const col = index % 2
		const row = Math.floor(index / 2)

		const x = layout.marginLeft + col * (colWidth + gap)
		const y = startY + row * 40

		renderAverageCard(ctx, value.pillar, value, x, y, colWidth)
	})
}

/**
 * Maps a numeric score to a semantic color.
 *
 * @param score - Score (0–10).
 * @returns Semantic color key.
 */
export function getScoreColorKey(score: number | null) {
	if (score === null) return 'neutral'

	if (score >= 8) return 'success'
	if (score >= 5) return 'warning'

	return 'error'
}

function renderAverageCard(
	ctx: PdfRenderContext,
	title: string,
	data: PillarAverage<ItemsCollectionItem['pillar']>,
	x: number,
	y: number,
	width: number,
): void {
	const { doc, colors } = ctx

	const height = 32

	// background
	setPdfFillColor(doc, colors.commentBg)
	setPdfDrawColor(doc, colors.border)

	doc.roundedRect(x, y, width, height, 3, 3, 'FD')

	// title
	doc.setFont('RijksoverheidHeading', 'bold')
	doc.setFontSize(11)
	setPdfTextColor(doc, colors.heading)

	doc.text(title, x + 6, y + 8)

	// score
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

	// meta
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
 * Converts audit comments to a lookup map of markdown blocks.
 *
 * @param audits - Audit entries.
 * @returns Map keyed by audit ID.
 */
export function createCommentBlockMap(
	audits: Audit<ItemsCollectionItem>[],
): Map<Audit<ItemsCollectionItem>['id'], MarkdownBlock[]> {
	const result = new Map<Audit<ItemsCollectionItem>['id'], MarkdownBlock[]>()

	for (const audit of audits) {
		const markdown = audit.comment.trim()

		if (!markdown) {
			result.set(audit.id, [])
			continue
		}

		result.set(audit.id, markdownToBlocks(markdown))
	}

	return result
}

/**
 * Renders a subsection heading.
 */
function renderSubheading(ctx: PdfRenderContext, text: string, y: number): number {
	const { doc, layout, colors } = ctx

	doc.setFont('RijksoverheidHeading', 'bold')
	doc.setFontSize(14)
	setPdfTextColor(doc, colors.heading)

	doc.text(text, layout.marginLeft, y)

	return y + 6
}

/**
 * Renders a bullet list.
 */
function renderBulletList(ctx: PdfRenderContext, items: string[], startY: number): number {
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

type RichSegment = {
	text: string
	style?: 'normal' | 'bold' | 'italic'
}

/**
 * Writes inline rich text (with wrapping).
 */
function writeRichText(ctx: PdfRenderContext, segments: RichSegment[], y: number): number {
	const { doc, layout, page, colors } = ctx

	let cursorX = layout.marginLeft
	let cursorY = y

	const lineHeight = 5
	const maxWidth = page.contentWidth

	for (const segment of segments) {
		doc.setFont('Rijksoverheid', segment.style ?? 'normal')
		doc.setFontSize(11)
		setPdfTextColor(doc, colors.text)

		const words = segment.text.split(' ')

		for (const word of words) {
			const text = word + ' '
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

/**
 * Draws a single audit card.
 *
 * @param ctx - Rendering context.
 * @param audit - Audit entry.
 * @param commentBlocks - Parsed comment blocks.
 * @param startY - Start Y.
 * @returns Next cursor Y.
 */
export function drawAuditCard(
	ctx: PdfRenderContext,
	audit: Audit<ItemsCollectionItem>,
	commentBlocks: MarkdownBlock[],
	startY: number,
): number {
	const cardX = ctx.layout.marginLeft
	const cardWidth = ctx.page.contentWidth
	const innerWidth = cardWidth - ctx.layout.cardPadding * 2

	const metaText = `${audit.item.pillar} • ${audit.item.priority}`
	const scoreText = audit.score !== undefined ? `${audit.score}/10` : 'Geen score'
	const descriptionText = audit.item.audit?.description?.trim() ?? ''

	const titleHeight = measureWrappedTextHeight(ctx.doc, audit.item.title, innerWidth)
	const metaHeight = measureWrappedTextHeight(ctx.doc, metaText, innerWidth)
	const scoreHeight = measureWrappedTextHeight(ctx.doc, scoreText, innerWidth)
	const descriptionHeight = descriptionText
		? measureWrappedTextHeight(ctx.doc, descriptionText, innerWidth)
		: 0

	const commentTitleHeight = commentBlocks.length > 0 ? 5 : 0
	const commentContentHeight =
		commentBlocks.length > 0
			? measureMarkdownBlocksHeight(ctx.doc, commentBlocks, innerWidth - 6)
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

	const y = ensurePageSpace(ctx, startY, estimatedHeight)

	setPdfFillColor(ctx.doc, ctx.colors.soft)
	setPdfDrawColor(ctx.doc, ctx.colors.border)
	ctx.doc.roundedRect(
		cardX,
		y,
		cardWidth,
		estimatedHeight,
		ctx.layout.borderRadius,
		ctx.layout.borderRadius,
		'FD',
	)

	let cursorY = y + ctx.layout.cardPadding + 1

	cursorY = writeWrappedText(ctx.doc, {
		text: audit.item.title,
		x: cardX + ctx.layout.cardPadding,
		y: cursorY,
		maxWidth: innerWidth,
		fontSize: 12,
		fontStyle: 'bold',
		color: ctx.colors.text,
	})

	cursorY += 1

	cursorY = writeWrappedText(ctx.doc, {
		text: metaText,
		x: cardX + ctx.layout.cardPadding,
		y: cursorY,
		maxWidth: innerWidth,
		fontSize: 9,
		fontStyle: 'normal',
		color: ctx.colors.muted,
	})

	cursorY += 1

	cursorY = writeWrappedText(ctx.doc, {
		text: scoreText,
		x: cardX + ctx.layout.cardPadding,
		y: cursorY,
		maxWidth: innerWidth,
		fontSize: 13,
		fontStyle: 'bold',
		color: audit.score !== undefined ? ctx.colors.primary : ctx.colors.muted,
	})

	if (descriptionText) {
		cursorY += 1.5

		cursorY = writeWrappedText(ctx.doc, {
			text: descriptionText,
			x: cardX + ctx.layout.cardPadding,
			y: cursorY,
			maxWidth: innerWidth,
			fontSize: 10,
			fontStyle: 'normal',
			color: ctx.colors.text,
		})
	}

	if (commentBlocks.length > 0) {
		cursorY += 2.5

		setPdfFillColor(ctx.doc, ctx.colors.commentBg)
		setPdfDrawColor(ctx.doc, ctx.colors.secondary)
		ctx.doc.roundedRect(
			cardX + ctx.layout.cardPadding,
			cursorY,
			innerWidth,
			commentBoxHeight,
			ctx.layout.borderRadius,
			ctx.layout.borderRadius,
			'FD',
		)

		ctx.doc.setLineWidth(0.8)
		setPdfDrawColor(ctx.doc, ctx.colors.secondary)
		ctx.doc.line(
			cardX + ctx.layout.cardPadding,
			cursorY,
			cardX + ctx.layout.cardPadding,
			cursorY + commentBoxHeight,
		)

		let commentY = cursorY + 5
		const commentX = cardX + ctx.layout.cardPadding + 4

		commentY = writeWrappedText(ctx.doc, {
			text: 'Toelichting',
			x: commentX,
			y: commentY,
			maxWidth: innerWidth - 6,
			fontSize: 10,
			fontStyle: 'bold',
			color: ctx.colors.text,
		})

		commentY += 1

		// eslint-disable-next-line
		commentY = renderMarkdownBlocks(ctx.doc, commentBlocks, commentX, commentY, innerWidth - 6)
		// eslint-disable-next-line
		cursorY += commentBoxHeight
	}

	return y + estimatedHeight + ctx.layout.cardGap
}

/**
 * Renders the detailed audit section.
 *
 * @param ctx - Rendering context.
 * @param audits - Audit entries.
 * @returns Nothing.
 */
export function renderAuditSection(
	ctx: PdfRenderContext,
	audits: Audit<ItemsCollectionItem>[],
): void {
	ctx.doc.addPage()

	let y = ctx.layout.marginTop
	y = renderSectionTitle(ctx, 'Details per onderdeel', y)

	const commentBlockMap = createCommentBlockMap(audits)

	for (const audit of audits) {
		const commentBlocks = commentBlockMap.get(audit.id) ?? []
		y = drawAuditCard(ctx, audit, commentBlocks, y)
	}
}

/**
 * Renders the full report document.
 *
 * @param ctx - Rendering context.
 * @param config - Report configuration.
 * @param data - Report data.
 * @returns Nothing.
 */
export async function renderReportDocument(
	ctx: PdfRenderContext,
	config: ReportConfig,
	data: ReportData,
): Promise<void> {
	await renderCoverPage(ctx, config.region)
	renderIntroductionPage(ctx, config)
	renderAveragesSection(ctx, data, config)
	renderAuditSection(ctx, data.audits)
}
