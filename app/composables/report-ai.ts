import type { AiWebsiteAnalysisResponse, ReportAiInsights } from '~~/schema/reportAi'
import type { ReportConfig } from '~~/schema/reportConfig'
import type { ReportData } from './report/types'

import { REPORT_AI_PROGRESS_CONFIG } from '@ai'
import { SECURITY_HEADERS } from '@constants'
import {
	AI_WEBSITE_ANALYSIS_DEFAULT_PAGES,
	AiBriefingRequestSchema,
	AiBriefingResponseSchema,
	AiWebsiteAnalysisRequestSchema,
	AiWebsiteAnalysisResponseSchema
} from '~~/schema/reportAi'

import { ReportGenerationError } from './report/errors'

type AiProgressItemStatus = 'running' | 'completed'

export type AiProgressItem = {
	id: string
	text: string
	details: string
	status: AiProgressItemStatus
}

type AiProgressStageDefinition = {
	id: string
	text: string
	details: string
	/**
	 * Preferred visible duration for this stage while the async task is pending.
	 */
	durationMs: number
}

type AiProgressScenario = {
	/**
	 * Ordered list of visual progress stages.
	 *
	 * Add/remove/reorder stages here to tune UX timing and step granularity.
	 */
	stages: AiProgressStageDefinition[]
	/**
	 * Speed used to quickly finish remaining stages when the underlying task has
	 * already completed earlier than expected.
	 */
	fastForwardMs: number
}

/**
 * Normalizes timing multiplier values used for staged progress and ETA hints.
 *
 * @param value - Raw multiplier value from runtime config.
 * @returns Safe multiplier (defaults to 1).
 */
export function resolveReportAiTimingMultiplier(value: unknown): number {
	const parsed = typeof value === 'number' ? value : Number(value)
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return 1
	}

	return parsed
}

/**
 * Scales one stage duration using the configured timing multiplier.
 *
 * @param durationMs - Baseline duration in milliseconds.
 * @param timingMultiplier - Global timing multiplier.
 * @returns Scaled duration in milliseconds.
 */
function scaleStageDurationMs(durationMs: number, timingMultiplier: number): number {
	return Math.max(1, Math.round(durationMs * timingMultiplier))
}

function createBriefingProgressScenario(timingMultiplier: number = 1): AiProgressScenario {
	return {
		fastForwardMs: scaleStageDurationMs(
			REPORT_AI_PROGRESS_CONFIG.briefingFastForwardMs,
			timingMultiplier
		),
		stages: [
			{
				id: 'briefing-start',
				text: 'AI-briefing starten...',
				details:
					'De briefing-aanvraag wordt opgebouwd met auditresultaten en opgegeven context.',
				durationMs: scaleStageDurationMs(
					REPORT_AI_PROGRESS_CONFIG.briefingStageDurationMs.start,
					timingMultiplier
				)
			},
			{
				id: 'briefing-synthesis',
				text: 'Inzichten combineren...',
				details:
					'Zelfevaluatie, opmerkingen en eventuele website-analyse worden samengebracht.',
				durationMs: scaleStageDurationMs(
					REPORT_AI_PROGRESS_CONFIG.briefingStageDurationMs.synthesis,
					timingMultiplier
				)
			},
			{
				id: 'briefing-generate',
				text: 'Briefing genereren...',
				details:
					'De server genereert de briefing op basis van de verzamelde inzichten en context.',
				durationMs: scaleStageDurationMs(
					REPORT_AI_PROGRESS_CONFIG.briefingStageDurationMs.generate,
					timingMultiplier
				)
			},
			{
				id: 'briefing-finalize',
				text: 'Briefing afronden...',
				details: 'De briefing wordt concreet geformuleerd voor gebruik in de rapportage.',
				durationMs: scaleStageDurationMs(
					REPORT_AI_PROGRESS_CONFIG.briefingStageDurationMs.finalize,
					timingMultiplier
				)
			}
		]
	}
}

