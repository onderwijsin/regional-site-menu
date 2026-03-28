import {
	buildReportPdfAiInsights,
	createReportAiInputSignature,
	hasGeneratedReportAiInsights
} from '~/composables/report-generation-flow'
import { describe, expect, it } from 'vitest'

describe('report-generation-flow helpers', () => {
	it('builds stable signatures independent of audit order and whitespace', () => {
		const config = {
			region: ' Utrecht ',
			aiBriefing: true,
			aiWebsiteAnalysis: true,
			url: ' https://example.com ',
			maxPages: 10,
			notes: ' test '
		}

		const left = createReportAiInputSignature(config, [
			{ id: 'b', score: 6, comment: ' ok ' },
			{ id: 'a', score: null, comment: '  ' }
		])
		const right = createReportAiInputSignature(config, [
			{ id: 'a', score: null, comment: '' },
			{ id: 'b', score: 6, comment: 'ok' }
		])

		expect(left).toBe(right)
	})

	it('detects whether insights contain meaningful content', () => {
		expect(hasGeneratedReportAiInsights()).toBe(false)
		expect(hasGeneratedReportAiInsights({ briefing: '  ' })).toBe(false)
		expect(hasGeneratedReportAiInsights({ websiteAnalysis: 'Analyse' })).toBe(true)
	})

	it('builds final PDF insights respecting enabled toggles', () => {
		const config = {
			region: 'Regio',
			aiBriefing: true,
			aiWebsiteAnalysis: false,
			notes: '',
			maxPages: 5
		}

		const output = buildReportPdfAiInsights({
			config,
			briefingDraft: ' Aangepaste briefing ',
			aiInsights: {
				briefing: 'origineel',
				websiteAnalysis: 'analyse',
				websiteAnalysisUrls: ['https://example.com']
			}
		})

		expect(output).toEqual({
			briefing: 'Aangepaste briefing'
		})
	})

	it('keeps website analysis fields when website analysis toggle is enabled', () => {
		const output = buildReportPdfAiInsights({
			config: {
				region: 'Regio',
				aiBriefing: false,
				aiWebsiteAnalysis: true,
				url: 'https://example.com',
				notes: '',
				maxPages: 5
			},
			briefingDraft: '',
			aiInsights: {
				websiteAnalysis: 'Analyse',
				websiteAnalysisUrls: ['https://example.com/a'],
				websiteAnalysisSources: ['https://example.com/a']
			}
		})

		expect(output).toEqual({
			websiteAnalysis: 'Analyse',
			websiteAnalysisUrls: ['https://example.com/a'],
			websiteAnalysisSources: ['https://example.com/a']
		})
	})
})
