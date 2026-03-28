import type { ReportData } from '~/composables/report/types'
import type { ReportConfig } from '~~/schema/reportConfig'

import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useReportAi } from '~/composables/report-ai'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { trackAiInsightMock } = vi.hoisted(() => ({
	trackAiInsightMock: vi.fn()
}))

mockNuxtImport('useTracking', () => {
	return () => ({
		trackAiInsight: trackAiInsightMock
	})
})

const baseConfig: ReportConfig = {
	region: 'Utrecht',
	aiBriefing: true,
	aiWebsiteAnalysis: true,
	url: 'https://example.com',
	maxPages: 2,
	notes: 'Extra context'
}

const baseData: ReportData = {
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

afterEach(() => {
	vi.useRealTimers()
	trackAiInsightMock.mockReset()
})

describe('useReportAi', () => {
	it('runs analysis + briefing flow and marks progress stages as completed', async () => {
		vi.useFakeTimers()

		vi.stubGlobal(
			'$fetch',
			vi.fn(async (url: string) => {
				if (url === '/api/ai/website-analysis') {
					return {
						analysis: 'Website analyse',
						wordCount: 2,
						crawledPages: [{ url: 'https://example.com', title: 'Home' }],
						analysedPages: [{ url: 'https://example.com', title: 'Home' }],
						usedSources: ['https://example.com']
					}
				}

				return {
					briefing: 'AI briefing',
					wordCount: 2
				}
			})
		)

		const reportAi = useReportAi()
		const promise = reportAi.generateAiInsights(baseConfig, baseData)

		await vi.advanceTimersByTimeAsync(15_000)
		const result = await promise

		expect(result).toEqual({
			briefing: 'AI briefing',
			websiteAnalysis: 'Website analyse',
			websiteAnalysisUrls: ['https://example.com'],
			websiteAnalysisSources: ['https://example.com']
		})
		expect(trackAiInsightMock).toHaveBeenCalledWith({ tool: 'website_analysis' })
		expect(trackAiInsightMock).toHaveBeenCalledWith({ tool: 'briefing' })
		expect(reportAi.progress.value.length).toBeGreaterThan(0)
		expect(reportAi.progress.value.every((item) => item.status === 'completed')).toBe(true)
	})

	it('wraps website-analysis failures with AI_WEBSITE_ANALYSIS_FAILED', async () => {
		vi.useFakeTimers()
		vi.stubGlobal(
			'$fetch',
			vi.fn(async (url: string) => {
				if (url === '/api/ai/website-analysis') {
					throw new Error('analysis failed')
				}

				return {
					briefing: 'AI briefing',
					wordCount: 2
				}
			})
		)

		const reportAi = useReportAi()
		const promise = reportAi.generateAiInsights(baseConfig, baseData)
		const expectation = expect(promise).rejects.toMatchObject({
			name: 'ReportGenerationError',
			code: 'AI_WEBSITE_ANALYSIS_FAILED'
		})
		await vi.advanceTimersByTimeAsync(15_000)
		await expectation
	})

	it('wraps briefing failures with AI_BRIEFING_FAILED', async () => {
		vi.useFakeTimers()
		vi.stubGlobal(
			'$fetch',
			vi.fn(async (url: string) => {
				if (url === '/api/ai/briefing') {
					throw new Error('briefing failed')
				}

				return {
					analysis: 'Website analyse',
					wordCount: 2,
					crawledPages: [{ url: 'https://example.com', title: 'Home' }],
					analysedPages: [{ url: 'https://example.com', title: 'Home' }],
					usedSources: ['https://example.com']
				}
			})
		)

		const reportAi = useReportAi()
		const promise = reportAi.generateAiInsights(
			{
				...baseConfig,
				aiWebsiteAnalysis: false
			},
			baseData
		)
		const expectation = expect(promise).rejects.toMatchObject({
			name: 'ReportGenerationError',
			code: 'AI_BRIEFING_FAILED'
		})
		await vi.advanceTimersByTimeAsync(15_000)
		await expectation
	})

	it('returns empty insights when AI toggles are disabled', async () => {
		const fetchSpy = vi.fn()
		vi.stubGlobal('$fetch', fetchSpy)

		const reportAi = useReportAi()
		const result = await reportAi.generateAiInsights(
			{
				...baseConfig,
				aiWebsiteAnalysis: false,
				aiBriefing: false
			},
			baseData
		)

		expect(result).toEqual({
			briefing: undefined,
			websiteAnalysis: undefined,
			websiteAnalysisUrls: [],
			websiteAnalysisSources: []
		})
		expect(fetchSpy).not.toHaveBeenCalled()
		expect(trackAiInsightMock).not.toHaveBeenCalled()
		expect(reportAi.progress.value).toEqual([])
	})

	it('keeps final progress stage running until long-running task settles', async () => {
		vi.useFakeTimers()
		vi.stubGlobal(
			'$fetch',
			vi.fn(async () => {
				await new Promise((resolve) => {
					setTimeout(resolve, 30_000)
				})

				return {
					briefing: 'Langzame briefing',
					wordCount: 2
				}
			})
		)

		const reportAi = useReportAi()
		const pendingPromise = reportAi.generateAiInsights(
			{
				...baseConfig,
				aiWebsiteAnalysis: false,
				aiBriefing: true
			},
			baseData
		)

		await vi.advanceTimersByTimeAsync(20_000)
		expect(reportAi.progress.value.length).toBeGreaterThan(0)
		expect(reportAi.progress.value.at(-1)?.status).toBe('running')

		await vi.advanceTimersByTimeAsync(20_000)
		await pendingPromise
		expect(reportAi.progress.value.every((item) => item.status === 'completed')).toBe(true)
	})
})