/**
 * Resolves the crawl stage duration based on requested crawl depth.
 *
 * @param maxPages - Requested max pages for website analysis.
 * @returns Duration in milliseconds for the crawl stage.
 */
function resolveAnalysisCrawlStageDurationMs(maxPages: number | undefined): number {
	const safeMaxPages = Math.max(
		1,
		Math.min(
			maxPages ?? AI_WEBSITE_ANALYSIS_DEFAULT_PAGES,
			REPORT_AI_PROGRESS_CONFIG.crawlStageDurationScalePages
		)
	)
	return Math.min(
		REPORT_AI_PROGRESS_CONFIG.crawlStageBaseDurationMs +
			REPORT_AI_PROGRESS_CONFIG.crawlStageDurationPerPageMs * safeMaxPages,
		REPORT_AI_PROGRESS_CONFIG.crawlStageMaxDurationMs
	)
}

/**
 * Resolves additional model-processing duration for larger analysis contexts.
 *
 * This captures the practical behavior that model latency grows with more
 * crawled evidence, but flattens after a certain depth.
 *
 * @param maxPages - Requested max pages for website analysis.
 * @returns Extra duration in milliseconds added to the interpret stage.
 */
function resolveAnalysisModelDurationBoostMs(maxPages: number | undefined): number {
	const safeMaxPages = Math.max(
		1,
		Math.min(
			maxPages ?? AI_WEBSITE_ANALYSIS_DEFAULT_PAGES,
			REPORT_AI_PROGRESS_CONFIG.analysisModelDurationScalePages
		)
	)
	const additionalPages = Math.max(safeMaxPages - 1, 0)
	return additionalPages * REPORT_AI_PROGRESS_CONFIG.analysisModelDurationPerAdditionalPageMs
}

/**
 * Creates analysis progress configuration with dynamic crawl-stage timing.
 *
 * @param maxPages - Requested max pages for website analysis.
 * @param timingMultiplier - Global timing multiplier applied to stage durations.
 * @returns Scenario with crawl stage duration adjusted to max pages.
 */
function createAnalysisProgressScenario(
	maxPages: number | undefined,
	timingMultiplier: number = 1
): AiProgressScenario {
	const crawlDurationMs = resolveAnalysisCrawlStageDurationMs(maxPages)
	const modelDurationBoostMs = resolveAnalysisModelDurationBoostMs(maxPages)

	return {
		fastForwardMs: scaleStageDurationMs(
			REPORT_AI_PROGRESS_CONFIG.analysisFastForwardMs,
			timingMultiplier
		),
		stages: [
			{
				id: 'analysis-start',
				text: 'AI-analyse starten...',
				details: 'De aanvraag wordt voorbereid en de websitegegevens worden gevalideerd.',
				durationMs: scaleStageDurationMs(
					REPORT_AI_PROGRESS_CONFIG.analysisStageDurationMs.start,
					timingMultiplier
				)
			},
			{
				id: 'analysis-crawl',
				text: "Websitepagina's verzamelen...",
				details:
					'De server verzamelt relevante pagina’s van je website als context voor de analyse.',
				durationMs: scaleStageDurationMs(crawlDurationMs, timingMultiplier)
			},
			{
				id: 'analysis-interpret',
				text: 'Inhoud interpreteren...',
				details: 'De server interpreteert de verzamelde inhoud om inzichten te genereren.',
				durationMs: scaleStageDurationMs(
					REPORT_AI_PROGRESS_CONFIG.analysisStageDurationMs.interpret +
						modelDurationBoostMs,
					timingMultiplier
				)
			},
			{
				id: 'analysis-criteria',
				text: 'Criteria toepassen op content...',
				details: 'De verzamelde inhoud wordt getoetst aan de richtlijnen en criteria.',
				durationMs: scaleStageDurationMs(
					REPORT_AI_PROGRESS_CONFIG.analysisStageDurationMs.criteria,
					timingMultiplier
				)
			},
			{
				id: 'analysis-finalize',
				text: 'Website-analyse afronden...',
				details:
					'De uitkomst wordt gestructureerd en klaargezet voor opname in het rapport.',
				durationMs: scaleStageDurationMs(
					REPORT_AI_PROGRESS_CONFIG.analysisStageDurationMs.finalize,
					timingMultiplier
				)
			}
		]
	}
}

