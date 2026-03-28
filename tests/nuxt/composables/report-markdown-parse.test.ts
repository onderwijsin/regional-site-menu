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
})
