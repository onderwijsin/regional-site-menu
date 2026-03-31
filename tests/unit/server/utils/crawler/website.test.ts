import { AI_WEBSITE_ANALYSIS_CONFIG, CRAWLER_CONFIG } from '~~/config/ai'
import { crawlWebsiteForAnalysis } from '~~/server/utils/crawler/website'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const crawlerDeps = vi.hoisted(() => ({
	createCrawlCacheKeyMock: vi.fn(),
	getCachedCrawlPagesMock: vi.fn(),
	setCachedCrawlPagesMock: vi.fn(),
	fetchHtmlPageMock: vi.fn(),
	parseHtmlForCrawlMock: vi.fn(),
	fetchSitemapUrlsMock: vi.fn()
}))

vi.mock('~~/server/utils/crawler/cache', () => ({
	createCrawlCacheKey: crawlerDeps.createCrawlCacheKeyMock,
	getCachedCrawlPages: crawlerDeps.getCachedCrawlPagesMock,
	setCachedCrawlPages: crawlerDeps.setCachedCrawlPagesMock
}))

vi.mock('~~/server/utils/crawler/fetch', () => ({
	fetchHtmlPage: crawlerDeps.fetchHtmlPageMock
}))

vi.mock('~~/server/utils/crawler/html', () => ({
	parseHtmlForCrawl: crawlerDeps.parseHtmlForCrawlMock
}))

vi.mock('~~/server/utils/crawler/sitemap', () => ({
	fetchSitemapUrls: crawlerDeps.fetchSitemapUrlsMock
}))

