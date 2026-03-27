type CrawlWebsiteArgs = {
	startUrl: string
	allowedDomains: string[]
	maxPages: number
	maxCharsPerPage?: number
	maxQueuedUrls?: number
	timeoutMs?: number
}

export type CrawledWebsitePage = {
	url: string
	title?: string
	excerpt: string
}

const DEFAULT_TIMEOUT_MS = 5_000
const DEFAULT_MAX_CHARS_PER_PAGE = 2_500
const DEFAULT_MAX_QUEUED_URLS = 500
const MAX_SITEMAP_URLS = 200

const SITEMAP_PATHS = ['/sitemap.xml', '/sitemap_index.xml']
const HTML_LIKE_EXTENSIONS = new Set(['', 'html', 'htm', 'php', 'asp', 'aspx', 'jsp'])
const SKIPPED_PATHS = new Set(['/llms.txt', '/llms-full.txt'])

/**
 * Runs a lightweight same-domain crawl for AI analysis context.
 *
 * The crawler is intentionally conservative for CF Workers:
 * - breadth-first crawl with page caps
 * - HTML-only fetches
 * - short per-request timeout
 * - short text excerpts for prompt safety
 *
 * @param args - Crawl configuration.
 * @returns Deterministic list of crawled pages and excerpts.
 */
export async function crawlWebsiteForAnalysis(
	args: CrawlWebsiteArgs,
): Promise<CrawledWebsitePage[]> {
	const maxCharsPerPage = args.maxCharsPerPage ?? DEFAULT_MAX_CHARS_PER_PAGE
	const maxQueuedUrls = args.maxQueuedUrls ?? DEFAULT_MAX_QUEUED_URLS
	const timeoutMs = args.timeoutMs ?? DEFAULT_TIMEOUT_MS

	const entryUrl = normalizeUrl(args.startUrl)
	const queue: string[] = [entryUrl]
	const queued = new Set<string>([entryUrl])
	const visited = new Set<string>()
	const pages: CrawledWebsitePage[] = []

	// Seed queue with sitemap URLs first; this improves coverage on structured websites.
	const sitemapUrls = await fetchSitemapUrls(entryUrl, args.allowedDomains, timeoutMs)
	for (const sitemapUrl of sitemapUrls) {
		if (queue.length >= maxQueuedUrls || queued.has(sitemapUrl) || visited.has(sitemapUrl)) {
			continue
		}

		queue.push(sitemapUrl)
		queued.add(sitemapUrl)
	}

	while (queue.length > 0 && pages.length < args.maxPages) {
		const currentUrl = queue.shift()

		if (!currentUrl) {
			continue
		}

		queued.delete(currentUrl)
		if (visited.has(currentUrl)) {
			continue
		}

		visited.add(currentUrl)
		if (!isProbablyHtmlDocumentUrl(currentUrl)) {
			continue
		}

		const fetched = await fetchHtmlPage(currentUrl, timeoutMs)
		if (!fetched) {
			continue
		}

		const resolvedUrl = normalizeUrl(fetched.finalUrl)
		if (!isAllowedUrl(resolvedUrl, args.allowedDomains)) {
			continue
		}

		const title = extractTitle(fetched.html) || undefined
		const excerpt = extractTextExcerpt(fetched.html, maxCharsPerPage)
		pages.push({
			url: resolvedUrl,
			title,
			excerpt,
		})

		// Add discovered same-domain links for BFS traversal.
		for (const link of extractLinks(fetched.html, resolvedUrl, args.allowedDomains)) {
			if (queue.length >= maxQueuedUrls || queued.has(link) || visited.has(link)) {
				continue
			}

			queue.push(link)
			queued.add(link)
		}
	}

	// Ensure the user-provided URL remains visible in evidence, even after redirects.
	if (!pages.some((page) => page.url === entryUrl)) {
		pages.unshift({
			url: entryUrl,
			excerpt: '',
		})
	}

	return pages.slice(0, args.maxPages)
}

/**
 * Returns true when URL host is inside the allowed domain list.
 *
 * @param url - URL to test.
 * @param allowedDomains - Allowed hostnames.
 * @returns Whether URL is allowed.
 */
function isAllowedUrl(url: string, allowedDomains: string[]): boolean {
	try {
		const { hostname } = new URL(url)
		return allowedDomains.some(
			(domain) => hostname === domain || hostname.endsWith(`.${domain}`),
		)
	} catch {
		return false
	}
}

/**
 * Returns true when a URL likely points to an HTML page we should crawl.
 *
 * This avoids crawling known non-page endpoints (like llms txt routes or APIs)
 * that can trigger server handlers not intended as crawl context.
 *
 * @param url - URL to test.
 * @returns Whether the URL should be fetched by the crawler.
 */
function isProbablyHtmlDocumentUrl(url: string): boolean {
	try {
		const parsed = new URL(url)
		const pathname = parsed.pathname.toLowerCase()

		if (SKIPPED_PATHS.has(pathname) || pathname.startsWith('/api/')) {
			return false
		}

		const lastSegment = pathname.split('/').filter(Boolean).pop() || ''
		const extensionMatch = lastSegment.match(/\.([a-z0-9]+)$/)
		const extension = extensionMatch?.[1] || ''

		return HTML_LIKE_EXTENSIONS.has(extension)
	} catch {
		return false
	}
}

/**
 * Normalizes URL for deduplication.
 *
 * @param input - Raw URL.
 * @returns Normalized absolute URL.
 */
