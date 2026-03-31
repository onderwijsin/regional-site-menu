import type { ReportData } from '~/composables/report/types'
import type { ReportConfig } from '~~/schema/reportConfig'

import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import {
	getEstimatedAnalysisDurationMs,
	getEstimatedBriefingDurationMs,
	useReportAi
} from '~/composables/report-ai'
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
	it('derives capped stage estimates for analysis and briefing', () => {
		expect(getEstimatedAnalysisDurationMs(1)).toBe(32_700)
		expect(getEstimatedAnalysisDurationMs(10)).toBe(64_200)
		expect(getEstimatedAnalysisDurationMs(50)).toBe(64_200)
		expect(getEstimatedBriefingDurationMs()).toBe(25_000)
		expect(getEstimatedAnalysisDurationMs(1, 0.5)).toBe(16_350)
		expect(getEstimatedBriefingDurationMs(1.5)).toBe(37_500)
	})

	it('runs analysis + briefing flow and marks progress stages as completed', async () => {
		vi.useFakeTimers()

		const fetchMock = vi.fn(async (url: string, options?: unknown) => {
			void options
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
		vi.stubGlobal('$fetch', fetchMock)

		const reportAi = useReportAi()
		const promise = reportAi.generateAiInsights(baseConfig, baseData)

		await vi.advanceTimersByTimeAsync(45_000)
		const result = await promise

		expect(result).toEqual({
			briefing: 'AI briefing',
			websiteAnalysis: 'Website analyse',
			websiteAnalysisUrls: ['https://example.com'],
			websiteAnalysisSources: ['https://example.com']
		})
		expect(trackAiInsightMock).toHaveBeenCalledWith({ tool: 'website_analysis' })
		expect(trackAiInsightMock).toHaveBeenCalledWith({ tool: 'briefing' })
		expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
			body: expect.objectContaining({
				url: 'https://example.com'
			})
		})
		expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
			body: expect.objectContaining({
				region: 'Utrecht'
			})
		})
		expect(reportAi.progress.value.length).toBeGreaterThan(0)
		expect(reportAi.progress.value[0]).toHaveProperty('details')
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
		await vi.advanceTimersByTimeAsync(45_000)
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
		await vi.advanceTimersByTimeAsync(45_000)
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

	it('passes an abort signal and aborts the active AI request', async () => {
		const fetchMock = vi.fn(
			async (_url: string, options?: { signal?: AbortSignal }) =>
				await new Promise((_resolve, reject) => {
					if (options?.signal?.aborted) {
						const abortError = new Error('aborted')
						abortError.name = 'AbortError'
						reject(abortError)
						return
					}

					options?.signal?.addEventListener('abort', () => {
						const abortError = new Error('aborted')
						abortError.name = 'AbortError'
						reject(abortError)
					})
				})
		)
		vi.stubGlobal('$fetch', fetchMock)

		const reportAi = useReportAi()
		const promise = reportAi.generateAiInsights(
			{
				...baseConfig,
				aiBriefing: false,
				aiWebsiteAnalysis: true
			},
			baseData
		)
		await Promise.resolve()

		const websiteAnalysisSignal = fetchMock.mock.calls[0]?.[1]?.signal as
			| AbortSignal
			| undefined
		expect(websiteAnalysisSignal).toBeDefined()

		reportAi.abortGeneration()
		expect(websiteAnalysisSignal?.aborted).toBe(true)
		await expect(promise).rejects.toMatchObject({
			name: 'ReportGenerationError',
			code: 'AI_WEBSITE_ANALYSIS_FAILED'
		})
	})
})
