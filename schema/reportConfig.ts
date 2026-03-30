import { z } from 'zod'

import { AI_WEBSITE_ANALYSIS_MAX_PAGES, AI_WEBSITE_ANALYSIS_MIN_PAGES } from './reportAi'

/**
 * Report configuration schema
 *
 * Rules:
 * - url is required ONLY when aiWebsiteAnalysis === true
 * - otherwise url must be undefined
 */
export const ReportConfigSchema = z
	.object({
		region: z.string().min(1, { error: 'Voeg een naam toe' }),
		aiBriefing: z.boolean(),
		aiWebsiteAnalysis: z.boolean(),
		url: z.url({ error: 'Voeg een geldige URL toe' }).optional(),
		maxPages: z
			.number()
			.int()
			.min(AI_WEBSITE_ANALYSIS_MIN_PAGES)
			.max(AI_WEBSITE_ANALYSIS_MAX_PAGES)
			.optional(),
		notes: z.string()
	})
	.superRefine((data, ctx) => {
		const { aiWebsiteAnalysis, url } = data

		// If analysis is enabled → URL is required
		if (aiWebsiteAnalysis && !url) {
			ctx.addIssue({
				code: 'custom',
				path: ['url'],
				message: 'URL is verplicht wanneer analyse is ingeschakeld'
			})
		}
	})

export type ReportConfig = z.infer<typeof ReportConfigSchema>
