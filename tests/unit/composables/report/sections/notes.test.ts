import { renderNotesSection } from '~/composables/report/sections/notes'
import { describe, expect, it, vi } from 'vitest'

const markdownToBlocksMock = vi.hoisted(() => vi.fn(() => [{ type: 'paragraph', segments: [] }]))
const renderMarkdownBlocksMock = vi.hoisted(() => vi.fn(() => 0))
const renderSectionTitleMock = vi.hoisted(() => vi.fn((_ctx, _title, y: number) => y + 2))

vi.mock('~/composables/report/markdown', () => ({
	markdownToBlocks: markdownToBlocksMock,
	renderMarkdownBlocks: renderMarkdownBlocksMock
}))

vi.mock('~/composables/report/pdf', () => ({
	renderSectionTitle: renderSectionTitleMock
}))

function createContext() {
	return {
		doc: {
			addPage: vi.fn()
		},
		layout: {
			marginTop: 18,
			marginLeft: 16
		},
		page: {
			contentWidth: 178
		}
	}
}

describe('report/sections/notes', () => {
	it('skips rendering when notes are empty after trimming', () => {
		const ctx = createContext()

		renderNotesSection(
			ctx as never,
			{
				notes: '   '
			} as never
		)

		expect(ctx.doc.addPage).not.toHaveBeenCalled()
		expect(markdownToBlocksMock).not.toHaveBeenCalled()
	})

	it('renders markdown notes on a dedicated page', () => {
		const ctx = createContext()

		renderNotesSection(
			ctx as never,
			{
				notes: '  **Belangrijk**  '
			} as never
		)

		expect(ctx.doc.addPage).toHaveBeenCalledTimes(1)
		expect(markdownToBlocksMock).toHaveBeenCalledWith('**Belangrijk**')
		expect(renderMarkdownBlocksMock).toHaveBeenCalled()
	})
})
