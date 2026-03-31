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
				mainHeading: 'Samen bouwen aan de regio',
				excerpt: 'Informatie over de regio',
				fullContent: '<article><h2>Over ons</h2><p>Informatie over de regio</p></article>'
			},
			{
				url: 'https://example.com/contact',
				excerpt: '',
				fullContent: ''
			}
		])

		expect(output).toContain('## Pagina 1')
		expect(output).toContain('Titel: Over ons')
		expect(output).toContain('Hoofdkop (H1): Samen bouwen aan de regio')
		expect(output).toContain('Titel: Onbekend')
		expect(output).toContain('Hoofdkop (H1): Onbekend')
		expect(output).toContain('Inhoud (compact bewijs): Geen tekst gevonden.')
		expect(output).toContain('Kerninhoud (volledig opgeschoond, semantische HTML):')
		expect(output).toContain('<p>Geen inhoud gevonden.</p>')
	})

	it('keeps code-fence safety for full semantic content blocks', () => {
		const output = formatCrawledPagesForPrompt([
			{
				url: 'https://example.com/handleidingen',
				excerpt: 'Gebruik handleiding',
				fullContent: '<article><pre>```voorbeeld```</pre></article>'
			}
		])

		expect(output).toContain('&#96;&#96;&#96;voorbeeld&#96;&#96;&#96;')
		expect(output).not.toContain('```voorbeeld```')
	})

	it('compacts long evidence excerpts per page', () => {
		const output = formatCrawledPagesForPrompt([
			{
				url: 'https://example.com/lang',
				excerpt: 'Lang bewijs '.repeat(220),
				fullContent: '<article><p>Lang bewijs</p></article>'
			}
		])

		const evidenceLine = output
			.split('\n')
			.find((line) => line.startsWith('Inhoud (compact bewijs): '))
		expect(evidenceLine).toBeTruthy()
		expect(evidenceLine).toContain(' …')
		expect(evidenceLine!.length).toBeLessThan(1_050)
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
					excerpt: 'A'.repeat(40),
					fullContent: '<article><h2>Nieuws</h2><p>AAA</p></article>'
				},
				{
					url: 'https://example.com/nieuws/2',
					title: '',
					excerpt: 'B'.repeat(20),
					fullContent: '<article><h2>Nieuws 2</h2><p>BBB</p></article>'
				},
				{
					url: 'https://example.com/contact',
					title: 'Contact',
					excerpt: '',
					fullContent: '<article><h2>Contact</h2></article>'
				}
			]
		})

		expect(output).toContain('Te analyseren URL: https://example.com')
		expect(output).toContain('Regio: Utrecht')
		expect(output).toContain("- Geanalyseerde pagina's: 3 van max 3")
		expect(output).toContain("- Pagina's met bruikbare tekst: 3")
		expect(output).toContain('- Meest voorkomende pad-segmenten: nieuws (2), contact (1)')
		expect(output).toContain('- Gemiddelde evidencetekst-lengte: 22 tekens')
		expect(output).toContain('Gebruik uitsluitend de hierboven aangeleverde crawl-context')
	})
})
