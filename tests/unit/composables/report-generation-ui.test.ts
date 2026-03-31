import {
	formatReportGenerationDurationRangeLabel,
	getReportAiEstimatedDurationLabel,
	getReportGenerationStageMeta
} from '~/composables/report-generation-ui'
import { describe, expect, it } from 'vitest'

describe('report-generation-ui helpers', () => {
	it('returns stage metadata per known stage', () => {
		expect(getReportGenerationStageMeta('config').title).toBe('Genereer rapportage')
		expect(getReportGenerationStageMeta('ai-loading').title).toBe('AI-inzichten genereren')
		expect(getReportGenerationStageMeta('briefing-review').title).toBe('Controleer AI-briefing')
	})

	it('formats duration labels with bounded minute ranges', () => {
		expect(formatReportGenerationDurationRangeLabel(10_000)).toBe('minder dan 1 minuut')
		expect(formatReportGenerationDurationRangeLabel(60_000)).toBe('ongeveer 1-2 minuten')
		expect(formatReportGenerationDurationRangeLabel(4 * 60_000)).toBe('ongeveer 3-5 minuten')
	})

	it('returns unknown duration when AI is disabled', () => {
		expect(
			getReportAiEstimatedDurationLabel({
				region: 'Regio',
				aiBriefing: false,
				aiWebsiteAnalysis: false,
				notes: '',
				maxPages: 5
			})
		).toBe('onbekend')
	})

	it('returns estimated duration label when AI is enabled', () => {
		expect(
			getReportAiEstimatedDurationLabel({
				region: 'Regio',
				aiBriefing: true,
				aiWebsiteAnalysis: false,
				notes: '',
				maxPages: 5
			})
		).not.toBe('onbekend')
	})
})
