import { z } from 'zod'

/**
 * Report configuration schema
 *
 * Rules:
 * - url is required ONLY when addAiAnalysis === true
 * - otherwise url must be undefined
 */
export const ReportConfigSchema = z
	.object({
		region: z.string().min(1, { error: 'Voeg een naam toe' }),
		aiBriefing: z.boolean(),
		aiWebsiteAnalysis: z.boolean(),
		url: z.url({ error: 'Voeg een geldige URL toe' }).optional(),
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
