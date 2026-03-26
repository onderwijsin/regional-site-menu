import type { AiWebsiteAnalysisResponse, ReportAiInsights } from '~~/schema/reportAi'
import type { ReportConfig } from '~~/schema/reportConfig'
import type { ReportData } from './report/types'

import {
	AiBriefingRequestSchema,
	AiBriefingResponseSchema,
	AiWebsiteAnalysisRequestSchema,
	AiWebsiteAnalysisResponseSchema,
} from '~~/schema/reportAi'

import { ReportGenerationError } from './report/errors'

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
	websiteAnalysisContext?: string,
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
			comment: audit.comment,
		})),
		extraContext: config.notes.trim() ? config.notes : undefined,
		websiteAnalysisContext,
	})
}

export const useReportAi = () => {
	const progress = ref<string[]>([])
	const { trackAiInsight } = useTracking()

	/**
	 * Adds a progress line for staged AI generation.
	 *
	 * @param message - User-facing progress message.
	 * @returns Nothing.
	 */
	function pushProgress(message: string): void {
		progress.value.push(message)
	}

	/**
	 * Runs an async task while appending predefined progress messages over time.
	 *
	 * @param states - Ordered progress states.
	 * @param task - Async task to execute.
	 * @param intervalMs - Interval between state updates while pending.
	 * @returns Task result.
	 */
	async function runWithProgress<T>(
		states: string[],
		task: () => Promise<T>,
		intervalMs = 1800,
	): Promise<T> {
		if (states.length > 0) {
			pushProgress(states[0]!)
		}

		let stateIndex = 1
		const timer = setInterval(() => {
			if (stateIndex >= states.length) {
				return
			}

			pushProgress(states[stateIndex]!)
			stateIndex += 1
		}, intervalMs)

		try {
			return await task()
		} finally {
			clearInterval(timer)
		}
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
		data: ReportData,
	): Promise<ReportAiInsights> {
		progress.value = []
		let websiteAnalysis: string | undefined
		let websiteAnalysisUrls: string[] = []
		let websiteAnalysisSources: string[] = []

		// Stage 1: run website analysis first so we can reuse it in the briefing.
		if (config.aiWebsiteAnalysis && config.url) {
			let analysisResult: AiWebsiteAnalysisResponse
			try {
				analysisResult = await runWithProgress(
					[
						'AI analyse starten...',
						"Websitepagina's verzamelen via server-crawl...",
						'llms-full criteria toepassen op verzamelde content...',
						'Analyse structureren en afronden...',
					],
					() => generateWebsiteAnalysis(config),
				)
			} catch (error: unknown) {
				throw new ReportGenerationError('AI_WEBSITE_ANALYSIS_FAILED', error)
			}

			websiteAnalysis = analysisResult.analysis
			websiteAnalysisUrls = analysisResult.analysedPages.map((page) => page.url)
			websiteAnalysisSources = analysisResult.usedSources
			pushProgress('AI website-analyse afgerond.')
		}

		// Stage 2: create briefing, optionally enriched with analysis context.
		let briefing: string | undefined
		if (config.aiBriefing) {
			try {
				briefing = await runWithProgress(
					[
						'AI briefing starten...',
						'Auditresultaten en context combineren...',
						'Concrete briefing opstellen voor webbureau...',
					],
					() => generateBriefing(config, data, websiteAnalysis),
				)
			} catch (error: unknown) {
				throw new ReportGenerationError('AI_BRIEFING_FAILED', error)
			}
		}

		if (briefing) {
			pushProgress('AI briefing afgerond.')
		}

		return {
			briefing,
			websiteAnalysis,
			websiteAnalysisUrls,
			websiteAnalysisSources,
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
		websiteAnalysisContext?: string,
	): Promise<string> {
		const payload = createBriefingPayload(config, data, websiteAnalysisContext)

		// Track only real endpoint usage, not UI toggle state.
		trackAiInsight({ tool: 'briefing' })

		const response = await $fetch('/api/ai/briefing', {
			method: 'POST',
			body: payload,
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
		config: ReportConfig,
	): Promise<AiWebsiteAnalysisResponse> {
		const payload = AiWebsiteAnalysisRequestSchema.parse({
			url: config.url,
			region: config.region,
		})

		// Track only real endpoint usage, not UI toggle state.
		trackAiInsight({ tool: 'website_analysis' })

		const response = await $fetch('/api/ai/website-analysis', {
			method: 'POST',
			body: payload,
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
		progress,
	}
}