/**
 * Sums stage durations in one scenario.
 *
 * @param scenario - Progress scenario.
 * @returns Total duration in milliseconds.
 */
function sumScenarioDurationMs(scenario: AiProgressScenario): number {
	return scenario.stages.reduce((total, stage) => total + stage.durationMs, 0)
}

/**
 * Returns estimated analysis duration from the same scenario used for staged UI progress.
 *
 * @param maxPages - Requested max pages for website analysis.
 * @param timingMultiplier - Global timing multiplier applied to stage durations.
 * @returns Estimated duration in milliseconds.
 */
export function getEstimatedAnalysisDurationMs(
	maxPages: number | undefined,
	timingMultiplier: number = 1
): number {
	return sumScenarioDurationMs(
		createAnalysisProgressScenario(maxPages, resolveReportAiTimingMultiplier(timingMultiplier))
	)
}

/**
 * Returns estimated briefing duration from the same scenario used for staged UI progress.
 *
 * @param timingMultiplier - Global timing multiplier applied to stage durations.
 * @returns Estimated duration in milliseconds.
 */
export function getEstimatedBriefingDurationMs(timingMultiplier: number = 1): number {
	return sumScenarioDurationMs(
		createBriefingProgressScenario(resolveReportAiTimingMultiplier(timingMultiplier))
	)
}

/**
 * Sleep helper used by staged progress timing.
 *
 * @param ms - Delay in milliseconds.
 * @returns Promise that resolves after the delay.
 */
function wait(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms)
	})
}

/**
 * Normalizes the report form + audits into the briefing endpoint payload.
 *
 * @param config - Report configuration from the form.
 * @param data - Current report data.
 * @param websiteAnalysisContext - Optional analysis text that should be reused in briefing generation.
 * @returns Validated briefing request payload.
 */
function createBriefingPayload(
	config: ReportConfig,
	data: ReportData,
	websiteAnalysisContext?: string
) {
	return AiBriefingRequestSchema.parse({
		region: config.region,
		regionGoals: [...new Set(data.audits.flatMap((audit) => audit.item.goals))],
		chosenComponents: data.audits.map((audit) => ({
			id: audit.id,
			title: audit.item.title,
			pillar: audit.item.pillar,
			goals: audit.item.goals,
			priority: audit.item.priority,
			description: audit.item.description,
			score: audit.score ?? null,
			comment: audit.comment
		})),
		extraContext: config.notes.trim() ? config.notes : undefined,
		websiteAnalysisContext
	})
}

/**
 * Provides report AI actions and staged progress state for UI feedback.
 *
 * @param options - Optional hooks for Turnstile token retrieval and consume lifecycle.
 * @returns AI generation actions, progress state, and progress reset helper.
 */
