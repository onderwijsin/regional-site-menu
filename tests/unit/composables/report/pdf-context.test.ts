import { PDF_COLORS, PDF_LAYOUT } from '~/composables/report/constants'
import { createRenderContext } from '~/composables/report/pdf'
import { describe, expect, it, vi } from 'vitest'

const jsPdfConstructorMock = vi.hoisted(() =>
	vi.fn(function JsPdfMock() {
		return { marker: 'doc' }
	})
)
const registerFontsMock = vi.hoisted(() => vi.fn(async () => undefined))

vi.mock('jspdf', () => ({
	jsPDF: jsPdfConstructorMock
}))

vi.mock('~/composables/report/fonts', () => ({
	registerFonts: registerFontsMock
}))

describe('report/pdf createRenderContext', () => {
	it('creates a jsPDF instance with shared layout and registers fonts', async () => {
		const result = await createRenderContext()

		expect(jsPdfConstructorMock).toHaveBeenCalledWith({
			orientation: 'portrait',
			unit: 'mm',
			format: 'a4',
			compress: true,
			putOnlyUsedFonts: true
		})
		expect(registerFontsMock).toHaveBeenCalledWith({ marker: 'doc' })
		expect(result).toEqual({
			doc: { marker: 'doc' },
			page: {
				width: PDF_LAYOUT.pageWidth,
				height: PDF_LAYOUT.pageHeight,
				contentWidth: PDF_LAYOUT.pageWidth - PDF_LAYOUT.marginLeft - PDF_LAYOUT.marginRight
			},
			layout: PDF_LAYOUT,
			colors: PDF_COLORS
		})
	})
})
