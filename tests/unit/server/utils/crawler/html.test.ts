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
					<header class="site-header">Header die niet mee moet</header>
					<nav class="site-nav"><a href="/menu">Menu</a></nav>
					<main>
						<h1 class="headline" data-track="x">Welkom in de regio</h1>
						Belangrijke introductie tekst.
						<script>window.shouldNotAppear = true</script>
						<style>.hidden { display: none; }</style>
						<a href="/over?utm_source=mail">Over</a>
						<a href="javascript:alert('xss')">Onveilig</a>
						<a href="https://sub.example.com/team/">Team</a>
						<a href="mailto:info@example.com">Mail</a>
						<a href="#anchor">Anchor</a>
						<a href="javascript:void(0)">JS</a>
						<a href="https://external.example.org/path">External</a>
						<a href="https://sub.example.com/team/">Duplicate</a>
					</main>
					<footer class="site-footer">Footer die niet mee moet</footer>
				</body>
			</html>
		`

		const result = parseHtmlForCrawl(html, 'https://example.com/start', ['example.com'], 120)

		expect(result.title).toBe('Regionale Scan')
		expect(result.mainHeading).toBe('Welkom in de regio')
		expect(result.excerpt).toContain('Belangrijke introductie tekst.')
		expect(result.fullContent).toContain('<main>')
		expect(result.fullContent).toContain('<h1>Welkom in de regio</h1>')
		expect(result.fullContent).not.toContain('site-header')
		expect(result.fullContent).not.toContain('site-footer')
		expect(result.fullContent).not.toContain('class=')
		expect(result.fullContent).not.toContain('javascript:')
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
		expect(result.excerpt).toBe('Deze tekst wordt gebruikt')
		expect(result.links).toEqual([])
	})

	it('returns an empty result for minimal html without content', () => {
		const result = parseHtmlForCrawl('', 'https://example.com', ['example.com'], 50)
		expect(result).toEqual({
			excerpt: '',
			fullContent: '',
			links: []
		})
	})
})
