import type { CrawledWebsitePage } from '../crawler/types'

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
		const compactExcerpt = toCompactExcerpt(page.excerpt)
		lines.push(`## Evidence ${index + 1}`)
		lines.push(`URL: ${page.url}`)
		lines.push(`Titel: ${page.title || 'Onbekend'}`)
		lines.push(`Hoofdkop: ${page.heading || 'Onbekend'}`)
		lines.push(`Kerninhoud: ${compactExcerpt || 'Geen tekst gevonden.'}`)
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

	const withExcerpt = pages.filter((page) => page.excerpt.trim().length > 0)
	const withTitle = pages.filter((page) => Boolean(page.title?.trim())).length
	const averageExcerptLength = Math.round(
		withExcerpt.reduce((sum, page) => sum + page.excerpt.length, 0) /
			Math.max(withExcerpt.length, 1)
	)
	const pathSegments = countTopPathSegments(pages)

	return [
		`- Geanalyseerde pagina's: ${pages.length} van max ${maxPages}`,
		`- Pagina's met bruikbare tekst: ${withExcerpt.length}`,
		`- Pagina's met titel: ${withTitle}`,
		`- Gemiddelde excerpt-lengte: ${averageExcerptLength} tekens`,
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
 * Compacts and truncates evidence text for prompt readability.
 *
 * @param excerpt - Crawled page excerpt.
 * @returns Compact text for model evidence input.
 */
function toCompactExcerpt(excerpt: string): string {
	const normalized = excerpt.replace(/\s+/g, ' ').trim()
	if (!normalized) {
		return ''
	}

	const compactLimit = 700
	if (normalized.length <= compactLimit) {
		return normalized
	}

	return `${normalized.slice(0, compactLimit).trimEnd()}…`
}
