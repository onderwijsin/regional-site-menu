import { z } from 'zod'

import { sanitizeAiMarkdown } from './text'

/**
 * Structured website-analysis contract requested from the model.
 *
 * Keeping this schema flat and string-based makes parsing resilient while still
 * enforcing predictable section coverage.
 */
export const WebsiteAnalysisOutputSchema = z.object({
	shortSummary: z.string().min(1),
	whatWorks: z.string().min(1),
	missingOrWeak: z.string().min(1),
	recommendations: z.string().min(1),
	priorities: z.string().min(1),
	unknowns: z.string().min(1).nullable()
})

export type WebsiteAnalysisOutput = z.infer<typeof WebsiteAnalysisOutputSchema>

/**
 * Renders structured analysis fields into final markdown expected by clients/PDF.
 *
 * @param output - Parsed model output.
 * @returns Final normalized markdown document.
 */
export function renderWebsiteAnalysisMarkdown(output: WebsiteAnalysisOutput): string {
	const sections: Array<{ title: string; body: string | null | undefined }> = [
		{ title: 'Korte samenvatting', body: output.shortSummary },
		{ title: 'Wat gaat goed', body: output.whatWorks },
		{ title: 'Wat ontbreekt of onvoldoende is', body: output.missingOrWeak },
		{ title: 'Belangrijkste verbeterpunten', body: output.recommendations },
		{ title: 'Prioriteit', body: output.priorities },
		{ title: 'Bewijsgaten en aannames', body: output.unknowns }
	]

	return sections
		.map((section) => {
			const body = normalizeAnalysisSection(section.body)
			if (!body) {
				return ''
			}

			return `## ${section.title}\n${body}`
		})
		.filter(Boolean)
		.join('\n\n')
		.trim()
}

/**
 * Normalizes one structured section body.
 *
 * @param value - Raw section markdown.
 * @returns Clean section body without accidental heading wrappers.
 */
function normalizeAnalysisSection(value: string | null | undefined): string {
	if (!value?.trim()) {
		return ''
	}

	const normalized = sanitizeAiMarkdown(value).trim()
	return normalized.replace(/^\s{0,3}#{1,6}\s+/gm, '').trim()
}
