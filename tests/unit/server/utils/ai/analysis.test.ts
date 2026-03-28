import {
	createAllowedDomains,
	formatCrawledPagesForPrompt,
	formatWebsiteAnalysisInput
} from '~~/server/utils/ai/analysis'
import { describe, expect, it } from 'vitest'

describe('server/utils/ai/analysis', () => {
	it('builds allowlist domains for both bare and www hosts', () => {
		expect(createAllowedDomains('https://example.com/path')).toEqual([
			'example.com',
			'www.example.com'
		])
		expect(createAllowedDomains('https://www.example.com/path')).toEqual([
			'www.example.com',
			'example.com'
		])
	})

	it('formats crawled pages into prompt evidence blocks', () => {
		expect(formatCrawledPagesForPrompt([])).toBe('Geen crawlcontext beschikbaar.')

		const output = formatCrawledPagesForPrompt([
			{
				url: 'https://example.com/over',
				title: 'Over ons',
				excerpt: 'Informatie over de regio'
			},
			{
				url: 'https://example.com/contact',
				excerpt: ''
			}
		])

		expect(output).toContain('## Pagina 1')
		expect(output).toContain('Titel: Over ons')
		expect(output).toContain('Titel: Onbekend')
		expect(output).toContain('Inhoud (uittreksel): Geen tekst gevonden.')
	})

	it('includes crawl coverage + constraints in website-analysis prompt', () => {
		const output = formatWebsiteAnalysisInput({
			url: 'https://example.com',
			region: 'Utrecht',
			referenceDocument: 'REFERENTIE',
			maxPages: 3,
			crawledPages: [
				{
					url: 'https://example.com/nieuws',
					title: 'Nieuws',
					excerpt: 'A'.repeat(40)
				},
				{
					url: 'https://example.com/nieuws/2',
					title: '',
					excerpt: 'B'.repeat(20)
				},
				{
					url: 'https://example.com/contact',
					title: 'Contact',
					excerpt: ''
				}
			]
		})

		expect(output).toContain('Te analyseren URL: https://example.com')
		expect(output).toContain('Regio: Utrecht')
		expect(output).toContain("- Geanalyseerde pagina's: 3 van max 3")
		expect(output).toContain("- Pagina's met bruikbare tekst: 2")
		expect(output).toContain('- Meest voorkomende pad-segmenten: nieuws (2), contact (1)')
		expect(output).toContain('Gebruik uitsluitend de hierboven aangeleverde crawl-context')
	})
})
