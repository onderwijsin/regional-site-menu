import type { CrawledWebsitePage } from '@server/utils/crawler/types'

import { AI_WEBSITE_ANALYSIS_CONFIG } from '@ai'

/**
 * Builds an allowlist for domain-constrained web search.
 *
 * @param url - Target website URL.
 * @returns Candidate hostnames for filtering.
 */
export function createAllowedDomains(url: string): string[] {
	const { hostname } = new URL(url)
	const strippedHostname = hostname.replace(/^www\./, '')

	if (hostname === strippedHostname) {
		return [hostname, `www.${hostname}`]
	}

	return [hostname, strippedHostname]
}

/**
 * Creates the user prompt for website-analysis generation.
 *
 * @param args - Dynamic prompt inputs.
 * @returns Prompt text.
 */
export function formatWebsiteAnalysisInput(args: {
	url: string
	region?: string
	referenceDocument: string
	maxPages: number
	crawledPages: CrawledWebsitePage[]
}): string {
	return [
		`Te analyseren URL: ${args.url}`,
		args.region ? `Regio: ${args.region}` : '',
		'',
		'# Crawl-dekking',
		formatCrawlCoverageSummary(args.crawledPages, args.maxPages),
		'',
		'# Referentiedocument (llms-full)',
		args.referenceDocument,
		'',
		"# Server-crawl context (gebruik uitsluitend deze pagina's als bewijs)",
		formatCrawledPagesForPrompt(args.crawledPages),
		'',
		'# Analyse-opdracht',
		`Gebruik uitsluitend de hierboven aangeleverde crawl-context (max ${args.maxPages} pagina's).`,
		'Noem geen pagina of detail dat niet in deze context staat.',
		'Werk vanuit een senior product- en contentstrategisch perspectief.',
		'Maak aanbevelingen specifiek, met concrete inhoud/structuurkeuzes en duidelijke prioritering.',
		'Als context ontbreekt voor een uitspraak, benoem dat expliciet als ontbrekende informatie.'
	].join('\n')
}

/**
 * Formats crawled pages into compact prompt text.
 *
 * @param pages - Crawled page snapshots.
 * @returns Prompt-friendly text block.
 */
export function formatCrawledPagesForPrompt(pages: CrawledWebsitePage[]): string {
	if (pages.length === 0) {
		return 'Geen crawlcontext beschikbaar.'
	}

	const lines: string[] = []
	for (const [index, page] of pages.entries()) {
		lines.push(`## Pagina ${index + 1}`)
		lines.push(`URL: ${page.url}`)
		lines.push(`Titel: ${page.title || 'Onbekend'}`)
		lines.push(`Hoofdkop (H1): ${page.mainHeading || 'Onbekend'}`)
		lines.push(`Inhoud (compact bewijs): ${toCompactPromptExcerpt(page.excerpt)}`)
		lines.push('Kerninhoud (volledig opgeschoond, semantische HTML):')
		lines.push('```html')
		lines.push(toCodeFenceSafeHtml(page.fullContent || '<p>Geen inhoud gevonden.</p>'))
		lines.push('```')
		lines.push('')
	}

	return lines.join('\n').trim()
}

/**
 * Summarizes crawl coverage to steer confidence and limitation handling.
 *
 * @param pages - Crawled page snapshots.
 * @param maxPages - Requested crawl cap.
 * @returns Coverage summary for prompt context.
 */
function formatCrawlCoverageSummary(pages: CrawledWebsitePage[], maxPages: number): string {
	if (pages.length === 0) {
		return "- Geen pagina's gecrawld."
	}

	const pagesWithEvidence = pages.filter(hasPageEvidence)
	const withTitle = pages.filter((page) => Boolean(page.title?.trim())).length
	const averageExcerptLength = Math.round(
		pagesWithEvidence.reduce((sum, page) => sum + resolvePageEvidenceTextLength(page), 0) /
			Math.max(pagesWithEvidence.length, 1)
	)
	const pathSegments = countTopPathSegments(pages)

	return [
		`- Geanalyseerde pagina's: ${pages.length} van max ${maxPages}`,
		`- Pagina's met bruikbare tekst: ${pagesWithEvidence.length}`,
		`- Pagina's met titel: ${withTitle}`,
		`- Gemiddelde evidencetekst-lengte: ${averageExcerptLength} tekens`,
		`- Meest voorkomende pad-segmenten: ${pathSegments}`
	].join('\n')
}

/**
 * Counts top URL path segments across crawled pages.
 *
 * @param pages - Crawled pages.
 * @returns Top segment summary string.
 */
function countTopPathSegments(pages: CrawledWebsitePage[]): string {
	const counts: Record<string, number> = {}

	for (const page of pages) {
		try {
			const segment = new URL(page.url).pathname.split('/').filter(Boolean)[0] ?? '/'
			counts[segment] = (counts[segment] ?? 0) + 1
		} catch {
			// Ignore malformed URLs here; page URL is still preserved in main evidence block.
		}
	}

	const top = Object.entries(counts)
		.sort(([, leftCount], [, rightCount]) => rightCount - leftCount)
		.slice(0, 5)
		.map(([segment, count]) => `${segment} (${count})`)

	return top.length > 0 ? top.join(', ') : 'Geen'
}

/**
 * Compacts crawl excerpts for prompt evidence blocks.
 *
 * @param excerpt - Raw excerpt.
 * @returns Prompt-safe compact excerpt.
 */
function toCompactPromptExcerpt(excerpt: string): string {
	const normalized = excerpt.replace(/\s+/g, ' ').trim()
	if (!normalized) {
		return 'Geen tekst gevonden.'
	}

	const maxChars = AI_WEBSITE_ANALYSIS_CONFIG.promptEvidenceExcerptMaxChars
	if (normalized.length <= maxChars) {
		return normalized
	}

	const truncated = normalized.slice(0, maxChars)
	const sentenceBreak = Math.max(
		truncated.lastIndexOf('. '),
		truncated.lastIndexOf('! '),
		truncated.lastIndexOf('? ')
	)
	if (sentenceBreak >= Math.floor(maxChars * 0.6)) {
		return `${truncated.slice(0, sentenceBreak + 1).trim()} …`
	}

	const lastSpace = truncated.lastIndexOf(' ')
	if (lastSpace > 0) {
		return `${truncated.slice(0, lastSpace).trim()} …`
	}

	return `${truncated.trim()} …`
}

/**
 * Makes semantic HTML safe for fenced markdown embedding.
 *
 * @param html - Semantic HTML evidence.
 * @returns Markdown fence-safe HTML.
 */
function toCodeFenceSafeHtml(html: string): string {
	return html.replaceAll('```', '&#96;&#96;&#96;')
}

/**
 * Returns whether a crawled page has meaningful evidence text.
 *
 * @param page - Crawled page.
 * @returns Whether page evidence is non-empty.
 */
function hasPageEvidence(page: CrawledWebsitePage): boolean {
	return resolvePageEvidenceText(page).length > 0
}

/**
 * Returns evidence text length for one crawled page.
 *
 * @param page - Crawled page.
 * @returns Evidence text length.
 */
function resolvePageEvidenceTextLength(page: CrawledWebsitePage): number {
	return resolvePageEvidenceText(page).length
}

/**
 * Resolves best-effort plain evidence text from page snapshot.
 *
 * @param page - Crawled page.
 * @returns Plain evidence text.
 */
function resolvePageEvidenceText(page: CrawledWebsitePage): string {
	const excerpt = page.excerpt.trim()
	if (excerpt) {
		return excerpt
	}

	return page.fullContent
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
}
