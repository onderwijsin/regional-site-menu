import type { CrawledWebsitePage, CrawlWebsiteArgs } from './types'

import { AI_WEBSITE_ANALYSIS_CONFIG, CRAWLER_CONFIG } from '@ai'
import pLimit from 'p-limit'

import { createCrawlCacheKey, getCachedCrawlPages, setCachedCrawlPages } from './cache'
import { fetchHtmlPage } from './fetch'
import { parseHtmlForCrawl } from './html'
import { fetchSitemapUrls } from './sitemap'
import { clampConcurrency, isAllowedUrl, normalizeUrl } from './url'

/**
 * Runs a lightweight same-domain crawl for AI analysis context.
 *
 * The crawler is intentionally conservative for CF Workers:
 * - breadth-first crawl with page caps
 * - HTML-only fetches
 * - short per-request timeout
 * - short text excerpts for prompt safety
 * - bounded concurrency
 * - cached crawl results (configured TTL, currently 2 days)
 *
 * @param args - Crawl configuration.
 * @returns Deterministic list of crawled pages and excerpts.
 */
export async function crawlWebsiteForAnalysis(
	args: CrawlWebsiteArgs
): Promise<CrawledWebsitePage[]> {
	const maxCharsPerPage = args.maxCharsPerPage ?? CRAWLER_CONFIG.defaultMaxCharsPerPage
	const maxQueuedUrls = args.maxQueuedUrls ?? CRAWLER_CONFIG.defaultMaxQueuedUrls
	const timeoutMs = args.timeoutMs ?? CRAWLER_CONFIG.defaultTimeoutMs
	const maxConcurrency = clampConcurrency(args.maxConcurrency)
	const maxHtmlBytes = args.maxHtmlBytes ?? CRAWLER_CONFIG.defaultMaxHtmlBytes
	const crawlBudgetMs = args.crawlBudgetMs ?? AI_WEBSITE_ANALYSIS_CONFIG.crawlBudgetMs

	const entryUrl = normalizeUrl(args.startUrl)
	const normalizedAllowedDomains = [
		...new Set(args.allowedDomains.map((domain) => domain.toLowerCase()))
	].sort()
	const crawlCacheKey = createCrawlCacheKey({
		startUrl: entryUrl,
		allowedDomains: normalizedAllowedDomains,
		maxPages: args.maxPages,
		maxCharsPerPage,
		maxQueuedUrls,
		timeoutMs,
		maxConcurrency,
		maxHtmlBytes,
		crawlBudgetMs
	})

	const cachedPages = await getCachedCrawlPages(crawlCacheKey)
	if (cachedPages) {
		return cachedPages.slice(0, args.maxPages)
	}

	const queue: string[] = [entryUrl]
	const queued = new Set<string>([entryUrl])
	const visited = new Set<string>()
	const pages: CrawledWebsitePage[] = []
	const crawlLimit = pLimit(maxConcurrency)
	const crawlStartedAt = Date.now()

	const isBudgetExceeded = (): boolean => Date.now() - crawlStartedAt >= crawlBudgetMs

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
		normalizedAllowedDomains,
		timeoutMs,
		maxConcurrency
	)
	for (const sitemapUrl of sitemapUrls) {
		if (isBudgetExceeded()) {
			break
		}

		enqueueUrl(sitemapUrl)
	}

	while (queue.length > 0 && pages.length < args.maxPages) {
		if (isBudgetExceeded()) {
			break
		}

		const batch: string[] = []

		while (
			batch.length < maxConcurrency &&
			queue.length > 0 &&
			pages.length + batch.length < args.maxPages &&
			!isBudgetExceeded()
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
						normalizedAllowedDomains,
						timeoutMs,
						maxCharsPerPage,
						maxHtmlBytes
					)

					return { index, ...crawled }
				})
			)
		)

		for (const result of [...batchResults].sort((left, right) => left.index - right.index)) {
			if (result.page && pages.length < args.maxPages) {
				pages.push(result.page)
			}

			if (pages.length >= args.maxPages || isBudgetExceeded()) {
				continue
			}

			for (const link of result.links) {
				if (isBudgetExceeded()) {
					break
				}

				enqueueUrl(link)
			}
		}
	}

	// Ensure the user-provided URL remains visible when at least one page was
	// successfully crawled, even after redirects.
	if (pages.length > 0 && !pages.some((page) => page.url === entryUrl)) {
		pages.unshift({
			url: entryUrl,
			excerpt: '',
			fullContent: ''
		})
	}

	const finalizedPages = pages.slice(0, args.maxPages)
	await setCachedCrawlPages(crawlCacheKey, finalizedPages)

	return finalizedPages
}

/**
 * Crawls and parses one HTML page.
 *
 * @param url - Page URL.
 * @param allowedDomains - Allowed hostnames.
 * @param timeoutMs - Per-request timeout.
 * @param maxCharsPerPage - Max excerpt length.
 * @param maxHtmlBytes - Max number of bytes read from HTML response.
 * @returns Extracted page plus discovered links.
 */
async function crawlSinglePage(
	url: string,
	allowedDomains: string[],
	timeoutMs: number,
	maxCharsPerPage: number,
	maxHtmlBytes: number
): Promise<{ page?: CrawledWebsitePage; links: string[] }> {
	const fetched = await fetchHtmlPage(url, timeoutMs, maxHtmlBytes)
	if (!fetched) {
		return { links: [] }
	}

	const resolvedUrl = normalizeUrl(fetched.finalUrl)
	if (!isAllowedUrl(resolvedUrl, allowedDomains)) {
		return { links: [] }
	}

	const parsed = parseHtmlForCrawl(fetched.html, resolvedUrl, allowedDomains, maxCharsPerPage)
	const page: CrawledWebsitePage = {
		url: resolvedUrl,
		title: parsed.title,
		excerpt: parsed.excerpt,
		fullContent: parsed.fullContent
	}
	if (parsed.mainHeading) {
		page.mainHeading = parsed.mainHeading
	}

	return {
		page,
		links: parsed.links
	}
}
