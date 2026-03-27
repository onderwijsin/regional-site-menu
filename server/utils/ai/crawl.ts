import { XMLParser } from 'fast-xml-parser'
import { parseHTML } from 'linkedom'
import pLimit from 'p-limit'

type CrawlWebsiteArgs = {
	startUrl: string
	allowedDomains: string[]
	maxPages: number
	maxCharsPerPage?: number
	maxQueuedUrls?: number
	timeoutMs?: number
	maxConcurrency?: number
}

type ParsedHtmlCrawlData = {
	title?: string
	excerpt: string
	links: string[]
}

type ParsedDomElement = {
	textContent?: string | null
	getAttribute?: CallableFunction
	remove?: CallableFunction
}

type ParsedDomDocument = {
	querySelector: CallableFunction
	querySelectorAll: CallableFunction
	body?: ParsedDomElement | null
}

type SitemapDocumentEntries = {
	pageUrls: string[]
	nestedSitemaps: string[]
}

export type CrawledWebsitePage = {
	url: string
	title?: string
	excerpt: string
}

const DEFAULT_TIMEOUT_MS = 5_000
const DEFAULT_MAX_CHARS_PER_PAGE = 2_500
const DEFAULT_MAX_QUEUED_URLS = 500
const DEFAULT_MAX_CONCURRENCY = 3
const MAX_CONCURRENCY = 5
const MAX_SITEMAP_URLS = 200
const MAX_SITEMAP_DOCUMENTS = 60
const ROBOTS_PATH = '/robots.txt'

const SITEMAP_PATHS = [
	'/sitemap.xml',
	'/sitemap_index.xml',
	'/sitemap-index.xml',
	'/sitemaps.xml',
	'/sitemap/sitemap.xml',
	'/wp-sitemap.xml',
	'/sitemap1.xml',

	// Additional common variants
	'/wp-sitemap-posts.xml',
	'/wp-sitemap-pages.xml',

	'/sitemap-main.xml',
	'/sitemap_index1.xml',

	'/sitemap/index.xml',
	'/sitemaps/index.xml',
	'/sitemap/sitemap-index.xml',

	'/post-sitemap.xml',
	'/page-sitemap.xml',
	'/category-sitemap.xml',
	'/product-sitemap.xml',

	'/sitemap_news.xml',
	'/news-sitemap.xml',
	'/image-sitemap.xml',
	'/video-sitemap.xml',

	'/sitemap.xml.gz',
	'/sitemap-index.xml.gz',
	'/sitemap/sitemap.xml.gz'
]

const sitemapXmlParser = new XMLParser({
	ignoreAttributes: true,
	removeNSPrefix: true,
	trimValues: true
})

/**
 * Runs a lightweight same-domain crawl for AI analysis context.
 *
 * The crawler is intentionally conservative for CF Workers:
 * - breadth-first crawl with page caps
 * - HTML-only fetches
 * - short per-request timeout
 * - short text excerpts for prompt safety
 * - bounded concurrency
 *
 * @param args - Crawl configuration.
 * @returns Deterministic list of crawled pages and excerpts.
 */
