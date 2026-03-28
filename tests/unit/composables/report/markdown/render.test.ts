import type { jsPDF } from 'jspdf'

import { renderMarkdownBlocks } from '~/composables/report/markdown/render'
import { describe, expect, it, vi } from 'vitest'

function createDocStub(height = 120) {
	return {
		addPage: vi.fn(),
		setFont: vi.fn(),
		setFontSize: vi.fn(),
		setTextColor: vi.fn(),
		setDrawColor: vi.fn(),
		setLineWidth: vi.fn(),
		text: vi.fn(),
		line: vi.fn(),
		splitTextToSize: vi.fn((text: string) => [text]),
		internal: {
			pageSize: {
				getHeight: () => height
			}
		}
	} as unknown as jsPDF
}

describe('report/markdown/render', () => {
	it('renders mixed markdown blocks including lists and blockquotes', () => {
		const doc = createDocStub(160)

		const nextY = renderMarkdownBlocks(
			doc,
			[
				{
					type: 'paragraph',
					segments: [{ text: 'Paragraaf', marks: [] }]
				},
				{
					type: 'heading',
					level: 1,
					segments: [{ text: 'Kop', marks: ['bold'] }]
				},
				{
					type: 'bulletList',
					items: [
						{
							segments: [{ text: 'Bullet item', marks: [] }],
							children: [
								{
									type: 'paragraph',
									segments: [{ text: 'Nested child', marks: ['italic'] }]
								}
							]
						}
					]
				},
				{
					type: 'orderedList',
					items: [
						{
							segments: [{ text: 'Ordered item', marks: [] }]
						}
					]
				},
				{
					type: 'blockquote',
					blocks: [
						{
							type: 'paragraph',
							segments: [{ text: 'Quote body', marks: [] }]
						}
					]
				}
			] as never,
			16,
			20,
			150
		)

		expect(nextY).toBeGreaterThan(20)
		expect(doc.text).toHaveBeenCalled()
		expect(doc.line).toHaveBeenCalled()
	})

	it('forces a page break for horizontal rules near page bottom', () => {
		const doc = createDocStub(60)

		renderMarkdownBlocks(
			doc,
			[
				{
					type: 'horizontalRule'
				}
			] as never,
			16,
			45,
			150
		)

		expect(doc.addPage).toHaveBeenCalledTimes(1)
		expect(doc.line).toHaveBeenCalled()
	})
})
