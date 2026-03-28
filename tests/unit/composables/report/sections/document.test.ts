import { renderReportDocument } from '~/composables/report/sections/document'
import { describe, expect, it, vi } from 'vitest'

const renderCoverPageMock = vi.hoisted(() => vi.fn(async () => undefined))
const renderIntroductionPageMock = vi.hoisted(() => vi.fn())
const renderNotesSectionMock = vi.hoisted(() => vi.fn())
const renderAiInsightsSectionMock = vi.hoisted(() => vi.fn())
const renderAveragesSectionMock = vi.hoisted(() => vi.fn())
const renderAuditSectionMock = vi.hoisted(() => vi.fn())

vi.mock('~/composables/report/sections/cover', () => ({
	renderCoverPage: renderCoverPageMock
}))
vi.mock('~/composables/report/sections/introduction', () => ({
	renderIntroductionPage: renderIntroductionPageMock
}))
vi.mock('~/composables/report/sections/notes', () => ({
	renderNotesSection: renderNotesSectionMock
}))
vi.mock('~/composables/report/sections/ai', () => ({
	renderAiInsightsSection: renderAiInsightsSectionMock
}))
vi.mock('~/composables/report/sections/averages', () => ({
	renderAveragesSection: renderAveragesSectionMock
}))
vi.mock('~/composables/report/sections/audit', () => ({
	renderAuditSection: renderAuditSectionMock
}))

describe('renderReportDocument', () => {
	it('renders sections in canonical order', async () => {
		const order: string[] = []

		renderCoverPageMock.mockImplementationOnce(async () => {
			order.push('cover')
		})
		renderIntroductionPageMock.mockImplementationOnce(() => {
			order.push('intro')
		})
		renderNotesSectionMock.mockImplementationOnce(() => {
			order.push('notes')
		})
		renderAiInsightsSectionMock.mockImplementationOnce(() => {
			order.push('ai')
		})
		renderAveragesSectionMock.mockImplementationOnce(() => {
			order.push('averages')
		})
		renderAuditSectionMock.mockImplementationOnce(() => {
			order.push('audit')
		})

		const ctx = { doc: {} }
		const config = { region: 'Utrecht' }
		const data = {
			averages: [],
			audits: []
		}

		await renderReportDocument(ctx as never, config as never, data as never)

		expect(order).toEqual(['cover', 'intro', 'notes', 'ai', 'averages', 'audit'])
		expect(renderCoverPageMock).toHaveBeenCalledWith(ctx, 'Utrecht')
		expect(renderAuditSectionMock).toHaveBeenCalledWith(ctx, data.audits, config)
	})
})
