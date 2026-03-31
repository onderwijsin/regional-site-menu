import type { CrawlCacheEntry, CrawlCacheKeyArgs, CrawledWebsitePage } from './types'

import { CRAWLER_CONFIG } from '@ai'

import { asRecord } from './records'

/**
 * Builds a stable cache key for crawl results.
 *
 * @param args - Key parts.
 * @returns Cache key.
 */
export function createCrawlCacheKey(args: CrawlCacheKeyArgs): string {
	const allowedDomainsPart = args.allowedDomains.join(',')
	const limitsPart = [
		args.maxPages,
		args.maxCharsPerPage,
		args.maxQueuedUrls,
		args.timeoutMs,
		args.maxConcurrency,
		args.maxHtmlBytes,
		args.crawlBudgetMs
	].join(':')

	return [
		CRAWLER_CONFIG.cacheKeyPrefix,
		encodeURIComponent(args.startUrl),
		encodeURIComponent(allowedDomainsPart),
		limitsPart
	].join(':')
}

/**
 * Reads cached crawl results when still valid.
 *
 * @param cacheKey - Crawl cache key.
 * @returns Cached pages or null.
 */
export async function getCachedCrawlPages(cacheKey: string): Promise<CrawledWebsitePage[] | null> {
	const storage = useStorage(CRAWLER_CONFIG.cacheNamespace)
	const cachedEntry = await storage.getItem<CrawlCacheEntry | null>(cacheKey)
	if (
		!cachedEntry ||
		!Array.isArray(cachedEntry.pages) ||
		typeof cachedEntry.expiresAt !== 'number'
	) {
		return null
	}

	if (cachedEntry.expiresAt <= Date.now()) {
		await storage.removeItem(cacheKey)
		return null
	}

	const validPages = cachedEntry.pages.filter(isCrawledWebsitePage)
	if (validPages.length === 0) {
		await storage.removeItem(cacheKey)
		return null
	}

	return validPages
}

/**
 * Stores crawl results for configured cache TTL (currently 2 days).
 *
 * @param cacheKey - Crawl cache key.
 * @param pages - Crawl result pages.
 * @returns Nothing.
 */
export async function setCachedCrawlPages(
	cacheKey: string,
	pages: CrawledWebsitePage[]
): Promise<void> {
	// Only cache results that contain at least one meaningful evidence payload.
	if (
		!pages.some((page) => {
			if (page.excerpt.trim().length > 0) {
				return true
			}

			const textFromSemanticHtml = page.fullContent
				.replace(/<[^>]+>/g, ' ')
				.replace(/\s+/g, ' ')
				.trim()
			return textFromSemanticHtml.length > 0
		})
	) {
		return
	}

	const storage = useStorage(CRAWLER_CONFIG.cacheNamespace)
	const cacheEntry: CrawlCacheEntry = {
		expiresAt: Date.now() + CRAWLER_CONFIG.cacheTtlMs,
		pages
	}

	await storage.setItem(cacheKey, cacheEntry)
}

/**
 * Runtime guard for cached crawl pages.
 *
 * @param value - Unknown cache value.
 * @returns Whether the value matches `CrawledWebsitePage`.
 */
function isCrawledWebsitePage(value: unknown): value is CrawledWebsitePage {
	const page = asRecord(value)
	return Boolean(
		page &&
		typeof page.url === 'string' &&
		typeof page.excerpt === 'string' &&
		typeof page.fullContent === 'string' &&
		(page.title === undefined || typeof page.title === 'string') &&
		(page.mainHeading === undefined || typeof page.mainHeading === 'string')
	)
}