export async function crawlWebsiteForAnalysis(
	args: CrawlWebsiteArgs
): Promise<CrawledWebsitePage[]> {
	const maxCharsPerPage = args.maxCharsPerPage ?? DEFAULT_MAX_CHARS_PER_PAGE
	const maxQueuedUrls = args.maxQueuedUrls ?? DEFAULT_MAX_QUEUED_URLS
	const timeoutMs = args.timeoutMs ?? DEFAULT_TIMEOUT_MS
	const maxConcurrency = clampConcurrency(args.maxConcurrency)

	const entryUrl = normalizeUrl(args.startUrl)
	const queue: string[] = [entryUrl]
	const queued = new Set<string>([entryUrl])
	const visited = new Set<string>()
	const pages: CrawledWebsitePage[] = []
	const crawlLimit = pLimit(maxConcurrency)

	const enqueueUrl = (url: string): void => {
		if (queue.length >= maxQueuedUrls || queued.has(url) || visited.has(url)) {
			return
		}

		queue.push(url)
		queued.add(url)
	}

	// Seed queue with sitemap URLs first; this improves coverage on structured websites.
	const sitemapUrls = await fetchSitemapUrls(
		entryUrl,
		args.allowedDomains,
		timeoutMs,
		maxConcurrency
	)
	for (const sitemapUrl of sitemapUrls) {
		enqueueUrl(sitemapUrl)
	}

	while (queue.length > 0 && pages.length < args.maxPages) {
		const batch: string[] = []

		while (
			batch.length < maxConcurrency &&
			queue.length > 0 &&
			pages.length + batch.length < args.maxPages
		) {
			const currentUrl = queue.shift()
			if (!currentUrl) {
				continue
			}

			queued.delete(currentUrl)
			if (visited.has(currentUrl)) {
				continue
			}

			visited.add(currentUrl)
			batch.push(currentUrl)
		}

		if (batch.length === 0) {
			continue
		}

		const batchResults = await Promise.all(
			batch.map((url, index) =>
				crawlLimit(async () => {
					const crawled = await crawlSinglePage(
						url,
						args.allowedDomains,
						timeoutMs,
						maxCharsPerPage
					)

					return { index, ...crawled }
				})
			)
		)

		for (const result of [...batchResults].sort((left, right) => left.index - right.index)) {
			if (result.page && pages.length < args.maxPages) {
				pages.push(result.page)
			}

			if (pages.length >= args.maxPages) {
				continue
			}

			for (const link of result.links) {
				enqueueUrl(link)
			}
		}
	}

	// Ensure the user-provided URL remains visible when at least one page was
	// successfully crawled, even after redirects.
	if (pages.length > 0 && !pages.some((page) => page.url === entryUrl)) {
		pages.unshift({
			url: entryUrl,
			excerpt: ''
		})
	}

	return pages.slice(0, args.maxPages)
}

/**
 * Crawls and parses one HTML page.
 *
 * @param url - Page URL.
 * @param allowedDomains - Allowed hostnames.
 * @param timeoutMs - Per-request timeout.
 * @param maxCharsPerPage - Max excerpt length.
 * @returns Extracted page plus discovered links.
 */
async function crawlSinglePage(
	url: string,
	allowedDomains: string[],
	timeoutMs: number,
	maxCharsPerPage: number
): Promise<{ page?: CrawledWebsitePage; links: string[] }> {
	const fetched = await fetchHtmlPage(url, timeoutMs)
	if (!fetched) {
		return { links: [] }
	}

	const resolvedUrl = normalizeUrl(fetched.finalUrl)
	if (!isAllowedUrl(resolvedUrl, allowedDomains)) {
		return { links: [] }
	}

	const parsed = parseHtmlForCrawl(fetched.html, resolvedUrl, allowedDomains, maxCharsPerPage)

	return {
		page: {
			url: resolvedUrl,
			title: parsed.title,
			excerpt: parsed.excerpt
		},
		links: parsed.links
	}
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
			(domain) => hostname === domain || hostname.endsWith(`.${domain}`)
		)
	} catch {
		return false
	}
}

/**
 * Clamps configured crawl concurrency to a safe range for Workers.
 *
 * @param value - Optional configured concurrency.
 * @returns Safe concurrency.
 */