function normalizeUrl(input: string): string {
	const url = new URL(input)
	url.hash = ''
	if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
		url.pathname = url.pathname.replace(/\/+$/, '')
	}

	// Remove tracking parameters that do not represent unique content pages.
	for (const key of [...url.searchParams.keys()]) {
		if (
			key.startsWith('utm_') ||
			key === 'fbclid' ||
			key === 'gclid' ||
			key === 'mc_cid' ||
			key === 'mc_eid'
		) {
			url.searchParams.delete(key)
		}
	}

	return url.toString()
}

/**
 * Fetches one page and returns HTML when content type is crawlable.
 *
 * @param url - Page URL.
 * @param timeoutMs - Per-request timeout.
 * @returns HTML payload + final URL or null when unavailable.
 */
async function fetchHtmlPage(
	url: string,
	timeoutMs: number,
): Promise<{ html: string; finalUrl: string } | null> {
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

	try {
		const response = await fetch(url, {
			method: 'GET',
			redirect: 'follow',
			signal: controller.signal,
			headers: {
				Accept: 'text/html,application/xhtml+xml',
			},
		})

		if (!response.ok) {
			return null
		}

		const contentType = response.headers.get('content-type')?.toLowerCase() || ''
		if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
			return null
		}

		return {
			html: await response.text(),
			finalUrl: response.url || url,
		}
	} catch {
		return null
	} finally {
		clearTimeout(timeoutId)
	}
}

/**
 * Fetches candidate sitemap files and extracts URLs.
 *
 * @param startUrl - Entry URL.
 * @param allowedDomains - Allowed hostnames.
 * @param timeoutMs - Per-request timeout.
 * @returns Same-domain sitemap URLs.
 */
async function fetchSitemapUrls(
	startUrl: string,
	allowedDomains: string[],
	timeoutMs: number,
): Promise<string[]> {
	const entry = new URL(startUrl)
	const collected = new Set<string>()

	for (const sitemapPath of SITEMAP_PATHS) {
		const sitemapUrl = new URL(sitemapPath, entry.origin).toString()
		const xml = await fetchTextDocument(sitemapUrl, timeoutMs)
		if (!xml) {
			continue
		}

		for (const url of extractSitemapLocUrls(xml)) {
			if (!isAllowedUrl(url, allowedDomains)) {
				continue
			}

			const normalizedUrl = normalizeUrl(url)
			if (!isProbablyHtmlDocumentUrl(normalizedUrl)) {
				continue
			}

			collected.add(normalizedUrl)
			if (collected.size >= MAX_SITEMAP_URLS) {
				break
			}
		}

		if (collected.size >= MAX_SITEMAP_URLS) {
			break
		}
	}

	return [...collected]
}

/**
 * Downloads a text document (xml/txt/html).
 *
 * @param url - Resource URL.
 * @param timeoutMs - Per-request timeout.
 * @returns Body text or null.
 */
async function fetchTextDocument(url: string, timeoutMs: number): Promise<string | null> {
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

	try {
		const response = await fetch(url, {
			method: 'GET',
			redirect: 'follow',
			signal: controller.signal,
			headers: {
				Accept: 'application/xml,text/xml,text/plain,text/html',
			},
		})

		if (!response.ok) {
			return null
		}

		return await response.text()
	} catch {
		return null
	} finally {
		clearTimeout(timeoutId)
	}
}

/**
 * Extracts `<loc>` URLs from sitemap XML.
 *
 * @param xml - Sitemap document.
 * @returns URLs found in `<loc>` tags.
 */
function extractSitemapLocUrls(xml: string): string[] {
	const urls: string[] = []
	const locRegex = /<loc>\s*([^<]+?)\s*<\/loc>/gi

	let match = locRegex.exec(xml)
	while (match) {
		const raw = match[1]?.trim()
		if (raw) {
			try {
				urls.push(new URL(raw).toString())
			} catch {
				// Ignore malformed values.
			}
		}

		match = locRegex.exec(xml)
	}

	return urls
}

/**
 * Pulls internal links from HTML.
 *
 * @param html - Page HTML.
 * @param baseUrl - Base URL for resolving relative links.
 * @param allowedDomains - Allowed hostnames.
 * @returns Normalized same-domain URLs.
 */
function extractLinks(html: string, baseUrl: string, allowedDomains: string[]): string[] {
	const urls = new Set<string>()
	const hrefRegex = /href\s*=\s*['"]([^'"]+)['"]/gi

	let match = hrefRegex.exec(html)
	while (match) {
		const rawHref = match[1]?.trim()
		if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:')) {
			match = hrefRegex.exec(html)
			continue
		}

		try {
			const absolute = normalizeUrl(new URL(rawHref, baseUrl).toString())
			if (isAllowedUrl(absolute, allowedDomains) && isProbablyHtmlDocumentUrl(absolute)) {
				urls.add(absolute)
			}
		} catch {
			// Ignore malformed links.
		}

		match = hrefRegex.exec(html)
	}

	return [...urls]
}

/**
 * Extracts document title from HTML.
 *
 * @param html - Page HTML.
 * @returns Title text or empty string.
 */
function extractTitle(html: string): string {
	const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
	return (match?.[1] || '').replace(/\s+/g, ' ').trim()
}

/**
 * Creates a plain-text excerpt from HTML.
 *
 * @param html - Page HTML.
 * @param maxChars - Maximum output length.
 * @returns Compact plain-text excerpt.
 */
function extractTextExcerpt(html: string, maxChars: number): string {
	const withoutScripts = html
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')

	const text = withoutScripts
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/gi, ' ')
		.replace(/&amp;/gi, '&')
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/gi, "'")
		.replace(/\s+/g, ' ')
		.trim()

	return text.slice(0, maxChars).trim()
}
