import { renderAiInsightsSection } from '~/composables/report/sections/ai'
import { describe, expect, it, vi } from 'vitest'

const markdownToBlocksMock = vi.hoisted(() => vi.fn(() => []))
const renderMarkdownBlocksMock = vi.hoisted(() => vi.fn(() => 0))
const renderSectionTitleMock = vi.hoisted(() => vi.fn((_ctx, _title, y: number) => y + 1))
const writeWrappedTextMock = vi.hoisted(() => vi.fn((_doc, args: { y: number }) => args.y + 1))

vi.mock('~/composables/report/markdown', () => ({
	markdownToBlocks: markdownToBlocksMock,
	renderMarkdownBlocks: renderMarkdownBlocksMock
}))

vi.mock('~/composables/report/pdf', () => ({
	renderSectionTitle: renderSectionTitleMock,
	writeWrappedText: writeWrappedTextMock
}))

function createRenderContext() {
	return {
		doc: {
			addPage: vi.fn()
		},
		layout: {
			marginTop: 20,
			marginLeft: 16
		},
		page: {
			contentWidth: 178
		},
		colors: {
			muted: [0, 0, 0]
		}
	}
}

describe('renderAiInsightsSection', () => {
	it('does nothing when there are no AI insights', () => {
		const ctx = createRenderContext()

		renderAiInsightsSection(ctx as never, {
			averages: [],
			audits: []
		})

		expect(ctx.doc.addPage).not.toHaveBeenCalled()
		expect(markdownToBlocksMock).not.toHaveBeenCalled()
	})

	it('renders briefing and website analysis pages with de-duplicated URL appendix', () => {
		const ctx = createRenderContext()

		renderAiInsightsSection(ctx as never, {
			averages: [],
			audits: [],
			aiInsights: {
				briefing: '  ## Briefing\nInhoud  ',
				websiteAnalysis: 'Analyse body',
				websiteAnalysisUrls: [
					'https://example.com/a',
					'https://example.com/a',
					'https://example.com/b'
				]
			}
		})

		expect(ctx.doc.addPage).toHaveBeenCalledTimes(2)
		expect(markdownToBlocksMock).toHaveBeenCalledTimes(2)

		const websiteMarkdownInput = markdownToBlocksMock.mock.calls[1]?.[0] as string
		expect(websiteMarkdownInput).toContain('## Geanalyseerde URLs')
		expect(websiteMarkdownInput).toContain('- https://example.com/a')
		expect(websiteMarkdownInput).toContain('- https://example.com/b')
		expect(websiteMarkdownInput.match(/https:\/\/example.com\/a/g)?.length).toBe(1)
	})

	it('keeps website analysis markdown unchanged when no analysed URLs are provided', () => {
		const ctx = createRenderContext()

		renderAiInsightsSection(ctx as never, {
			averages: [],
			audits: [],
			aiInsights: {
				websiteAnalysis: '  Analyse zonder appendix  ',
				websiteAnalysisUrls: []
			}
		})

		expect(ctx.doc.addPage).toHaveBeenCalledTimes(1)
		expect(markdownToBlocksMock).toHaveBeenLastCalledWith('Analyse zonder appendix')
	})
})
