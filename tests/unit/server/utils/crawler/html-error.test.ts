import { parseHtmlForCrawl } from '~~/server/utils/crawler/html'
import { describe, expect, it, vi } from 'vitest'

const parseHtmlMock = vi.hoisted(() => vi.fn())

vi.mock('linkedom/worker', () => ({
	parseHTML: parseHtmlMock
}))

describe('crawler/html parse failures', () => {
	it('returns a safe empty payload when html parsing throws', () => {
		parseHtmlMock.mockImplementation(() => {
			throw new Error('parse failed')
		})

		expect(
			parseHtmlForCrawl('<html></html>', 'https://example.com', ['example.com'], 120)
		).toEqual({
			excerpt: '',
			links: []
		})
	})
})
