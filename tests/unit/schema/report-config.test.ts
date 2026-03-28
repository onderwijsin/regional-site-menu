import { AI_WEBSITE_ANALYSIS_MAX_PAGES, AI_WEBSITE_ANALYSIS_MIN_PAGES } from '~~/schema/reportAi'
import { ReportConfigSchema } from '~~/schema/reportConfig'
import { describe, expect, it } from 'vitest'

const baseConfig = {
	region: 'Amsterdam',
	aiBriefing: false,
	aiWebsiteAnalysis: false,
	notes: ''
}

describe('ReportConfigSchema', () => {
	it('accepts config without URL when website analysis is disabled', () => {
		const result = ReportConfigSchema.safeParse(baseConfig)
		expect(result.success).toBe(true)
	})

	it('requires URL when website analysis is enabled', () => {
		const result = ReportConfigSchema.safeParse({
			...baseConfig,
			aiWebsiteAnalysis: true
		})

		expect(result.success).toBe(false)
		expect(result.error?.issues[0]?.path).toEqual(['url'])
	})

	it('enforces maxPages bounds', () => {
		const belowMin = ReportConfigSchema.safeParse({
			...baseConfig,
			maxPages: AI_WEBSITE_ANALYSIS_MIN_PAGES - 1
		})
		const aboveMax = ReportConfigSchema.safeParse({
			...baseConfig,
			maxPages: AI_WEBSITE_ANALYSIS_MAX_PAGES + 1
		})

		expect(belowMin.success).toBe(false)
		expect(aboveMax.success).toBe(false)
	})
})
