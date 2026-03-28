import {
	renderBulletList,
	renderSubheading,
	writeRichText
} from '~/composables/report/sections/shared'
import { describe, expect, it, vi } from 'vitest'

function createContext() {
	return {
		doc: {
			setFont: vi.fn(),
			setFontSize: vi.fn(),
			setTextColor: vi.fn(),
			text: vi.fn(),
			splitTextToSize: vi.fn((text: string) => [text]),
			getTextWidth: vi.fn((text: string) => text.length * 2),
			internal: {
				pageSize: {
					getHeight: () => 297
				}
			},
			addPage: vi.fn()
		},
		layout: {
			marginLeft: 16,
			marginBottom: 18,
			marginTop: 18
		},
		page: {
			contentWidth: 40
		},
		colors: {
			heading: [0, 0, 0],
			text: [0, 0, 0]
		}
	}
}

describe('report/sections/shared', () => {
	it('renders subheadings with heading style and returns next y', () => {
		const ctx = createContext()

		const nextY = renderSubheading(ctx as never, 'Subkop', 30)

		expect(ctx.doc.setFont).toHaveBeenCalledWith('RijksoverheidHeading', 'bold')
		expect(ctx.doc.text).toHaveBeenCalledWith('Subkop', 16, 30)
		expect(nextY).toBe(36)
	})

	it('renders bullet list items and returns trailing spacing', () => {
		const ctx = createContext()

		const nextY = renderBulletList(ctx as never, ['Eerste punt', 'Tweede punt'], 40)

		expect(ctx.doc.text).toHaveBeenCalledWith('•', 16, 40)
		expect(nextY).toBeGreaterThan(40)
	})

	it('wraps rich text fragments across lines when width overflows', () => {
		const ctx = createContext()
		ctx.doc.getTextWidth = vi.fn((text: string) => (text.includes('lange') ? 30 : 20))

		const nextY = writeRichText(
			ctx as never,
			[{ text: 'korte ' }, { text: 'lange woorden hier', style: 'bold' }],
			50
		)

		expect(ctx.doc.text).toHaveBeenCalled()
		const secondCallY = ctx.doc.text.mock.calls[1]?.[2] as number
		expect(secondCallY).toBeGreaterThanOrEqual(50)
		expect(nextY).toBeGreaterThan(50)
	})
})
