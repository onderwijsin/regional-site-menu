import type { PdfRenderContext } from '../pdf'
import type { ReportData } from '../types'

import { PDF_RENDER_CONFIG } from '@constants'

import { markdownToBlocks, renderMarkdownBlocks } from '../markdown'
import { renderSectionTitle, writeWrappedText } from '../pdf'

const AI_MARKDOWN_TOP_PADDING = PDF_RENDER_CONFIG.aiMarkdownTopPadding

/**
 * Appends a Dutch URL appendix after the generated website analysis.
 *
 * @param markdown - Analysis markdown content.
 * @param urls - URLs inspected during analysis.
 * @returns Markdown including URL appendix.
 */
function appendAnalysedUrls(markdown: string, urls: string[]): string {
	if (urls.length === 0) {
		return markdown
	}

	const uniqueUrls = [...new Set(urls)]
	const lines = [
		'',
		'## Geanalyseerde URLs',
		'De onderstaande URLs zijn gebruikt voor deze analyse:',
		...uniqueUrls.map((url) => `- ${url}`)
	]

	return `${markdown.trim()}\n${lines.join('\n')}`
}

/**
 * Renders one AI markdown page with title + description boilerplate.
 *
 * @param ctx - Shared PDF render context.
 * @param args - Page metadata and markdown.
 * @returns Nothing.
 */
function renderAiMarkdownPage(
	ctx: PdfRenderContext,
	args: {
		title: string
		description: string
		markdown: string
	}
): void {
	const { doc, layout, page, colors } = ctx

	doc.addPage()

	let y = layout.marginTop
	y = renderSectionTitle(ctx, args.title, y)
	y += 6

	y = writeWrappedText(doc, {
		text: args.description,
		x: layout.marginLeft,
		y,
		maxWidth: page.contentWidth,
		fontSize: 11,
		fontStyle: 'normal',
		color: colors.muted
	})
	y += AI_MARKDOWN_TOP_PADDING

	const blocks = markdownToBlocks(args.markdown)
	void renderMarkdownBlocks(doc, blocks, layout.marginLeft, y, page.contentWidth)
}

/**
 * Renders optional AI-generated report sections.
 *
 * @param ctx - Shared PDF render context.
 * @param data - Report data including optional AI insights.
 * @returns Nothing.
 */
export function renderAiInsightsSection(ctx: PdfRenderContext, data: ReportData): void {
	const briefing = data.aiInsights?.briefing?.trim()
	const websiteAnalysis = data.aiInsights?.websiteAnalysis?.trim()

	if (briefing) {
		renderAiMarkdownPage(ctx, {
			title: 'AI-briefing',
			description:
				'Deze briefing is automatisch gegenereerd met AI, waarbij gebruik is gemaakt van alle ingevoerde context, audit resultaten en de criteria zoals gedefinieerd door de tool.',
			markdown: briefing
		})
	}

	if (websiteAnalysis) {
		const websiteAnalysisWithUrls = appendAnalysedUrls(
			websiteAnalysis,
			data.aiInsights?.websiteAnalysisUrls ?? []
		)

		renderAiMarkdownPage(ctx, {
			title: 'AI-analyse van huidige website',
			description:
				'Deze analyse is automatisch gegenereerd met AI op basis van de opgegeven website url van de regio. De analyse vergelijkt de geanalyseerde website-inhoud met de componenten zoals gedefinieerd door de tool.',
			markdown: websiteAnalysisWithUrls
		})
	}
}
