import { markdownToBlocks } from '~/composables/report/markdown/parse'
import { describe, expect, it } from 'vitest'

describe('report/markdown/parse', () => {
	it('parses headings, paragraphs, lists and blockquotes into normalized blocks', () => {
		const blocks = markdownToBlocks(`
# Titel

Paragraaf met **vet** tekst.

- Eerste punt
- Tweede punt

> Quote
`)

		expect(blocks.some((block) => block.type === 'heading')).toBe(true)
		expect(blocks.some((block) => block.type === 'paragraph')).toBe(true)
		expect(blocks.some((block) => block.type === 'bulletList')).toBe(true)
		expect(blocks.some((block) => block.type === 'blockquote')).toBe(true)
	})

	it('returns an empty list for empty markdown', () => {
		expect(markdownToBlocks('   ')).toEqual([])
	})

	it('parses ordered lists into orderedList blocks', () => {
		const blocks = markdownToBlocks(`
1. Eerste stap
2. Tweede stap
`)

		const orderedList = blocks.find((block) => block.type === 'orderedList')
		expect(orderedList?.type).toBe('orderedList')
		expect(orderedList?.items).toHaveLength(2)
	})

	it('maps heading levels above h3 to level 3', () => {
		const blocks = markdownToBlocks('#### Diepe kop')
		const heading = blocks.find((block) => block.type === 'heading')

		expect(heading).toMatchObject({
			type: 'heading',
			level: 3
		})
	})

	it('parses thematic breaks as horizontal rules', () => {
		const blocks = markdownToBlocks(`
Paragraaf

---

Nog een paragraaf
`)

		expect(blocks.some((block) => block.type === 'horizontalRule')).toBe(true)
	})
})
