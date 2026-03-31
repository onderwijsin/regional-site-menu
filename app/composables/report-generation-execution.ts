import type { ItemsCollectionItem } from '@nuxt/content'
import type { ReportAiInsights } from '~~/schema/reportAi'
import type { ReportConfig } from '~~/schema/reportConfig'
import type { Audit, PillarAverage } from '~~/shared/types/audit'
import type { Pillar } from '~~/shared/types/primitives'
import type { ReportData } from './report/types'

import * as Sentry from '@sentry/nuxt'

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
	abortAiGeneration?: () => void
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
	let cancellationRequested = false

	/**
	 * Recursively detects whether an unknown error represents an aborted request.
	 *
	 * @param error - Unknown thrown value.
	 * @returns Whether this error (or one of its causes) is an abort.
	 */
	function isAbortError(error: unknown): boolean {
		if (!error || typeof error !== 'object') {
			return false
		}

		const candidate = error as { name?: unknown; cause?: unknown }
		if (candidate.name === 'AbortError') {
			return true
		}

		return isAbortError(candidate.cause)
	}

	/**
	 * Cancels any running generation work.
	 *
	 * Used by the close flow to avoid showing failures after intentional dismiss.
	 *
	 * @returns Nothing.
	 */
	function cancelOngoingGeneration(): void {
		cancellationRequested = true
		args.abortAiGeneration?.()
	}

	/**
	 * Decides whether a thrown error should be ignored due to intentional cancel.
	 *
	 * @param error - Unknown thrown value.
	 * @returns Whether UI error handling should be skipped.
	 */
	function shouldSilenceError(error: unknown): boolean {
		return cancellationRequested || isAbortError(error)
	}

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
		Sentry.withScope((scope) => {
			scope.setTag('area', 'report')
			scope.setTag('kind', 'generation_failure_handled')
			scope.setContext('report_generation', {
				stage: args.stage.value,
				hasAiEnabled: args.hasAiEnabled.value,
				auditCount: args.data.audits.length
			})

			if (error instanceof Error) {
				Sentry.captureException(error)
				return
			}

			Sentry.captureMessage('Report generation failed with non-Error exception')
		})

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
			if (cancellationRequested) {
				return
			}

			args.trackReportGenerated({
				scoredElementsCount: args.data.audits.length
			})

			args.onClose()
		} finally {
			args.isGeneratingPdf.value = false
		}
	}

	/**
	 * Runs PDF generation and maps any thrown error to the standard flow toast.
	 *
	 * @returns Nothing.
	 */
	async function startPdfGenerationWithToast(): Promise<void> {
		try {
			await startPdfGeneration()
		} catch (error: unknown) {
			if (shouldSilenceError(error)) {
				return
			}

			showGenerationErrorToast(error)
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
			if (shouldSilenceError(error)) {
				return
			}

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
		cancellationRequested = false

		if (args.hasAiEnabled.value) {
			// Reuse previously generated insights when all relevant inputs are unchanged.
			// This avoids unnecessary and costly repeated AI endpoint calls.
			if (args.hasReusableAiInsights.value) {
				if (args.state.aiBriefing) {
					args.stage.value = 'briefing-review'
					return
				}

				await startPdfGenerationWithToast()

				return
			}

			const canStartAiGeneration = (await args.beforeStartAiGeneration?.()) ?? true
			if (!canStartAiGeneration) {
				return
			}

			await startAiGenerationFlow()
			return
		}

		await startPdfGenerationWithToast()
	}

	/**
	 * Final submit action from briefing review stage.
	 *
	 * @returns Nothing.
	 */
	async function handleBriefingSubmit(): Promise<void> {
		cancellationRequested = false
		await startPdfGenerationWithToast()
	}

	return {
		cancelOngoingGeneration,
		handleConfigSubmit,
		handleBriefingSubmit,
		startAiGenerationFlow,
		startPdfGeneration
	}
}
