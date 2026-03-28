import type { ReportAiInsights } from '~~/schema/reportAi'
import type { ReportConfig } from '~~/schema/reportConfig'

import { useReportGenerationExecution } from '~/composables/report-generation-execution'
import { ReportGenerationError } from '~/composables/report/errors'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'

const { toastAddMock } = vi.hoisted(() => ({
	toastAddMock: vi.fn()
}))

function createState(overrides: Partial<ReportConfig> = {}): ReportConfig {
	return {
		region: 'Utrecht',
		aiBriefing: false,
		aiWebsiteAnalysis: false,
		url: 'https://example.com',
		maxPages: 2,
		notes: '',
		...overrides
	}
}

function createExecution(
	overrides: {
		state?: ReportConfig
		hasAiEnabled?: boolean
		hasReusableAiInsights?: boolean
		generateAiInsightsResult?: ReportAiInsights
		generateAiInsightsError?: unknown
		generateReportError?: unknown
	} = {}
) {
	const state = overrides.state ?? createState()
	const stage = ref<'config' | 'ai-loading' | 'briefing-review'>('config')
	const aiInsights = ref<ReportAiInsights | undefined>({
		briefing: 'Bestaande briefing'
	})
	const aiInsightsInputSignature = ref<string | undefined>('old-signature')
	const briefingDraft = ref('oude briefing')
	const isAiLoading = ref(false)
	const isGeneratingPdf = ref(false)
	const currentAiInputSignature = computed(() => 'signature:new')

	const generateReportMock =
		overrides.generateReportError !== undefined
			? vi.fn().mockRejectedValue(overrides.generateReportError)
			: vi.fn().mockResolvedValue(undefined)

	const generateAiInsightsMock =
		overrides.generateAiInsightsError !== undefined
			? vi.fn().mockRejectedValue(overrides.generateAiInsightsError)
			: vi.fn().mockResolvedValue(overrides.generateAiInsightsResult ?? {})

	const trackReportGeneratedMock = vi.fn()
	const onCloseMock = vi.fn()
	const getFinalAiInsightsMock = vi.fn(() => aiInsights.value)

	const flow = useReportGenerationExecution({
		state,
		data: {
			averages: [],
			audits: [
				{
					id: 'item-1',
					score: 7,
					comment: 'Sterk',
					item: {
						id: 'item-1',
						title: 'Homepage',
						pillar: 'Inzicht & Overzicht',
						priority: 'Must have',
						goals: ['Informeren'],
						description: 'Beschrijving'
					} as never
				}
			]
		},
		stage,
		aiInsights,
		aiInsightsInputSignature,
		briefingDraft,
		isAiLoading,
		isGeneratingPdf,
		hasAiEnabled: computed(() => overrides.hasAiEnabled ?? false),
		hasReusableAiInsights: computed(() => overrides.hasReusableAiInsights ?? false),
		currentAiInputSignature,
		getFinalAiInsights: getFinalAiInsightsMock,
		generateReport: generateReportMock,
		generateAiInsights: generateAiInsightsMock,
		trackReportGenerated: trackReportGeneratedMock,
		onClose: onCloseMock
	})

	return {
		flow,
		state,
		stage,
		aiInsights,
		aiInsightsInputSignature,
		briefingDraft,
		isAiLoading,
		isGeneratingPdf,
		generateReportMock,
		generateAiInsightsMock,
		trackReportGeneratedMock,
		onCloseMock
	}
}

