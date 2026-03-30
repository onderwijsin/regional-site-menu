import type { ReportGenerationStage } from '~/composables/report-generation-execution'
import type { ReportConfig } from '~~/schema/reportConfig'

import {
	getEstimatedAnalysisDurationMs,
	getEstimatedBriefingDurationMs
} from '~/composables/report-ai'

type ReportGenerationStageMeta = {
	title: string
	description: string
}

/**
 * Returns title/description copy for one report generation stage.
 *
 * @param stage - Active generation stage.
 * @returns UI metadata for slideover header.
 * @example
 * ```ts
 * const meta = getReportGenerationStageMeta('ai-loading')
 * // => { title: 'AI-inzichten genereren', description: '...' }
 * ```
 */
export function getReportGenerationStageMeta(
	stage: ReportGenerationStage
): ReportGenerationStageMeta {
	switch (stage) {
		case 'ai-loading':
			return {
				title: 'AI-inzichten genereren',
				description:
					'We genereren nu de verschillende AI-inzichten. Dit kan enige tijd duren.'
			}
		case 'briefing-review':
			return {
				title: 'Controleer AI-briefing',
				description:
					'Controleer en bewerk de gegenereerde briefing voordat het PDF-rapport wordt gemaakt.'
			}
		default:
			return {
				title: 'Genereer rapportage',
				description:
					'Met jouw input en beoordelingen maken we een rapportage die je als PDF kunt downloaden.'
			}
	}
}

/**
 * Converts a raw duration estimate into a user-facing minute range label.
 *
 * @param durationMs - Estimated duration in milliseconds.
 * @returns Dutch minute-based ETA label without second-level precision.
 * @example
 * ```ts
 * formatReportGenerationDurationRangeLabel(90_000)
 * // => 'ongeveer 1-2 minuten'
 * ```
 */
export function formatReportGenerationDurationRangeLabel(durationMs: number): string {
	const lowerBoundMinutes = (durationMs * 0.85) / 60_000
	const upperBoundMinutes = (durationMs * 1.2) / 60_000

	if (upperBoundMinutes < 1) {
		return 'minder dan 1 minuut'
	}

	const lowerMinutes = Math.max(1, Math.floor(lowerBoundMinutes))
	const upperMinutes = Math.max(lowerMinutes, Math.ceil(upperBoundMinutes))
	if (lowerMinutes === upperMinutes) {
		return `ongeveer ${upperMinutes} ${upperMinutes === 1 ? 'minuut' : 'minuten'}`
	}

	return `ongeveer ${lowerMinutes}-${upperMinutes} minuten`
}

/**
 * Calculates the AI duration label for current report configuration.
 *
 * @param config - Current report config.
 * @returns Dutch duration label or `onbekend` when no AI tool is enabled.
 * @example
 * ```ts
 * getReportAiEstimatedDurationLabel({
 *   region: 'Regio',
 *   aiBriefing: false,
 *   aiWebsiteAnalysis: false,
 *   notes: '',
 *   maxPages: 5
 * })
 * // => 'onbekend'
 * ```
 */
export function getReportAiEstimatedDurationLabel(config: ReportConfig): string {
	let totalMs = 0

	if (config.aiWebsiteAnalysis) {
		totalMs += getEstimatedAnalysisDurationMs(config.maxPages)
	}

	if (config.aiBriefing) {
		totalMs += getEstimatedBriefingDurationMs()
	}

	if (totalMs === 0) {
		return 'onbekend'
	}

	return formatReportGenerationDurationRangeLabel(totalMs)
}
