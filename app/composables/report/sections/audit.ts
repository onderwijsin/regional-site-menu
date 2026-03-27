import type { ItemsCollectionItem } from '@nuxt/content'
import type { ReportConfig } from '~~/schema/reportConfig'
import type { Audit } from '~~/shared/types/audit'
import type { MarkdownBlock } from '../markdown'
import type { PdfRenderContext } from '../pdf'

import { markdownToBlocks, measureMarkdownBlocksHeight, renderMarkdownBlocks } from '../markdown'
import {
	ensurePageSpace,
	mapScoreColor,
	renderSectionTitle,
	setPdfDrawColor,
	setPdfTextColor,
	writeWrappedText
} from '../pdf'
import { getScoreColorKey } from './averages'

/**
 * Pre-parses audit comments into markdown blocks keyed by audit ID.
 *
 * @param audits - Audit entries that may contain markdown comments.
 * @returns Map of audit IDs to normalized markdown blocks.
 * @throws {ZodError} When markdown normalization fails for one of the comments.
 */
export function createCommentBlockMap(
	audits: Audit<ItemsCollectionItem>[]
): Map<Audit<ItemsCollectionItem>['id'], MarkdownBlock[]> {
	const result = new Map<Audit<ItemsCollectionItem>['id'], MarkdownBlock[]>()

	for (const audit of audits) {
		const markdown = audit.comment.trim()
		result.set(audit.id, markdown ? markdownToBlocks(markdown) : [])
	}

	return result
}

/**
 * Renders one audit item, including score, metadata, description, comment, and vertical rule.
 *
 * @param ctx - Shared PDF render context.
 * @param audit - Audit entry to render.
 * @param commentBlocks - Pre-parsed markdown comment blocks for the audit.
 * @param startY - Starting Y position.
 * @returns Next cursor Y position.
 * @throws {Error} Propagates rendering failures from lower-level PDF or markdown helpers.
 *
 * @example
 * ```ts
 * const nextY = drawAuditSectionItem(ctx, audit, commentBlocks, 48)
 * ```
 */
export function drawAuditSectionItem(
	ctx: PdfRenderContext,
	audit: Audit<ItemsCollectionItem>,
	commentBlocks: MarkdownBlock[],
	startY: number
): number {
	const { doc, layout, page, colors } = ctx

	const x = layout.marginLeft
	const width = page.contentWidth
	const innerX = x + 6
	const innerWidth = width - 6

	let y = startY

	// Estimate the block height before rendering so we can avoid starting an item
	// too close to the bottom of the page.
	const estimatedHeight =
		40 +
		(commentBlocks.length > 0
			? measureMarkdownBlocksHeight(doc, commentBlocks, innerWidth - 4)
			: 0)

	y = ensurePageSpace(ctx, y, estimatedHeight)

	// The left-side rule must continue across page breaks. We therefore track the
	// Y segment occupied on each page while content is rendered.
	const startPage = doc.getCurrentPageInfo().pageNumber
	const pageSegments: { page: number; startY: number; endY?: number }[] = [
		{ page: startPage, startY: y - 2 }
	]

	const trackPageBreak = () => {
		const currentPage = doc.getCurrentPageInfo().pageNumber
		const lastSegment = pageSegments[pageSegments.length - 1]!

		if (currentPage !== lastSegment.page) {
			lastSegment.endY = doc.internal.pageSize.getHeight() - layout.marginBottom
			pageSegments.push({
				page: currentPage,
				startY: layout.marginTop - 5
			})
		}
	}

	let cursorY = y + 2
	const titleStartY = cursorY

	// The title is rendered first because the score is aligned to the title's
	// first baseline on the far right.
	cursorY = writeWrappedText(doc, {
		text: audit.item.title,
		x: innerX,
		y: cursorY,
		maxWidth: innerWidth - 30,
		fontSize: 13,
		fontStyle: 'bold',
		color: colors.heading
	})

	trackPageBreak()

	const scoreText = audit.score !== undefined ? `${audit.score} uit 10` : 'Geen score'

	doc.setFont('RijksoverheidHeading', 'bold')
	doc.setFontSize(14)
	setPdfTextColor(
		doc,
		audit.score !== undefined ? mapScoreColor(getScoreColorKey(audit.score)) : colors.muted
	)

	const scoreWidth = doc.getTextWidth(scoreText)
	doc.text(scoreText, x + width - scoreWidth, titleStartY)

	cursorY += 1

	// Metadata and description are normal flowing blocks that may push the item
	// onto subsequent pages; every step re-checks whether a page break occurred.
	const meta = [audit.item.pillar, audit.item.priority, ...audit.item.goals].join(' • ')

	cursorY = writeWrappedText(doc, {
		text: meta,
		x: innerX,
		y: cursorY,
		maxWidth: innerWidth,
		fontSize: 10,
		fontStyle: 'normal',
		color: colors.secondary
	})

	trackPageBreak()

	cursorY += 2
	cursorY = writeWrappedText(doc, {
		text: audit.item.description,
		x: innerX,
		y: cursorY,
		maxWidth: innerWidth,
		fontSize: 11,
		fontStyle: 'normal',
		color: colors.text
	})

	trackPageBreak()

	if (commentBlocks.length > 0) {
		cursorY += 4
		cursorY = writeWrappedText(doc, {
			text: 'Toelichting',
			x: innerX,
			y: cursorY,
			maxWidth: innerWidth,
			fontSize: 11,
			fontStyle: 'bold',
			color: colors.heading
		})

		trackPageBreak()

		cursorY += 2
		cursorY = renderMarkdownBlocks(doc, commentBlocks, innerX, cursorY, innerWidth)
		trackPageBreak()
	}

	// Finalize the last tracked segment before drawing the decorative rule back
	// onto each visited page.
	pageSegments[pageSegments.length - 1]!.endY = cursorY - 2

	for (const segment of pageSegments) {
		doc.setPage(segment.page)
		doc.setLineWidth(0.8)
		setPdfDrawColor(doc, colors.border)
		doc.line(x, segment.startY, x, segment.endY!)
	}

	doc.setPage(pageSegments[pageSegments.length - 1]!.page)

	return cursorY + 8
}

/**
 * Renders the detailed audit section page and all audit items.
 *
 * @param ctx - Shared PDF render context.
 * @param audits - Audit entries to render in sequence.
 * @param config - Report configuration containing the region name.
 * @returns Nothing.
 * @throws {ZodError} When comment markdown normalization fails.
 */
export function renderAuditSection(
	ctx: PdfRenderContext,
	audits: Audit<ItemsCollectionItem>[],
	config: ReportConfig
): void {
	ctx.doc.addPage()

	let y = ctx.layout.marginTop
	y = renderSectionTitle(ctx, 'Details per onderdeel', y)
	y += 6

	y = writeWrappedText(ctx.doc, {
		text: `Hieronder vind je een toelichting op de elementen die zijn geëvalueerd door ${config.region}. Per onderdeel tref je de gegeven score aan en de eventueel gegeven toelichting daarbij.`,
		x: ctx.layout.marginLeft,
		y,
		maxWidth: ctx.page.contentWidth,
		fontSize: 11,
		fontStyle: 'normal',
		color: ctx.colors.muted
	})

	y += 8

	const commentBlockMap = createCommentBlockMap(audits)

	// Comments are pre-parsed once so rendering each item stays focused on layout
	// rather than repeatedly normalizing markdown content.
	for (const audit of audits) {
		const commentBlocks = commentBlockMap.get(audit.id) ?? []
		y = drawAuditSectionItem(ctx, audit, commentBlocks, y)
	}
}