function clampConcurrency(value: number | undefined): number {
	const fallback = value ?? DEFAULT_MAX_CONCURRENCY
	return Math.min(Math.max(Math.round(fallback), 1), MAX_CONCURRENCY)
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

	// Normalize trailing slash on non-root paths to reduce duplicate URLs.
	if (url.pathname.length > 1) {
		url.pathname = url.pathname.replace(/\/+$/g, '')
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
	timeoutMs: number
): Promise<{ html: string; finalUrl: string } | null> {
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

	try {
		const response = await fetch(url, {
			method: 'GET',
			redirect: 'follow',
			signal: controller.signal,
			headers: {
				Accept: 'text/html,application/xhtml+xml'
			}
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
			finalUrl: response.url || url
		}
	} catch {
		return null
	} finally {
		clearTimeout(timeoutId)
	}
}

/**
 * Parses HTML for title, prioritized excerpt text, and links.
 *
 * @param html - HTML payload.
 * @param baseUrl - Base URL for resolving relative links.
 * @param allowedDomains - Allowed hostnames.
 * @param maxCharsPerPage - Max excerpt length.
 * @returns Parsed crawl data.
 */
function parseHtmlForCrawl(
	html: string,
	baseUrl: string,
	allowedDomains: string[],
	maxCharsPerPage: number
): ParsedHtmlCrawlData {
	try {
		const parsedWindow = parseHTML(html) as unknown as { document?: ParsedDomDocument }
		const document = parsedWindow.document
		if (!document) {
			return {
				excerpt: '',
				links: []
			}
		}

		for (const node of document.querySelectorAll(
			'script,style,noscript,template'
		) as ParsedDomElement[]) {
			node.remove?.()
		}

		const titleNode = document.querySelector('title') as ParsedDomElement | null
		const title = normalizeText(titleNode?.textContent)
		const contentRoot =
			(document.querySelector('main') as ParsedDomElement | null) ??
			(document.querySelector('article') as ParsedDomElement | null) ??
			document.body
		const excerpt = normalizeText(contentRoot?.textContent).slice(0, maxCharsPerPage).trim()
		const links = extractLinksFromDocument(document, baseUrl, allowedDomains)

		return {
			title: title || undefined,
			excerpt,
			links
		}
	} catch {
		return {
			excerpt: '',
			links: []
		}
	}
}

/**
 * Pulls internal links from parsed HTML.
 *
 * @param document - Parsed HTML document.
 * @param baseUrl - Base URL for resolving relative links.
 * @param allowedDomains - Allowed hostnames.
 * @returns Normalized same-domain URLs.
 */
function extractLinksFromDocument(
	document: ParsedDomDocument,
	baseUrl: string,
	allowedDomains: string[]
): string[] {
	const urls = new Set<string>()

	for (const anchor of document.querySelectorAll('a[href]') as ParsedDomElement[]) {
		const rawHref = anchor.getAttribute?.('href')?.trim()
		if (
			!rawHref ||
			rawHref.startsWith('#') ||
			rawHref.startsWith('mailto:') ||
			rawHref.startsWith('tel:') ||
			rawHref.startsWith('javascript:')
		) {
			continue
		}

		try {
			const absolute = normalizeUrl(new URL(rawHref, baseUrl).toString())
			if (isAllowedUrl(absolute, allowedDomains)) {
				urls.add(absolute)
			}
		} catch {
			// Ignore malformed links.
		}
	}

	return [...urls]
}

/**
 * Normalizes text for excerpts.
 *
 * @param value - Raw text.
 * @returns Normalized text.
 */
function normalizeText(value: string | null | undefined): string {
	return value?.replace(/\s+/g, ' ').trim() ?? ''
}

/**
 * Fetches candidate sitemap files and extracts URLs.
 *
 * @param startUrl - Entry URL.
 * @param allowedDomains - Allowed hostnames.
 * @param timeoutMs - Per-request timeout.
 * @param maxConcurrency - Max parallel sitemap requests.
 * @returns Same-domain sitemap URLs.
 */
async function fetchSitemapUrls(
	startUrl: string,
	allowedDomains: string[],
	timeoutMs: number,
	maxConcurrency: number
): Promise<string[]> {
	const entry = new URL(startUrl)
	const discoveredSitemaps = new Set<string>()
	const visitedSitemaps = new Set<string>()
	const sitemapQueue: string[] = []
	const collectedPageUrls = new Set<string>()
	const sitemapFetchLimit = pLimit(maxConcurrency)

	const enqueueSitemapUrl = (rawUrl: string): void => {
		try {
			const normalized = normalizeUrl(new URL(rawUrl, entry.origin).toString())
			if (!isAllowedUrl(normalized, allowedDomains)) {
				return
			}

			if (discoveredSitemaps.has(normalized) || visitedSitemaps.has(normalized)) {
				return
			}

			discoveredSitemaps.add(normalized)
			sitemapQueue.push(normalized)
		} catch {
			// Ignore malformed sitemap locations.
		}
	}

	for (const sitemapPath of SITEMAP_PATHS) {
		enqueueSitemapUrl(new URL(sitemapPath, entry.origin).toString())
	}

	for (const robotsSitemapUrl of await fetchRobotsSitemapUrls(entry.origin, timeoutMs)) {
		enqueueSitemapUrl(robotsSitemapUrl)
	}

	while (
		sitemapQueue.length > 0 &&
		collectedPageUrls.size < MAX_SITEMAP_URLS &&
		visitedSitemaps.size < MAX_SITEMAP_DOCUMENTS
	) {
		const batch = sitemapQueue.splice(0, maxConcurrency)

		const entries = await Promise.all(
			batch.map((sitemapUrl, index) =>
				sitemapFetchLimit(async () => {
					const documentEntries = await fetchSitemapEntries(sitemapUrl, timeoutMs)
					return { index, sitemapUrl, documentEntries }
				})
			)
		)

		for (const entryResult of [...entries].sort((left, right) => left.index - right.index)) {
			visitedSitemaps.add(entryResult.sitemapUrl)

			if (!entryResult.documentEntries) {
				continue
			}

			for (const nestedSitemapUrl of entryResult.documentEntries.nestedSitemaps) {
				if (
					visitedSitemaps.size + sitemapQueue.length >= MAX_SITEMAP_DOCUMENTS ||
					collectedPageUrls.size >= MAX_SITEMAP_URLS
				) {
					break
				}

				enqueueSitemapUrl(nestedSitemapUrl)
			}

			for (const pageUrl of entryResult.documentEntries.pageUrls) {
				if (collectedPageUrls.size >= MAX_SITEMAP_URLS) {
					break
				}

				if (!isAllowedUrl(pageUrl, allowedDomains)) {
					continue
				}

				collectedPageUrls.add(normalizeUrl(pageUrl))
			}
		}
	}

	return [...collectedPageUrls]
}

/**
 * Downloads robots.txt and extracts sitemap declarations.
 *
 * @param origin - Site origin.
 * @param timeoutMs - Per-request timeout.
 * @returns Sitemap URLs declared in robots.txt.
 */
async function fetchRobotsSitemapUrls(origin: string, timeoutMs: number): Promise<string[]> {
	const robotsUrl = new URL(ROBOTS_PATH, origin).toString()
	const robotsText = await fetchTextDocument(robotsUrl, timeoutMs)
	if (!robotsText) {
		return []
	}

	const sitemapUrls: string[] = []
	const lines = robotsText.split(/\r?\n/)

	for (const line of lines) {
		const match = line.match(/^\s*sitemap:\s*(\S+)\s*$/i)
		if (!match?.[1]) {
			continue
		}

		try {
			sitemapUrls.push(new URL(match[1], origin).toString())
		} catch {
			// Ignore malformed sitemap URL values.
		}
	}

	return sitemapUrls
}

/**
 * Downloads and parses a sitemap document.
 *
 * @param sitemapUrl - Sitemap URL.
 * @param timeoutMs - Per-request timeout.
 * @returns Parsed entries or null.
 */
async function fetchSitemapEntries(
	sitemapUrl: string,
	timeoutMs: number
): Promise<SitemapDocumentEntries | null> {
	const xml = await fetchTextDocument(sitemapUrl, timeoutMs)
	if (!xml) {
		return null
	}

	return parseSitemapXml(xml)
}

/**
 * Parses sitemap XML into nested sitemap URLs and page URLs.
 *
 * @param xml - Raw sitemap XML.
 * @returns Parsed sitemap entries.
 */
function parseSitemapXml(xml: string): SitemapDocumentEntries {
	try {
		const parsed = sitemapXmlParser.parse(xml)
		const root = asRecord(parsed)

		const sitemapIndex = asRecord(root?.sitemapindex)
		if (sitemapIndex) {
			return {
				pageUrls: [],
				nestedSitemaps: collectLocEntries(sitemapIndex.sitemap)
			}
		}

		const urlSet = asRecord(root?.urlset)
		if (urlSet) {
			return {
				pageUrls: collectLocEntries(urlSet.url),
				nestedSitemaps: []
			}
		}
	} catch {
		// Ignore invalid sitemap documents.
	}

	return {
		pageUrls: [],
		nestedSitemaps: []
	}
}

/**
 * Extracts `loc` URLs from sitemap array/object values.
 *
 * @param value - Parsed sitemap node value.
 * @returns Extracted URLs.
 */
function collectLocEntries(value: unknown): string[] {
	const entries = toArray(value)
	const urls: string[] = []

	for (const entry of entries) {
		if (typeof entry === 'string') {
			urls.push(entry)
			continue
		}

		const objectEntry = asRecord(entry)
		const loc = objectEntry?.loc
		if (typeof loc === 'string') {
			urls.push(loc)
		}
	}

	return urls
}

/**
 * Turns unknown value into record when possible.
 *
 * @param value - Unknown value.
 * @returns Object record or null.
 */
function asRecord(value: unknown): Record<string, unknown> | null {
	if (value && typeof value === 'object' && !Array.isArray(value)) {
		return value as Record<string, unknown>
	}

	return null
}

/**
 * Ensures unknown value is iterable as array.
 *
 * @param value - Unknown value.
 * @returns Array value.
 */
function toArray<T>(value: T | T[] | undefined): T[] {
	if (value === undefined) {
		return []
	}

	return Array.isArray(value) ? value : [value]
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
				Accept: 'application/xml,text/xml,text/plain,text/html'
			}
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
