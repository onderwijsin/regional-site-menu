import { parseHtmlForCrawl } from '~~/server/utils/crawler/html'
import { describe, expect, it, vi } from 'vitest'

const readabilityParseMock = vi.hoisted(() => vi.fn())

vi.mock('@mozilla/readability', () => ({
	Readability: class MockReadability {
		parse() {
			return readabilityParseMock()
		}
	}
}))

describe('crawler/html readability integration', () => {
	it('uses readability excerpt + title when readability output is viable', () => {
		const readableText = 'relevante inhoud '.repeat(40).trim()
		readabilityParseMock.mockReturnValue({
			title: 'Readability titel',
			textContent: readableText,
			content:
				'<article class="x"><h2 data-id="a">Kern</h2><p style="color:red">Tekst</p></article>'
		})

		const result = parseHtmlForCrawl(
			'<html><head><title>Fallback titel</title></head><body><main>Fallback</main></body></html>',
			'https://example.com',
			['example.com'],
			80
		)

		expect(result.title).toBe('Readability titel')
		expect(result.excerpt).toBe(readableText.slice(0, 80).trim())
		expect(result.fullContent).toBe('<article><h2>Kern</h2><p>Tekst</p></article>')
	})

	it('falls back to simple extraction when readability output is weak', () => {
		readabilityParseMock.mockReturnValue({
			title: 'Readability titel',
			textContent: 'kort blok'
		})

		const result = parseHtmlForCrawl(
			'<html><head><title>Fallback titel</title></head><body><main>Betrouwbare fallback inhoud voor analyse.</main></body></html>',
			'https://example.com',
			['example.com'],
			120
		)

		expect(result.title).toBe('Fallback titel')
		expect(result.excerpt).toBe('Betrouwbare fallback inhoud voor analyse.')
		expect(result.fullContent).toContain('<main>')
		expect(result.fullContent).toContain('Betrouwbare fallback inhoud voor analyse.')
	})
})
