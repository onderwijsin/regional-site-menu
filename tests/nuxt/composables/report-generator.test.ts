import type { ReportData } from '~/composables/report/types'
import type { ReportConfig } from '~~/schema/reportConfig'

import { useReportGenerator } from '~/composables/report-generator'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { pdfMocks, renderReportDocumentMock } = vi.hoisted(() => ({
	pdfMocks: {
		createDefaultFilename: vi.fn(() => 'rapport.pdf'),
		createRenderContext: vi.fn(async () => ({ doc: { save: vi.fn() } })),
		setPdfDocumentMetadata: vi.fn(),
		savePdf: vi.fn()
	},
	renderReportDocumentMock: vi.fn(async () => undefined)
}))

vi.mock('~/composables/report/pdf', () => pdfMocks)
vi.mock('~/composables/report/sections', () => ({
	renderReportDocument: renderReportDocumentMock
}))

const config: ReportConfig = {
	region: 'Utrecht',
	aiBriefing: true,
	aiWebsiteAnalysis: false,
	notes: 'Context'
}

const data: ReportData = {
	averages: [],
	audits: [
		{
			id: 'item-1',
			score: 8,
			comment: 'Sterk',
			item: {
				id: 'item-1',
				title: 'Homepage',
				pillar: 'Inzicht & Overzicht',
				goals: ['Informeren'],
				priority: 'Must have',
				description: 'Beschrijving'
			} as never
		}
	]
}

describe('useReportGenerator', () => {
	beforeEach(() => {
		vi.stubGlobal('useSiteConfig', () => ({ name: 'Regionale Menukaart' }))
	})

	it('orchestrates PDF context creation, metadata, rendering and save', async () => {
		const { generateReport } = useReportGenerator()

		await generateReport(config, data)

		expect(pdfMocks.createDefaultFilename).toHaveBeenCalledWith('Utrecht')
		expect(pdfMocks.createRenderContext).toHaveBeenCalledTimes(1)
		expect(pdfMocks.setPdfDocumentMetadata).toHaveBeenCalledTimes(1)

		const metadata = pdfMocks.setPdfDocumentMetadata.mock.calls[0]?.[1]
		expect(metadata.title).toContain('Utrecht')
		expect(metadata.creator).toContain('Regionale Menukaart')
		expect(metadata.keywords).toContain('ai')
		expect(metadata.keywords).toContain('ai-briefing')

		expect(renderReportDocumentMock).toHaveBeenCalledTimes(1)
		expect(pdfMocks.savePdf).toHaveBeenCalledWith(expect.anything(), 'rapport.pdf')
	})

	it('wraps rendering failures as REPORT_GENERATION_FAILED', async () => {
		renderReportDocumentMock.mockRejectedValueOnce(new Error('render failed'))
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

		const { generateReport } = useReportGenerator()

		await expect(generateReport(config, data)).rejects.toMatchObject({
			name: 'ReportGenerationError',
			code: 'REPORT_GENERATION_FAILED'
		})

		consoleErrorSpy.mockRestore()
	})
})
