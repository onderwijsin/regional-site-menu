import type { ReportAiInsights } from '~~/schema/reportAi'
import type { ReportConfig } from '~~/schema/reportConfig'

/**
 * Minimal audit payload used for AI input signature generation.
 */
export type ReportAiSignatureAudit = {
	id: string
	score: number | null | undefined
	comment?: string | null
}

/**
 * Builds a stable signature for all inputs that influence AI generation.
 *
 * Use this to determine whether previously generated AI insights can be reused
 * without triggering new endpoint calls.
 *
 * @param config - Current report configuration.
 * @param audits - Audits snapshot relevant for AI generation.
 * @returns Stable JSON signature.
 */
export function createReportAiInputSignature(
	config: ReportConfig,
	audits: ReportAiSignatureAudit[]
): string {
	const normalizedAudits = [...audits]
		.map((audit) => ({
			id: audit.id,
			score: audit.score ?? null,
			comment: audit.comment?.trim() || ''
		}))
		.sort((left, right) => left.id.localeCompare(right.id))

	return JSON.stringify({
		region: config.region.trim(),
		aiBriefing: config.aiBriefing,
		aiWebsiteAnalysis: config.aiWebsiteAnalysis,
		url: config.url?.trim() || undefined,
		notes: config.notes.trim(),
		audits: normalizedAudits
	})
}

/**
 * Checks whether AI insights currently contain meaningful data.
 *
 * @param insights - AI insights object.
 * @returns Whether any AI output is present.
 */
export function hasGeneratedReportAiInsights(insights?: ReportAiInsights): boolean {
	return Boolean(
		insights?.briefing?.trim() ||
		insights?.websiteAnalysis?.trim() ||
		(insights?.websiteAnalysisUrls?.length ?? 0) > 0 ||
		(insights?.websiteAnalysisSources?.length ?? 0) > 0
	)
}

/**
 * Builds the final AI payload that should be embedded in the generated PDF.
 *
 * The payload respects current toggles:
 * - briefing is included only when enabled
 * - website analysis is included only when enabled
 *
 * @param args - Inputs for final AI payload construction.
 * @returns Final AI insights payload or `undefined` when empty.
 */
export function buildReportPdfAiInsights(args: {
	config: ReportConfig
	aiInsights?: ReportAiInsights
	briefingDraft: string
}): ReportAiInsights | undefined {
	const insights: ReportAiInsights = {}

	if (args.config.aiBriefing && args.aiInsights?.briefing) {
		const normalizedBriefing = args.briefingDraft.trim()
		if (normalizedBriefing) {
			insights.briefing = normalizedBriefing
		}
	}

	if (args.config.aiWebsiteAnalysis && args.aiInsights?.websiteAnalysis) {
		insights.websiteAnalysis = args.aiInsights.websiteAnalysis
		insights.websiteAnalysisUrls = args.aiInsights.websiteAnalysisUrls
		insights.websiteAnalysisSources = args.aiInsights.websiteAnalysisSources
	}

	return hasGeneratedReportAiInsights(insights) ? insights : undefined
}
