import { renderCoverPage } from '~/composables/report/sections/cover'
import { describe, expect, it, vi } from 'vitest'

const loadImageAsBase64Mock = vi.hoisted(() => vi.fn())
const setPdfFillColorMock = vi.hoisted(() => vi.fn())
const setPdfTextColorMock = vi.hoisted(() => vi.fn())

vi.mock('~/composables/report/image', () => ({
	loadImageAsBase64: loadImageAsBase64Mock
}))

vi.mock('~/composables/report/pdf', () => ({
	setPdfFillColor: setPdfFillColorMock,
	setPdfTextColor: setPdfTextColorMock
}))

function createContext() {
	return {
		doc: {
			rect: vi.fn(),
			addImage: vi.fn(),
			setFont: vi.fn(),
			setFontSize: vi.fn(),
			text: vi.fn(),
			textWithLink: vi.fn()
		},
		page: {
			width: 210,
			height: 297
		},
		layout: {
			marginLeft: 16,
			marginTop: 18,
			marginBottom: 18
		},
		colors: {
			coverBg: [247, 248, 250],
			primary: [0, 0, 0],
			heading: [0, 0, 0],
			muted: [0, 0, 0]
		}
	}
}

describe('report/sections/cover', () => {
	it('renders cover with logo and normalized footer host', async () => {
		const ctx = createContext()
		loadImageAsBase64Mock.mockResolvedValue('base64-logo')
		vi.stubGlobal('useRequestOrigin', () => 'https://www.example.com/path')
		vi.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('28-03-2026')

		await renderCoverPage(ctx as never, 'Regio Utrecht')

		expect(setPdfFillColorMock).toHaveBeenCalled()
		expect(ctx.doc.rect).toHaveBeenCalledWith(0, 0, 210, 297, 'F')
		expect(loadImageAsBase64Mock).toHaveBeenCalledWith('/static/logo_with_text.png')
		expect(ctx.doc.addImage).toHaveBeenCalledWith('base64-logo', 'PNG', 16, 18, 60, 0)
		expect(ctx.doc.textWithLink).toHaveBeenCalledWith('www.example.com', 16, 279, {
			url: 'https://www.example.com/path'
		})
	})

	it('keeps rendering when logo loading fails', async () => {
		const ctx = createContext()
		loadImageAsBase64Mock.mockRejectedValue(new Error('missing logo'))
		vi.stubGlobal('useRequestOrigin', () => 'https://example.com')

		await renderCoverPage(ctx as never, 'Regio Groningen')

		expect(ctx.doc.addImage).not.toHaveBeenCalled()
		expect(ctx.doc.textWithLink).toHaveBeenCalledWith('example.com', 16, 279, {
			url: 'https://example.com'
		})
	})
})
