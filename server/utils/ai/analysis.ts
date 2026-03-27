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
		'# Referentiedocument (llms-full)',
		args.referenceDocument,
		'',
		"# Server-crawl context (gebruik uitsluitend deze pagina's als bewijs)",
		formatCrawledPagesForPrompt(args.crawledPages),
		'',
		'# Analyse-opdracht',
		`Gebruik uitsluitend de hierboven aangeleverde crawl-context (max ${args.maxPages} pagina's).`,
		'Noem geen pagina of detail dat niet in deze context staat.',
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
		lines.push(`Inhoud (uittreksel): ${page.excerpt || 'Geen tekst gevonden.'}`)
		lines.push('')
	}

	return lines.join('\n').trim()
}
