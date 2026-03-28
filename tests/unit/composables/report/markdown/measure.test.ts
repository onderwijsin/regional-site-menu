import type { jsPDF } from 'jspdf'

import {
	measureMarkdownBlocksHeight,
	segmentsToPlainText
} from '~/composables/report/markdown/measure'
import { describe, expect, it, vi } from 'vitest'

function createDocStub() {
	return {
		splitTextToSize: vi.fn((text: string) => text.split('\n'))
	} as unknown as jsPDF
}

describe('report/markdown/measure', () => {
	it('flattens rich text segments into plain text', () => {
		expect(
			segmentsToPlainText([
				{ text: 'Hallo', marks: [] },
				{ text: ' wereld', marks: ['bold'] }
			])
		).toBe('Hallo wereld')
	})

	it('measures mixed markdown structures including nested lists and blockquotes', () => {
		const doc = createDocStub()
		const height = measureMarkdownBlocksHeight(
			doc,
			[
				{
					type: 'paragraph',
					segments: [{ text: 'Paragraaf', marks: [] }]
				},
				{
					type: 'heading',
					level: 2,
					segments: [{ text: 'Titel', marks: [] }]
				},
				{
					type: 'bulletList',
					items: [
						{
							segments: [{ text: 'Item', marks: [] }],
							children: [
								{
									type: 'paragraph',
									segments: [{ text: 'Child', marks: [] }]
								}
							]
						}
					]
				},
				{
					type: 'orderedList',
					items: [
						{
							segments: [{ text: 'Eerste', marks: [] }]
						}
					]
				},
				{
					type: 'blockquote',
					blocks: [
						{
							type: 'paragraph',
							segments: [{ text: 'Quote', marks: [] }]
						}
					]
				},
				{
					type: 'horizontalRule'
				}
			] as never,
			180
		)

		expect(height).toBeGreaterThan(0)
	})
})