export const useReportAi = (options?: {
	getTurnstileToken?: () => Promise<string | undefined>
	onTurnstileConsumed?: () => void
}) => {
	const progress = ref<AiProgressItem[]>([])
	const activeRequestController = ref<AbortController>()
	const { trackAiInsight } = useTracking()
	const runtimeConfig = useRuntimeConfig()
	const timingMultiplier = resolveReportAiTimingMultiplier(
		runtimeConfig.public?.ai?.timingMultiplier
	)

	/**
	 * Retrieves the Turnstile token for the current request.
	 * @returns Turnstile token or undefined if not available.
	 */
	const getTurnstileToken =
		options?.getTurnstileToken ??
		(async (): Promise<string | undefined> => {
			return undefined
		})

	/**
	 * Aborts the currently running AI generation request, if any.
	 *
	 * @returns Nothing.
	 */
	function abortGeneration(): void {
		activeRequestController.value?.abort()
	}

	/**
	 * Adds one progress item in running state.
	 *
	 * @param stage - Stage metadata.
	 * @returns Index of the inserted progress entry.
	 */
	function pushProgressStage(stage: AiProgressStageDefinition): number {
		progress.value.push({
			id: `${stage.id}-${progress.value.length + 1}`,
			text: stage.text,
			details: stage.details,
			status: 'running'
		})

		return progress.value.length - 1
	}

	/**
	 * Marks a previously inserted progress entry as completed.
	 *
	 * @param index - Progress entry index.
	 * @returns Nothing.
	 */
	function completeProgressStage(index: number): void {
		const item = progress.value[index]
		if (!item) {
			return
		}

		item.status = 'completed'
	}

	/**
	 * Runs one async task with configurable staged progress.
	 *
	 * Behavior:
	 * - While task is pending, stages are shown using configured durations.
	 * - If task completes early, remaining stages are fast-forwarded sequentially.
	 *
	 * @param scenario - Stage scenario metadata with ordered progress steps.
	 * @param task - Async task.
	 * @returns Task result.
	 */
	async function runWithProgressScenario<T>(
		scenario: AiProgressScenario,
		task: () => Promise<T>
	): Promise<T> {
		const config = scenario
		if (config.stages.length === 0) {
			return await task()
		}

		let taskResult: T | undefined
		let taskError: unknown
		let taskSettled = false

		const taskPromise = task()
			.then((result) => {
				taskResult = result
			})
			.catch((error: unknown) => {
				taskError = error
			})
			.finally(() => {
				taskSettled = true
			})

		const taskSettledPromise = taskPromise.then(() => 'task_settled' as const)

		let stageIndex = 0
		let activeProgressIndex = pushProgressStage(config.stages[stageIndex]!)
		let stageStartedAt = Date.now()

		while (!taskSettled) {
			const activeStage = config.stages[stageIndex]
			if (!activeStage) {
				break
			}

			const elapsedMs = Date.now() - stageStartedAt
			const waitMs = Math.max(activeStage.durationMs - elapsedMs, 0)
			const raceResult = await Promise.race([
				wait(waitMs).then(() => 'timer_elapsed' as const),
				taskSettledPromise
			])

			if (raceResult === 'task_settled') {
				break
			}

			if (stageIndex < config.stages.length - 1) {
				completeProgressStage(activeProgressIndex)
				stageIndex += 1
				activeProgressIndex = pushProgressStage(config.stages[stageIndex]!)
				stageStartedAt = Date.now()
				continue
			}

			// Keep the final stage active until the task truly settles.
			// We intentionally do not mark it as completed here.
			stageStartedAt = Date.now()
		}

		await taskPromise

		completeProgressStage(activeProgressIndex)

		if (taskError) {
			throw taskError
		}

		// Fast-forward any stages not yet shown when task finishes early.
		// This is intentionally success-only so failed runs do not look complete.
		for (let nextIndex = stageIndex + 1; nextIndex < config.stages.length; nextIndex += 1) {
			const nextStage = config.stages[nextIndex]!
			const insertedIndex = pushProgressStage(nextStage)
			await wait(config.fastForwardMs)
			completeProgressStage(insertedIndex)
		}

		return taskResult as T
	}

	/**
	 * Generates AI insights in a staged flow:
	 * 1) Website analysis
	 * 2) Briefing (with analysis context)
	 *
	 * @param config - Report configuration from the form.
	 * @param data - Current report data.
	 * @returns Partial AI insights for PDF rendering.
	 */
	async function generateAiInsights(
		config: ReportConfig,
		data: ReportData
	): Promise<ReportAiInsights> {
		progress.value = []
		const requestController = new AbortController()
		activeRequestController.value = requestController
		let websiteAnalysis: string | undefined
		let websiteAnalysisUrls: string[] = []
		let websiteAnalysisSources: string[] = []

		try {
			// Stage 1: run website analysis first so we can reuse it in the briefing.
			if (config.aiWebsiteAnalysis && config.url) {
				let analysisResult: AiWebsiteAnalysisResponse
				try {
					analysisResult = await runWithProgressScenario(
						createAnalysisProgressScenario(config.maxPages, timingMultiplier),
						() => generateWebsiteAnalysis(config, requestController.signal)
					)
				} catch (error: unknown) {
					throw new ReportGenerationError('AI_WEBSITE_ANALYSIS_FAILED', error)
				}

				websiteAnalysis = analysisResult.analysis
				websiteAnalysisUrls = analysisResult.analysedPages.map((page) => page.url)
				websiteAnalysisSources = analysisResult.usedSources
			}

			// Stage 2: create briefing, optionally enriched with analysis context.
			let briefing: string | undefined
			if (config.aiBriefing) {
				try {
					briefing = await runWithProgressScenario(
						createBriefingProgressScenario(timingMultiplier),
						() =>
							generateBriefing(
								config,
								data,
								websiteAnalysis,
								requestController.signal
							)
					)
				} catch (error: unknown) {
					throw new ReportGenerationError('AI_BRIEFING_FAILED', error)
				}
			}

			return {
				briefing,
				websiteAnalysis,
				websiteAnalysisUrls,
				websiteAnalysisSources
			}
		} finally {
			if (activeRequestController.value === requestController) {
				activeRequestController.value = undefined
			}
		}
	}

	/**
	 * Calls the backend endpoint that generates a concrete implementation briefing.
	 *
	 * @param config - Report configuration from the form.
	 * @param data - Current report data.
	 * @param websiteAnalysisContext - Optional analysis text to include as context.
	 * @param signal - Abort signal for early cancellation.
	 * @returns AI briefing markdown.
	 */
	async function generateBriefing(
		config: ReportConfig,
		data: ReportData,
		websiteAnalysisContext?: string,
		signal?: AbortSignal
	): Promise<string> {
		const payload = createBriefingPayload(config, data, websiteAnalysisContext)
		const turnstileToken = await getTurnstileToken()

		// Track only real endpoint usage, not UI toggle state.
		trackAiInsight({ tool: 'briefing' })

		try {
			const response = await $fetch('/api/ai/briefing', {
				method: 'POST',
				body: payload,
				signal,
				headers: turnstileToken
					? { [SECURITY_HEADERS.turnstileToken]: turnstileToken }
					: undefined
			})
			const parsed = AiBriefingResponseSchema.parse(response)

			return parsed.briefing
		} finally {
			if (turnstileToken) {
				options?.onTurnstileConsumed?.()
			}
		}
	}

	/**
	 * Calls the backend endpoint that analyses the target website against llms criteria.
	 *
	 * @param config - Report configuration from the form.
	 * @param signal - Abort signal for early cancellation.
	 * @returns AI analysis markdown.
	 */
	async function generateWebsiteAnalysis(
		config: ReportConfig,
		signal?: AbortSignal
	): Promise<AiWebsiteAnalysisResponse> {
		const payload = AiWebsiteAnalysisRequestSchema.parse({
			url: config.url,
			region: config.region,
			maxPages: config.maxPages
		})
		const turnstileToken = await getTurnstileToken()

		// Track only real endpoint usage, not UI toggle state.
		trackAiInsight({ tool: 'website_analysis' })

		try {
			const response = await $fetch('/api/ai/website-analysis', {
				method: 'POST',
				body: payload,
				signal,
				headers: turnstileToken
					? { [SECURITY_HEADERS.turnstileToken]: turnstileToken }
					: undefined
			})
			const parsed = AiWebsiteAnalysisResponseSchema.parse(response)

			// Debug visibility in browser for prompt/result tuning.
			if (import.meta.client) {
				console.info('[AI] website-analysis result', parsed)
			}

			return parsed
		} finally {
			if (turnstileToken) {
				options?.onTurnstileConsumed?.()
			}
		}
	}

	return {
		generateAiInsights,
		progress,
		abortGeneration
	}
}
