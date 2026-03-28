import { CRAWLER_CONFIG } from '~~/config/ai'
import { fetchSitemapUrls } from '~~/server/utils/crawler/sitemap'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sitemapDeps = vi.hoisted(() => ({
	fetchTextDocumentMock: vi.fn()
}))

vi.mock('~~/server/utils/crawler/fetch', () => ({
	fetchTextDocument: sitemapDeps.fetchTextDocumentMock
}))

const mutableCrawlerConfig = CRAWLER_CONFIG as unknown as {
	sitemapPaths: string[]
	maxSitemapUrls: number
	maxSitemapDocuments: number
}

const originalCrawlerConfig = {
	sitemapPaths: [...CRAWLER_CONFIG.sitemapPaths],
	maxSitemapUrls: CRAWLER_CONFIG.maxSitemapUrls,
	maxSitemapDocuments: CRAWLER_CONFIG.maxSitemapDocuments
}

describe('crawler/sitemap', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mutableCrawlerConfig.sitemapPaths = ['/sitemap.xml']
		mutableCrawlerConfig.maxSitemapUrls = originalCrawlerConfig.maxSitemapUrls
		mutableCrawlerConfig.maxSitemapDocuments = originalCrawlerConfig.maxSitemapDocuments
	})

	afterEach(() => {
		mutableCrawlerConfig.sitemapPaths = [...originalCrawlerConfig.sitemapPaths]
		mutableCrawlerConfig.maxSitemapUrls = originalCrawlerConfig.maxSitemapUrls
		mutableCrawlerConfig.maxSitemapDocuments = originalCrawlerConfig.maxSitemapDocuments
	})

	it('collects urls from sitemap.xml, robots and nested sitemap indexes', async () => {
		sitemapDeps.fetchTextDocumentMock.mockImplementation(
			async (url: string): Promise<string | null> => {
				if (url === 'https://example.com/robots.txt') {
					return [
						'User-agent: *',
						'Sitemap: /robots-sitemap.xml',
						'Sitemap: https://example.com/robots-sitemap.xml',
						'Sitemap: :::invalid:::'
					].join('\n')
				}

				if (url === 'https://example.com/sitemap.xml') {
					return [
						'<urlset>',
						'  <url><loc>https://example.com/home/?utm_source=newsletter</loc></url>',
						'  <url><loc>https://external.example.org/outside</loc></url>',
						'</urlset>'
					].join('\n')
				}

				if (url === 'https://example.com/robots-sitemap.xml') {
					return [
						'<sitemapindex>',
						'  <sitemap><loc>https://example.com/nested.xml</loc></sitemap>',
						'</sitemapindex>'
					].join('\n')
				}

				if (url === 'https://example.com/nested.xml') {
					return [
						'<urlset>',
						'  <url><loc>https://sub.example.com/about/</loc></url>',
						'  <url><loc>not-a-url</loc></url>',
						'  <url><loc>https://example.com/home</loc></url>',
						'</urlset>'
					].join('\n')
				}

				return null
			}
		)

		const result = await fetchSitemapUrls('https://example.com/start', ['example.com'], 2000, 2)

		expect(result).toEqual(['https://example.com/home', 'https://sub.example.com/about'])
		expect(sitemapDeps.fetchTextDocumentMock).toHaveBeenCalledWith(
			'https://example.com/robots.txt',
			2000
		)
	})

	it('returns an empty list when robots and sitemap files are unavailable/invalid', async () => {
		sitemapDeps.fetchTextDocumentMock.mockImplementation(
			async (url: string): Promise<string | null> => {
				if (url === 'https://example.com/robots.txt') {
					return null
				}

				if (url === 'https://example.com/sitemap.xml') {
					return '<rss><channel><title>not-a-sitemap</title></channel></rss>'
				}

				return null
			}
		)

		await expect(
			fetchSitemapUrls('https://example.com', ['example.com'], 1000, 1)
		).resolves.toEqual([])
	})

	it('supports urlset entries represented as plain string values', async () => {
		sitemapDeps.fetchTextDocumentMock.mockImplementation(
			async (url: string): Promise<string | null> => {
				if (url === 'https://example.com/robots.txt') {
					return null
				}

				if (url === 'https://example.com/sitemap.xml') {
					return '<urlset><url>https://example.com/from-string</url></urlset>'
				}

				return null
			}
		)

		await expect(
			fetchSitemapUrls('https://example.com', ['example.com'], 1000, 1)
		).resolves.toEqual(['https://example.com/from-string'])
	})

	it('respects sitemap document/url caps while traversing nested sitemap files', async () => {
		mutableCrawlerConfig.maxSitemapDocuments = 1
		mutableCrawlerConfig.maxSitemapUrls = 1

		sitemapDeps.fetchTextDocumentMock.mockImplementation(
			async (url: string): Promise<string | null> => {
				if (url === 'https://example.com/robots.txt') {
					return 'Sitemap: /robots-sitemap.xml'
				}

				if (url === 'https://example.com/sitemap.xml') {
					return [
						'<urlset>',
						'  <url><loc>https://example.com/first</loc></url>',
						'  <url><loc>https://example.com/second</loc></url>',
						'</urlset>'
					].join('\n')
				}

				if (url === 'https://example.com/robots-sitemap.xml') {
					return [
						'<sitemapindex>',
						'  <sitemap><loc>https://example.com/nested.xml</loc></sitemap>',
						'</sitemapindex>'
					].join('\n')
				}

				if (url === 'https://example.com/nested.xml') {
					return '<urlset><url><loc>https://example.com/from-nested</loc></url></urlset>'
				}

				return null
			}
		)

		const result = await fetchSitemapUrls('https://example.com', ['example.com'], 1000, 2)

		expect(result).toEqual(['https://example.com/first'])
		expect(sitemapDeps.fetchTextDocumentMock).not.toHaveBeenCalledWith(
			'https://example.com/nested.xml',
			1000
		)
	})
})
