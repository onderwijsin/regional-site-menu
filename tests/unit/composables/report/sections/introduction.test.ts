import { renderIntroductionPage } from '~/composables/report/sections/introduction'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const renderSectionTitleMock = vi.hoisted(() => vi.fn((_ctx, _title, y: number) => y + 2))
const writeWrappedTextMock = vi.hoisted(() => vi.fn((_doc, args: { y: number }) => args.y + 2))
const renderBulletListMock = vi.hoisted(() => vi.fn((_ctx, _items: string[], y: number) => y + 3))
const renderSubheadingMock = vi.hoisted(() => vi.fn((_ctx, _text, y: number) => y + 1))
const writeRichTextMock = vi.hoisted(() => vi.fn((_ctx, _segments, y: number) => y + 1))

vi.mock('~/composables/report/pdf', () => ({
	renderSectionTitle: renderSectionTitleMock,
	writeWrappedText: writeWrappedTextMock
}))

vi.mock('~/composables/report/sections/shared', () => ({
	renderBulletList: renderBulletListMock,
	renderSubheading: renderSubheadingMock,
	writeRichText: writeRichTextMock
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
		},
		colors: {
			text: [0, 0, 0]
		}
	}
}

describe('report/sections/introduction', () => {
	beforeEach(() => {
		renderBulletListMock.mockClear()
	})

	it('renders provenance bullets including AI website analysis and briefing', () => {
		const ctx = createContext()

		renderIntroductionPage(
			ctx as never,
			{
				region: 'Utrecht',
				aiWebsiteAnalysis: true,
				aiBriefing: true,
				url: '',
				maxPages: 1,
				notes: ''
			} as never
		)

		expect(ctx.doc.addPage).toHaveBeenCalledTimes(1)
		const provenanceItems = (renderBulletListMock.mock.calls
			.map((call) => call[1] as string[])
			.find((items) =>
				items.some((item) =>
					item.includes('Scores en toelichtingen op deze scores per auditonderdeel')
				)
			) ?? []) as string[]
		expect(provenanceItems[0]).toContain('Utrecht')
		expect(
			provenanceItems.some((item) =>
				item.includes('website-analyse in dit rapport is met AI gegenereerd')
			)
		).toBe(true)
		expect(
			provenanceItems.some((item) =>
				item.includes('briefing in dit rapport is met AI gegenereerd')
			)
		).toBe(true)
		expect(provenanceItems).not.toContain('Er zijn geen AI-gegenereerde onderdelen opgenomen.')
	})

	it('renders explicit no-AI provenance when no AI sections are enabled', () => {
		const ctx = createContext()

		renderIntroductionPage(
			ctx as never,
			{
				region: 'Friesland',
				aiWebsiteAnalysis: false,
				aiBriefing: false,
				url: '',
				maxPages: 1,
				notes: ''
			} as never
		)

		const provenanceItems = (renderBulletListMock.mock.calls
			.map((call) => call[1] as string[])
			.find((items) =>
				items.some((item) =>
					item.includes('Scores en toelichtingen op deze scores per auditonderdeel')
				)
			) ?? []) as string[]
		expect(
			provenanceItems.some((item) =>
				item.includes('Er zijn geen AI-gegenereerde onderdelen opgenomen')
			)
		).toBe(true)
	})
})
