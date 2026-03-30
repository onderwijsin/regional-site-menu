import type { ItemsCollectionItem } from '@nuxt/content'
import type { ReportAiInsights } from '~~/schema/reportAi'
import type { ReportConfig } from '~~/schema/reportConfig'
import type { Audit, PillarAverage } from '~~/shared/types/audit'
import type { Pillar } from '~~/shared/types/primitives'
import type { ComputedRef, Ref } from 'vue'
import type { ReportData } from './report/types'

import { ReportGenerationError } from './report/errors'

export type ReportGenerationStage = 'config' | 'ai-loading' | 'briefing-review'

type ReportGenerationExecutionData = {
	averages: PillarAverage<Pillar>[]
	audits: Audit<ItemsCollectionItem>[]
}

type GenerateReportFn = ReturnType<typeof useReportGenerator>['generateReport']
type GenerateAiInsightsFn = ReturnType<typeof useReportAi>['generateAiInsights']
type TrackReportGeneratedFn = ReturnType<typeof useTracking>['trackReportGenerated']

type ReportGenerationExecutionArgs = {
	state: ReportConfig
	data: ReportGenerationExecutionData
	stage: Ref<ReportGenerationStage>
	aiInsights: Ref<ReportAiInsights | undefined>
	aiInsightsInputSignature: Ref<string | undefined>
	briefingDraft: Ref<string>
	isAiLoading: Ref<boolean>
	isGeneratingPdf: Ref<boolean>
	hasAiEnabled: ComputedRef<boolean>
	hasReusableAiInsights: ComputedRef<boolean>
	currentAiInputSignature: ComputedRef<string>
	getFinalAiInsights: () => ReportAiInsights | undefined
	generateReport: GenerateReportFn
	generateAiInsights: GenerateAiInsightsFn
	trackReportGenerated: TrackReportGeneratedFn
	beforeStartAiGeneration?: () => Promise<boolean>
	onClose: () => void
}

/**
 * Encapsulates report-generation execution flow (AI stages + PDF generation).
 *
 * This keeps the component template-focused while preserving the existing
 * behavior and error handling semantics.
 *
 * @param args - Runtime refs/dependencies from `ReportGenerationFlow.vue`.
 * @returns Flow actions used by the component.
 */
export function useReportGenerationExecution(args: ReportGenerationExecutionArgs) {
	const toast = useToast()
	const { getIcon } = useIcons()

	/**
	 * Returns normalized report data input for PDF and AI generation helpers.
	 *
	 * @returns Report data object with audits and pillar averages.
	 */
	const getReportData = (): ReportData => ({
		audits: args.data.audits,
		averages: args.data.averages
	})

	/**
	 * Maps generation failures to user-facing Dutch copy.
	 *
	 * @param error - Unknown thrown value from generation flow.
	 * @returns Description for toast message.
	 */
	function getReportFailureDescription(error: unknown): string {
		if (error instanceof ReportGenerationError) {
			switch (error.code) {
				case 'AI_WEBSITE_ANALYSIS_FAILED':
					return 'Het lukte niet op de opgegeven website te analyseren'
				case 'AI_BRIEFING_FAILED':
					return 'Het lukte niet om een briefing te genereren'
				default:
					return 'Het lukte niet om je audit te verwerken'
			}
		}

		return 'Het lukte niet om je audit te verwerken'
	}

	/**
	 * Shows one consistent toast for report-flow failures.
	 *
	 * @param error - Unknown thrown value.
	 * @returns Nothing.
	 */
	function showGenerationErrorToast(error: unknown): void {
		console.error('Report generation failed', error)

		toast.add({
			icon: getIcon('error'),
			title: 'Rapport genereren mislukt',
			description: getReportFailureDescription(error),
			color: 'error',
			duration: 10000
		})
	}

	/**
	 * Generates the final PDF with optional AI insights.
	 *
	 * @returns Nothing.
	 * @throws {unknown} Propagates report generation failures to caller.
	 */
	async function startPdfGeneration(): Promise<void> {
		args.isGeneratingPdf.value = true

		try {
			await args.generateReport(args.state, {
				...getReportData(),
				aiInsights: args.getFinalAiInsights()
			})

			args.trackReportGenerated({
				scoredElementsCount: args.data.audits.length
			})

			args.onClose()
		} finally {
			args.isGeneratingPdf.value = false
		}
	}

	/**
	 * Runs AI generation and routes to the next stage.
	 *
	 * - When briefing is enabled: open review editor
	 * - Otherwise: continue directly to PDF generation
	 *
	 * @returns Nothing.
	 */
	async function startAiGenerationFlow(): Promise<void> {
		args.stage.value = 'ai-loading'
		args.isAiLoading.value = true
		args.aiInsights.value = undefined
		args.aiInsightsInputSignature.value = undefined
		args.briefingDraft.value = ''

		try {
			const generatedInsights = await args.generateAiInsights(args.state, getReportData())
			args.aiInsights.value = generatedInsights
			args.aiInsightsInputSignature.value = args.currentAiInputSignature.value

			// When briefing is enabled, force an explicit human review/edit step
			// before allowing final PDF generation.
			if (args.state.aiBriefing && generatedInsights.briefing?.trim()) {
				args.briefingDraft.value = generatedInsights.briefing
				args.stage.value = 'briefing-review'
				return
			}

			// When briefing is disabled, AI generation is complete at this point.
			// Explicitly end the loading phase before starting PDF generation.
			args.isAiLoading.value = false
			await startPdfGeneration()
		} catch (error: unknown) {
			args.stage.value = 'config'
			showGenerationErrorToast(error)
		} finally {
			args.isAiLoading.value = false
		}
	}

	/**
	 * Entry submit action for stage 1 config form.
	 *
	 * @returns Nothing.
	 */
	async function handleConfigSubmit(): Promise<void> {
		if (args.hasAiEnabled.value) {
			// Reuse previously generated insights when all relevant inputs are unchanged.
			// This avoids unnecessary and costly repeated AI endpoint calls.
			if (args.hasReusableAiInsights.value) {
				if (args.state.aiBriefing) {
					args.stage.value = 'briefing-review'
					return
				}

				try {
					await startPdfGeneration()
				} catch (error: unknown) {
					showGenerationErrorToast(error)
				}

				return
			}

			const canStartAiGeneration = (await args.beforeStartAiGeneration?.()) ?? true
			if (!canStartAiGeneration) {
				return
			}

			await startAiGenerationFlow()
			return
		}

		try {
			await startPdfGeneration()
		} catch (error: unknown) {
			showGenerationErrorToast(error)
		}
	}

	/**
	 * Final submit action from briefing review stage.
	 *
	 * @returns Nothing.
	 */
	async function handleBriefingSubmit(): Promise<void> {
		try {
			await startPdfGeneration()
		} catch (error: unknown) {
			showGenerationErrorToast(error)
		}
	}

	return {
		handleConfigSubmit,
		handleBriefingSubmit,
		startAiGenerationFlow,
		startPdfGeneration
	}
}
