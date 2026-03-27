import { goal, pillar, priority } from '@schema/fields'
import { z } from 'zod'

/**
 * Compact shape of an audited menu item used as AI input.
 */
export const ReportAiSelectedComponentSchema = z.object({
	id: z.string().min(1),
	title: z.string().min(1),
	pillar,
	goals: z.array(goal),
	priority,
	description: z.string().min(1),
	score: z.number().int().min(1).max(10).nullable(),
	comment: z.string()
})

/**
 * Request payload for generating an AI briefing.
 */
export const AiBriefingRequestSchema = z.object({
	region: z.string().min(1, { error: 'Voeg een regiowaarde toe' }),
	/**
	 * Optional explicit goals of the region.
	 */
	regionGoals: z.array(z.string().min(1)).optional(),
	/**
	 * Audited components selected by the user.
	 */
	chosenComponents: z.array(ReportAiSelectedComponentSchema).min(1),
	/**
	 * Free-form context entered by the user.
	 */
	extraContext: z.string().optional(),
	/**
	 * Optional website analysis generated in stage 1, reused in stage 2 briefing generation.
	 */
	websiteAnalysisContext: z.string().optional()
})

/**
 * Response payload for the AI briefing endpoint.
 */
export const AiBriefingResponseSchema = z.object({
	briefing: z.string().min(1),
	wordCount: z.number().int().min(1)
})

/**
 * Request payload for website analysis against llms-full criteria.
 */
export const AiWebsiteAnalysisRequestSchema = z.object({
	url: z.url({ error: 'Voeg een geldige URL toe' }),
	region: z.string().min(1).optional(),
	maxPages: z.number().int().min(3).max(20).optional()
})

export const AiWebsiteAnalysisPageSchema = z.object({
	url: z.url(),
	title: z.string().optional()
})

/**
 * Response payload for website analysis.
 */
export const AiWebsiteAnalysisResponseSchema = z.object({
	analysis: z.string().min(1),
	wordCount: z.number().int().min(1),
	/**
	 * Backward compatible field name for inspected pages.
	 */
	crawledPages: z.array(AiWebsiteAnalysisPageSchema),
	/**
	 * Canonical field name for inspected pages.
	 */
	analysedPages: z.array(AiWebsiteAnalysisPageSchema),
	/**
	 * Explicit evidence URLs extracted from tool-call sources.
	 */
	usedSources: z.array(z.url())
})

/**
 * AI content that can be embedded in the final report.
 */
export const ReportAiInsightsSchema = z.object({
	briefing: z.string().min(1).optional(),
	websiteAnalysis: z.string().min(1).optional(),
	websiteAnalysisUrls: z.array(z.url()).optional(),
	websiteAnalysisSources: z.array(z.url()).optional()
})

export type ReportAiSelectedComponent = z.infer<typeof ReportAiSelectedComponentSchema>
export type AiBriefingRequest = z.infer<typeof AiBriefingRequestSchema>
export type AiBriefingResponse = z.infer<typeof AiBriefingResponseSchema>
export type AiWebsiteAnalysisRequest = z.infer<typeof AiWebsiteAnalysisRequestSchema>
export type AiWebsiteAnalysisResponse = z.infer<typeof AiWebsiteAnalysisResponseSchema>
export type ReportAiInsights = z.infer<typeof ReportAiInsightsSchema>
