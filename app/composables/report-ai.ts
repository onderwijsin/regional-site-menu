import type { AiWebsiteAnalysisResponse, ReportAiInsights } from '~~/schema/reportAi'
import type { ReportConfig } from '~~/schema/reportConfig'
import type { ReportData } from './report/types'

import { REPORT_AI_PROGRESS_CONFIG } from '@ai'
import {
	AI_WEBSITE_ANALYSIS_DEFAULT_PAGES,
	AiBriefingRequestSchema,
	AiBriefingResponseSchema,
	AiWebsiteAnalysisRequestSchema,
	AiWebsiteAnalysisResponseSchema
} from '~~/schema/reportAi'

import { ReportGenerationError } from './report/errors'

type AiProgressItemStatus = 'running' | 'completed'
type TurnstileAction = 'ai_briefing' | 'ai_website_analysis'

export type AiProgressItem = {
	id: string
	text: string
	reasoning: string
	status: AiProgressItemStatus
}

type AiProgressStageDefinition = {
	id: string
	text: string
	reasoning: string
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

const AI_PROGRESS_CONFIG: Record<'briefing', AiProgressScenario> = {
	briefing: {
		fastForwardMs: REPORT_AI_PROGRESS_CONFIG.briefingFastForwardMs,
		stages: [
			{
				id: 'briefing-start',
				text: 'AI-briefing starten...',
				reasoning:
					'De briefing-aanvraag wordt opgebouwd met auditresultaten en opgegeven context.',
				durationMs: REPORT_AI_PROGRESS_CONFIG.briefingStageDurationMs.start
			},
			{
				id: 'briefing-synthesis',
				text: 'Inzichten combineren...',
				reasoning:
					'Zelfevaluatie, opmerkingen en eventuele website-analyse worden samengebracht.',
				durationMs: REPORT_AI_PROGRESS_CONFIG.briefingStageDurationMs.synthesis
			},
			{
				id: 'briefing-generate',
				text: 'Briefing genereren...',
				reasoning:
					'De server genereert de briefing op basis van de verzamelde inzichten en context.',
				durationMs: REPORT_AI_PROGRESS_CONFIG.briefingStageDurationMs.generate
			},
			{
				id: 'briefing-finalize',
				text: 'Briefing afronden...',
				reasoning: 'De briefing wordt concreet geformuleerd voor gebruik in de rapportage.',
				durationMs: REPORT_AI_PROGRESS_CONFIG.briefingStageDurationMs.finalize
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
	const safeMaxPages = Math.max(maxPages ?? AI_WEBSITE_ANALYSIS_DEFAULT_PAGES, 1)
	return REPORT_AI_PROGRESS_CONFIG.crawlStageDurationPerPageMs * safeMaxPages
}

/**
 * Creates analysis progress configuration with dynamic crawl-stage timing.
 *
 * @param maxPages - Requested max pages for website analysis.
 * @returns Scenario with crawl stage duration adjusted to max pages.
 */
function createAnalysisProgressScenario(maxPages: number | undefined): AiProgressScenario {
	const crawlDurationMs = resolveAnalysisCrawlStageDurationMs(maxPages)

	return {
		fastForwardMs: REPORT_AI_PROGRESS_CONFIG.analysisFastForwardMs,
		stages: [
			{
				id: 'analysis-start',
				text: 'AI-analyse starten...',
				reasoning: 'De aanvraag wordt voorbereid en de websitegegevens worden gevalideerd.',
				durationMs: REPORT_AI_PROGRESS_CONFIG.analysisStageDurationMs.start
			},
			{
				id: 'analysis-crawl',
				text: "Websitepagina's verzamelen...",
				reasoning:
					'De server verzamelt relevante pagina’s van je website als context voor de analyse.',
				durationMs: crawlDurationMs
			},
			{
				id: 'analysis-interpret',
				text: 'Inhoud interpreteren...',
				reasoning:
					'De server interpreteert de verzamelde inhoud om inzichten te genereren.',
				durationMs: REPORT_AI_PROGRESS_CONFIG.analysisStageDurationMs.interpret
			},
			{
				id: 'analysis-criteria',
				text: 'Criteria toepassen op content...',
				reasoning: 'De verzamelde inhoud wordt getoetst aan de richtlijnen en criteria.',
				durationMs: REPORT_AI_PROGRESS_CONFIG.analysisStageDurationMs.criteria
			},
			{
				id: 'analysis-finalize',
				text: 'Website-analyse afronden...',
				reasoning:
					'De uitkomst wordt gestructureerd en klaargezet voor opname in het rapport.',
				durationMs: REPORT_AI_PROGRESS_CONFIG.analysisStageDurationMs.finalize
			}
		]
	}
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

export const useReportAi = (options?: {
	getTurnstileToken?: (action: TurnstileAction) => Promise<string | undefined> // eslint-disable-line no-unused-vars
}) => {
	const progress = ref<AiProgressItem[]>([])
	const { trackAiInsight } = useTracking()
	const getTurnstileToken =
		options?.getTurnstileToken ??
		(async (action: TurnstileAction): Promise<string | undefined> => {
			void action
			return undefined
		})

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
			reasoning: stage.reasoning,
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
	 * @param scenario - Stage scenario key.
	 * @param task - Async task.
	 * @returns Task result.
	 */
	async function runWithProgressScenario<T>(
		scenario: keyof typeof AI_PROGRESS_CONFIG | AiProgressScenario,
		task: () => Promise<T>
	): Promise<T> {
		const config = typeof scenario === 'string' ? AI_PROGRESS_CONFIG[scenario] : scenario
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
		let websiteAnalysis: string | undefined
		let websiteAnalysisUrls: string[] = []
		let websiteAnalysisSources: string[] = []

		// Stage 1: run website analysis first so we can reuse it in the briefing.
		if (config.aiWebsiteAnalysis && config.url) {
			let analysisResult: AiWebsiteAnalysisResponse
			try {
				analysisResult = await runWithProgressScenario(
					createAnalysisProgressScenario(config.maxPages),
					() => generateWebsiteAnalysis(config)
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
				briefing = await runWithProgressScenario('briefing', () =>
					generateBriefing(config, data, websiteAnalysis)
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
	}

	/**
	 * Calls the backend endpoint that generates a concrete implementation briefing.
	 *
	 * @param config - Report configuration from the form.
	 * @param data - Current report data.
	 * @param websiteAnalysisContext - Optional analysis text to include as context.
	 * @returns AI briefing markdown.
	 */
	async function generateBriefing(
		config: ReportConfig,
		data: ReportData,
		websiteAnalysisContext?: string
	): Promise<string> {
		const payload = createBriefingPayload(config, data, websiteAnalysisContext)
		const turnstileToken = await getTurnstileToken('ai_briefing')

		// Track only real endpoint usage, not UI toggle state.
		trackAiInsight({ tool: 'briefing' })

		const response = await $fetch('/api/ai/briefing', {
			method: 'POST',
			body: payload,
			headers: turnstileToken ? { 'x-turnstile-token': turnstileToken } : undefined
		})
		const parsed = AiBriefingResponseSchema.parse(response)

		return parsed.briefing
	}

	/**
	 * Calls the backend endpoint that analyses the target website against llms criteria.
	 *
	 * @param config - Report configuration from the form.
	 * @returns AI analysis markdown.
	 */
	async function generateWebsiteAnalysis(
		config: ReportConfig
	): Promise<AiWebsiteAnalysisResponse> {
		const payload = AiWebsiteAnalysisRequestSchema.parse({
			url: config.url,
			region: config.region,
			maxPages: config.maxPages
		})
		const turnstileToken = await getTurnstileToken('ai_website_analysis')

		// Track only real endpoint usage, not UI toggle state.
		trackAiInsight({ tool: 'website_analysis' })

		const response = await $fetch('/api/ai/website-analysis', {
			method: 'POST',
			body: payload,
			headers: turnstileToken ? { 'x-turnstile-token': turnstileToken } : undefined
		})
		const parsed = AiWebsiteAnalysisResponseSchema.parse(response)

		// Debug visibility in browser for prompt/result tuning.
		if (import.meta.client) {
			console.info('[AI] website-analysis result', parsed)
		}

		return parsed
	}

	return {
		generateAiInsights,
		progress
	}
}
