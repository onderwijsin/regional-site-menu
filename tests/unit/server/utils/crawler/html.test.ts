import { parseHtmlForCrawl } from '~~/server/utils/crawler/html'
import { describe, expect, it } from 'vitest'

describe('crawler/html', () => {
	it('extracts title, excerpt and only allowed normalized links', () => {
		const html = `
			<html>
				<head>
					<title>  Regionale   Scan  </title>
				</head>
				<body>
					<main>
						Belangrijke introductie tekst.
						<script>window.shouldNotAppear = true</script>
						<style>.hidden { display: none; }</style>
						<a href="/over?utm_source=mail">Over</a>
						<a href="https://sub.example.com/team/">Team</a>
						<a href="mailto:info@example.com">Mail</a>
						<a href="#anchor">Anchor</a>
						<a href="javascript:void(0)">JS</a>
						<a href="https://external.example.org/path">External</a>
						<a href="https://sub.example.com/team/">Duplicate</a>
					</main>
				</body>
			</html>
		`

		const result = parseHtmlForCrawl(html, 'https://example.com/start', ['example.com'], 120)

		expect(result.title).toBe('Regionale Scan')
		expect(result.excerpt).toContain('Belangrijke introductie tekst.')
		expect(result.heading).toBeUndefined()
		expect(result.excerpt).not.toContain('window.shouldNotAppear')
		expect(result.links).toEqual(['https://example.com/over', 'https://sub.example.com/team'])
	})

	it('falls back from main to article/body and truncates excerpt', () => {
		const html = `
			<html>
				<body>
					<article>
						Deze tekst wordt gebruikt als fallback wanneer er geen main bestaat.
					</article>
				</body>
			</html>
		`

		const result = parseHtmlForCrawl(html, 'https://example.com', ['example.com'], 25)

		expect(result.title).toBeUndefined()
		expect(result.heading).toBeUndefined()
		expect(result.excerpt).toBe('Deze tekst wordt gebruikt')
		expect(result.links).toEqual([])
	})

	it('prefers readability extraction when available', () => {
		const html = `
			<html>
				<head>
					<title>Mijn site</title>
				</head>
				<body>
					<header>Menu Home Contact</header>
					<article>
						<h1>Belangrijke kop</h1>
						<p>${'Inhoud '.repeat(120)}</p>
					</article>
				</body>
			</html>
		`

		const result = parseHtmlForCrawl(html, 'https://example.com', ['example.com'], 60)

		expect(result.excerpt.length).toBe(60)
		expect(result.heading).toBe('Belangrijke kop')
		expect(result.excerpt).toContain('Inhoud')
	})

	it('returns an empty result for minimal html without content', () => {
		const result = parseHtmlForCrawl('', 'https://example.com', ['example.com'], 50)
		expect(result).toEqual({
			excerpt: '',
			links: []
		})
	})
})