describe('useReportGenerationExecution', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
		toastAddMock.mockReset()
		vi.stubGlobal('useToast', () => ({
			add: toastAddMock
		}))
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('generates PDF directly when AI is disabled', async () => {
		const { flow, state, generateReportMock, trackReportGeneratedMock, onCloseMock } =
			createExecution()

		await flow.handleConfigSubmit()

		expect(generateReportMock).toHaveBeenCalledWith(state, {
			averages: [],
			audits: expect.any(Array),
			aiInsights: expect.objectContaining({ briefing: 'Bestaande briefing' })
		})
		expect(trackReportGeneratedMock).toHaveBeenCalledWith({ scoredElementsCount: 1 })
		expect(onCloseMock).toHaveBeenCalledTimes(1)
		expect(toastAddMock).not.toHaveBeenCalled()
	})

	it('shows reusable-briefing stage when AI insights can be reused', async () => {
		const state = createState({ aiBriefing: true, aiWebsiteAnalysis: true })
		const { flow, stage, generateAiInsightsMock, generateReportMock } = createExecution({
			state,
			hasAiEnabled: true,
			hasReusableAiInsights: true
		})

		await flow.handleConfigSubmit()

		expect(stage.value).toBe('briefing-review')
		expect(generateAiInsightsMock).not.toHaveBeenCalled()
		expect(generateReportMock).not.toHaveBeenCalled()
	})

	it('maps report-generation errors to user-facing toasts', async () => {
		const state = createState({ aiBriefing: false, aiWebsiteAnalysis: true })
		const { flow } = createExecution({
			state,
			hasAiEnabled: true,
			hasReusableAiInsights: true,
			generateReportError: new ReportGenerationError('AI_BRIEFING_FAILED', new Error('boom'))
		})

		await flow.handleConfigSubmit()

		expect(toastAddMock).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Rapport genereren mislukt',
				description: 'Het lukte niet om een briefing te genereren',
				color: 'error',
				icon: 'lucide:triangle-alert'
			})
		)
	})

	it('runs AI flow and moves to briefing review when briefing is returned', async () => {
		const state = createState({ aiBriefing: true, aiWebsiteAnalysis: true })
		const generatedInsights: ReportAiInsights = {
			briefing: 'Nieuwe briefing',
			websiteAnalysis: 'Analyse tekst'
		}

		const {
			flow,
			stage,
			aiInsights,
			aiInsightsInputSignature,
			briefingDraft,
			isAiLoading,
			generateReportMock
		} = createExecution({
			state,
			hasAiEnabled: true,
			generateAiInsightsResult: generatedInsights
		})

		await flow.startAiGenerationFlow()

		expect(stage.value).toBe('briefing-review')
		expect(aiInsights.value).toEqual(generatedInsights)
		expect(aiInsightsInputSignature.value).toBe('signature:new')
		expect(briefingDraft.value).toBe('Nieuwe briefing')
		expect(isAiLoading.value).toBe(false)
		expect(generateReportMock).not.toHaveBeenCalled()
	})

	it('runs AI flow and continues to PDF generation when briefing is disabled', async () => {
		const state = createState({ aiBriefing: false, aiWebsiteAnalysis: true })

		const { flow, generateReportMock, onCloseMock, trackReportGeneratedMock, isAiLoading } =
			createExecution({
				state,
				hasAiEnabled: true,
				generateAiInsightsResult: {
					websiteAnalysis: 'Analyse'
				}
			})

		await flow.startAiGenerationFlow()

		expect(generateReportMock).toHaveBeenCalledTimes(1)
		expect(trackReportGeneratedMock).toHaveBeenCalledWith({ scoredElementsCount: 1 })
		expect(onCloseMock).toHaveBeenCalledTimes(1)
		expect(isAiLoading.value).toBe(false)
	})

	it('returns to config and shows AI-specific error when AI generation fails', async () => {
		const state = createState({ aiBriefing: true, aiWebsiteAnalysis: true })
		const { flow, stage, isAiLoading } = createExecution({
			state,
			hasAiEnabled: true,
			generateAiInsightsError: new ReportGenerationError(
				'AI_WEBSITE_ANALYSIS_FAILED',
				new Error('crawl failed')
			)
		})

		await flow.startAiGenerationFlow()

		expect(stage.value).toBe('config')
		expect(isAiLoading.value).toBe(false)
		expect(toastAddMock).toHaveBeenCalledWith(
			expect.objectContaining({
				description: 'Het lukte niet op de opgegeven website te analyseren'
			})
		)
	})

	it('shows error toast when briefing submit PDF generation fails', async () => {
		const { flow } = createExecution({
			generateReportError: new Error('pdf failed')
		})

		await flow.handleBriefingSubmit()

		expect(toastAddMock).toHaveBeenCalledWith(
			expect.objectContaining({
				description: 'Het lukte niet om je audit te verwerken'
			})
		)
	})

	it('runs AI generation from config submit when AI is enabled and insights are not reusable', async () => {
		const state = createState({ aiBriefing: true, aiWebsiteAnalysis: true })
		const { flow, generateAiInsightsMock } = createExecution({
			state,
			hasAiEnabled: true,
			hasReusableAiInsights: false,
			generateAiInsightsResult: {
				briefing: 'Nieuwe briefing'
			}
		})

		await flow.handleConfigSubmit()

		expect(generateAiInsightsMock).toHaveBeenCalledTimes(1)
	})

	it('uses default ReportGenerationError copy for non-AI-specific error codes', async () => {
		const { flow } = createExecution({
			generateReportError: new ReportGenerationError(
				'REPORT_GENERATION_FAILED',
				new Error('pdf failed')
			)
		})

		await flow.handleConfigSubmit()

		expect(toastAddMock).toHaveBeenCalledWith(
			expect.objectContaining({
				description: 'Het lukte niet om je audit te verwerken'
			})
		)
	})
})