describe('crawler/website', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		crawlerDeps.createCrawlCacheKeyMock.mockReturnValue('crawl-cache-key')
		crawlerDeps.getCachedCrawlPagesMock.mockResolvedValue(null)
		crawlerDeps.setCachedCrawlPagesMock.mockResolvedValue(undefined)
		crawlerDeps.fetchSitemapUrlsMock.mockResolvedValue([])
	})

	it('returns cached pages when present and truncates to requested max pages', async () => {
		crawlerDeps.getCachedCrawlPagesMock.mockResolvedValue([
			{ url: 'https://example.com/1', excerpt: 'one', fullContent: '<p>one</p>' },
			{ url: 'https://example.com/2', excerpt: 'two', fullContent: '<p>two</p>' },
			{ url: 'https://example.com/3', excerpt: 'three', fullContent: '<p>three</p>' }
		])

		const result = await crawlWebsiteForAnalysis({
			startUrl: 'https://example.com/start/',
			allowedDomains: ['Example.com', 'example.com'],
			maxPages: 2,
			maxConcurrency: 99
		})

		expect(result).toEqual([
			{ url: 'https://example.com/1', excerpt: 'one', fullContent: '<p>one</p>' },
			{ url: 'https://example.com/2', excerpt: 'two', fullContent: '<p>two</p>' }
		])
		expect(crawlerDeps.createCrawlCacheKeyMock).toHaveBeenCalledWith({
			startUrl: 'https://example.com/start',
			allowedDomains: ['example.com'],
			maxPages: 2,
			maxCharsPerPage: CRAWLER_CONFIG.defaultMaxCharsPerPage,
			maxQueuedUrls: CRAWLER_CONFIG.defaultMaxQueuedUrls,
			timeoutMs: CRAWLER_CONFIG.defaultTimeoutMs,
			maxConcurrency: CRAWLER_CONFIG.maxConcurrency,
			maxHtmlBytes: CRAWLER_CONFIG.defaultMaxHtmlBytes,
			crawlBudgetMs: AI_WEBSITE_ANALYSIS_CONFIG.crawlBudgetMs
		})
		expect(crawlerDeps.fetchSitemapUrlsMock).not.toHaveBeenCalled()
		expect(crawlerDeps.fetchHtmlPageMock).not.toHaveBeenCalled()
		expect(crawlerDeps.setCachedCrawlPagesMock).not.toHaveBeenCalled()
	})

	it('crawls sitemap + linked pages and keeps the requested entry url visible', async () => {
		crawlerDeps.fetchSitemapUrlsMock.mockResolvedValue(['https://example.com/sitemap-page'])
		crawlerDeps.fetchHtmlPageMock.mockImplementation(
			async (url: string): Promise<{ html: string; finalUrl: string } | null> => {
				if (url === 'https://example.com/start') {
					return {
						html: 'ENTRY',
						finalUrl: 'https://example.com/landing/'
					}
				}

				if (url === 'https://example.com/sitemap-page') {
					return {
						html: 'SITEMAP',
						finalUrl: 'https://example.com/sitemap-page'
					}
				}

				if (url === 'https://example.com/linked') {
					return {
						html: 'LINKED',
						finalUrl: 'https://example.com/linked'
					}
				}

				return null
			}
		)
		crawlerDeps.parseHtmlForCrawlMock.mockImplementation((html: string) => {
			if (html === 'ENTRY') {
				return {
					excerpt: 'Inhoud van landing',
					fullContent: '<article><p>Inhoud van landing</p></article>',
					links: ['https://example.com/linked']
				}
			}

			if (html === 'SITEMAP') {
				return {
					title: 'Sitemap pagina',
					excerpt: 'Sitemap inhoud',
					fullContent: '<article><p>Sitemap inhoud</p></article>',
					links: []
				}
			}

			return {
				excerpt: 'Gekoppelde inhoud',
				fullContent: '<article><p>Gekoppelde inhoud</p></article>',
				links: []
			}
		})

		const result = await crawlWebsiteForAnalysis({
			startUrl: 'https://example.com/start',
			allowedDomains: ['example.com'],
			maxPages: 2,
			maxConcurrency: 3
		})

		expect(result).toEqual([
			{ url: 'https://example.com/start', excerpt: '', fullContent: '' },
			{
				url: 'https://example.com/landing',
				excerpt: 'Inhoud van landing',
				fullContent: '<article><p>Inhoud van landing</p></article>',
				title: undefined
			}
		])
		expect(crawlerDeps.fetchSitemapUrlsMock).toHaveBeenCalledWith(
			'https://example.com/start',
			['example.com'],
			CRAWLER_CONFIG.defaultTimeoutMs,
			3
		)
		expect(crawlerDeps.fetchHtmlPageMock).toHaveBeenCalledTimes(2)
		expect(crawlerDeps.setCachedCrawlPagesMock).toHaveBeenCalledWith('crawl-cache-key', result)
	})

	it('deduplicates queued links and crawls each url once', async () => {
		crawlerDeps.fetchHtmlPageMock.mockImplementation(
			async (url: string): Promise<{ html: string; finalUrl: string } | null> => {
				if (url === 'https://example.com/start') {
					return { html: 'ENTRY', finalUrl: url }
				}

				if (url === 'https://example.com/a') {
					return { html: 'A', finalUrl: url }
				}

				return null
			}
		)
		crawlerDeps.parseHtmlForCrawlMock.mockImplementation((html: string) => {
			if (html === 'ENTRY') {
				return {
					excerpt: 'Start',
					fullContent: '<article><p>Start</p></article>',
					links: ['https://example.com/a', 'https://example.com/a']
				}
			}

			return {
				excerpt: 'Pagina A',
				fullContent: '<article><p>Pagina A</p></article>',
				links: []
			}
		})

		const result = await crawlWebsiteForAnalysis({
			startUrl: 'https://example.com/start',
			allowedDomains: ['example.com'],
			maxPages: 5
		})

		expect(result).toEqual([
			{
				url: 'https://example.com/start',
				excerpt: 'Start',
				fullContent: '<article><p>Start</p></article>',
				title: undefined
			},
			{
				url: 'https://example.com/a',
				excerpt: 'Pagina A',
				fullContent: '<article><p>Pagina A</p></article>',
				title: undefined
			}
		])
		expect(crawlerDeps.fetchHtmlPageMock).toHaveBeenCalledTimes(2)
		expect(crawlerDeps.fetchHtmlPageMock).toHaveBeenNthCalledWith(
			2,
			'https://example.com/a',
			CRAWLER_CONFIG.defaultTimeoutMs,
			CRAWLER_CONFIG.defaultMaxHtmlBytes
		)
	})

	it('skips pages that fail to fetch or resolve to a disallowed domain', async () => {
		crawlerDeps.fetchHtmlPageMock.mockResolvedValue({
			html: 'ENTRY',
			finalUrl: 'https://not-allowed.example.org/path'
		})

		const result = await crawlWebsiteForAnalysis({
			startUrl: 'https://example.com/start',
			allowedDomains: ['example.com'],
			maxPages: 3
		})

		expect(result).toEqual([])
		expect(crawlerDeps.parseHtmlForCrawlMock).not.toHaveBeenCalled()
		expect(crawlerDeps.setCachedCrawlPagesMock).toHaveBeenCalledWith('crawl-cache-key', [])
	})

	it('returns no pages when the entry page fetch fails', async () => {
		crawlerDeps.fetchHtmlPageMock.mockResolvedValue(null)

		const result = await crawlWebsiteForAnalysis({
			startUrl: 'https://example.com/start',
			allowedDomains: ['example.com'],
			maxPages: 3
		})

		expect(result).toEqual([])
		expect(crawlerDeps.parseHtmlForCrawlMock).not.toHaveBeenCalled()
		expect(crawlerDeps.setCachedCrawlPagesMock).toHaveBeenCalledWith('crawl-cache-key', [])
	})

	it('stops crawling when crawl budget is exhausted', async () => {
		let nowMs = 0
		vi.spyOn(Date, 'now').mockImplementation(() => nowMs)

		crawlerDeps.fetchHtmlPageMock.mockImplementation(
			async (url: string): Promise<{ html: string; finalUrl: string } | null> => {
				if (url === 'https://example.com/start') {
					nowMs = 10
					return { html: 'ENTRY', finalUrl: url }
				}

				if (url === 'https://example.com/next') {
					return { html: 'NEXT', finalUrl: url }
				}

				return null
			}
		)

		crawlerDeps.parseHtmlForCrawlMock.mockImplementation((html: string) => {
			if (html === 'ENTRY') {
				return {
					excerpt: 'Start',
					fullContent: '<article><p>Start</p></article>',
					links: ['https://example.com/next']
				}
			}

			return {
				excerpt: 'Volgende pagina',
				fullContent: '<article><p>Volgende pagina</p></article>',
				links: []
			}
		})

		const result = await crawlWebsiteForAnalysis({
			startUrl: 'https://example.com/start',
			allowedDomains: ['example.com'],
			maxPages: 5,
			crawlBudgetMs: 5
		})

		expect(result).toEqual([
			{
				url: 'https://example.com/start',
				excerpt: 'Start',
				fullContent: '<article><p>Start</p></article>',
				title: undefined
			}
		])
		expect(crawlerDeps.fetchHtmlPageMock).toHaveBeenCalledTimes(1)
	})
})
