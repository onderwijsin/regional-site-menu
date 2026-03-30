import { CRAWLER_CONFIG } from '~~/config/ai'
import {
	createCrawlCacheKey,
	getCachedCrawlPages,
	setCachedCrawlPages
} from '~~/server/utils/crawler/cache'
import { describe, expect, it, vi } from 'vitest'

function createStorageMock(
	overrides: {
		getItemValue?: unknown
	} = {}
) {
	return {
		getItem: vi.fn().mockResolvedValue(overrides.getItemValue ?? null),
		setItem: vi.fn().mockResolvedValue(undefined),
		removeItem: vi.fn().mockResolvedValue(undefined)
	}
}

describe('crawler/cache', () => {
	it('creates deterministic crawl cache keys', () => {
		const key = createCrawlCacheKey({
			startUrl: 'https://example.com/path?q=1',
			allowedDomains: ['example.com', 'www.example.com'],
			maxPages: 8,
			maxCharsPerPage: 1200,
			maxQueuedUrls: 50,
			timeoutMs: 3000,
			maxConcurrency: 4,
			maxHtmlBytes: 100000,
			crawlBudgetMs: 225000
		})

		expect(key).toContain(CRAWLER_CONFIG.cacheKeyPrefix)
		expect(key).toContain(encodeURIComponent('https://example.com/path?q=1'))
		expect(key).toContain(encodeURIComponent('example.com,www.example.com'))
	})

	it('returns null for invalid/expired cache entries and removes stale values', async () => {
		const expiredStorage = createStorageMock({
			getItemValue: {
				expiresAt: Date.now() - 1000,
				pages: [{ url: 'https://example.com', excerpt: 'tekst' }]
			}
		})
		vi.stubGlobal(
			'useStorage',
			vi.fn(() => expiredStorage)
		)

		await expect(getCachedCrawlPages('cache:expired')).resolves.toBeNull()
		expect(expiredStorage.removeItem).toHaveBeenCalledWith('cache:expired')

		const invalidShapeStorage = createStorageMock({
			getItemValue: {
				expiresAt: 'not-a-number',
				pages: []
			}
		})
		vi.stubGlobal(
			'useStorage',
			vi.fn(() => invalidShapeStorage)
		)
		await expect(getCachedCrawlPages('cache:invalid')).resolves.toBeNull()
	})

	it('filters invalid cached pages and removes entry when no valid pages remain', async () => {
		const storage = createStorageMock({
			getItemValue: {
				expiresAt: Date.now() + 60_000,
				pages: [{ bad: true }, { url: 1 }]
			}
		})
		vi.stubGlobal(
			'useStorage',
			vi.fn(() => storage)
		)

		await expect(getCachedCrawlPages('cache:empty')).resolves.toBeNull()
		expect(storage.removeItem).toHaveBeenCalledWith('cache:empty')
	})

	it('returns only valid cached pages when entry is still fresh', async () => {
		const storage = createStorageMock({
			getItemValue: {
				expiresAt: Date.now() + 60_000,
				pages: [
					{ url: 'https://example.com/a', excerpt: 'A', title: 'A' },
					{ url: 'https://example.com/b', excerpt: 'B' },
					{ excerpt: 'missing url' }
				]
			}
		})
		vi.stubGlobal(
			'useStorage',
			vi.fn(() => storage)
		)

		await expect(getCachedCrawlPages('cache:valid')).resolves.toEqual([
			{ url: 'https://example.com/a', excerpt: 'A', title: 'A' },
			{ url: 'https://example.com/b', excerpt: 'B' }
		])
		expect(storage.removeItem).not.toHaveBeenCalled()
	})

	it('stores only crawl results with meaningful excerpts', async () => {
		const storage = createStorageMock()
		vi.stubGlobal(
			'useStorage',
			vi.fn(() => storage)
		)
		vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

		await setCachedCrawlPages('cache:no-text', [
			{ url: 'https://example.com/a', excerpt: '   ' }
		])
		expect(storage.setItem).not.toHaveBeenCalled()

		await setCachedCrawlPages('cache:with-text', [
			{ url: 'https://example.com/a', excerpt: 'Inhoud' }
		])

		expect(storage.setItem).toHaveBeenCalledWith('cache:with-text', {
			expiresAt: 1_700_000_000_000 + CRAWLER_CONFIG.cacheTtlMs,
			pages: [{ url: 'https://example.com/a', excerpt: 'Inhoud' }]
		})
	})
})
