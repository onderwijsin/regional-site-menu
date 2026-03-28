import { CRAWLER_CONFIG } from '~~/config/ai'
import { clampConcurrency, isAllowedUrl, normalizeUrl } from '~~/server/utils/crawler/url'
import { describe, expect, it } from 'vitest'

describe('crawler/url utilities', () => {
	it('allows exact domains and subdomains', () => {
		expect(isAllowedUrl('https://example.com/pad', ['example.com'])).toBe(true)
		expect(isAllowedUrl('https://sub.example.com/pad', ['example.com'])).toBe(true)
		expect(isAllowedUrl('https://example.org/pad', ['example.com'])).toBe(false)
		expect(isAllowedUrl('invalid', ['example.com'])).toBe(false)
	})

	it('clamps concurrency to configured limits', () => {
		expect(clampConcurrency(undefined)).toBe(CRAWLER_CONFIG.defaultMaxConcurrency)
		expect(clampConcurrency(0)).toBe(1)
		expect(clampConcurrency(99)).toBe(CRAWLER_CONFIG.maxConcurrency)
		expect(clampConcurrency(2.7)).toBe(3)
	})

	it('normalizes URLs for deduplication', () => {
		expect(normalizeUrl('https://example.com/path/?utm_source=x&gclid=y&keep=1#section')).toBe(
			'https://example.com/path?keep=1'
		)
		expect(normalizeUrl('https://example.com/path///')).toBe('https://example.com/path')
	})
})
