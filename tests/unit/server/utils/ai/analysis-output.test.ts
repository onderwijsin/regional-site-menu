import {
	renderWebsiteAnalysisMarkdown,
	WebsiteAnalysisOutputSchema
} from '~~/server/utils/ai/analysis-output'
import { describe, expect, it } from 'vitest'

describe('server/utils/ai/analysis-output', () => {
	it('validates required structured output fields', () => {
		const result = WebsiteAnalysisOutputSchema.safeParse({
			shortSummary: 'Kort',
			whatWorks: 'Werkt',
			missingOrWeak: 'Ontbreekt',
			recommendations: 'Aanbevolen',
			priorities: 'Hoog',
			unknowns: null
		})

		expect(result.success).toBe(true)
	})

	it('renders markdown sections and strips accidental heading wrappers', () => {
		const output = renderWebsiteAnalysisMarkdown({
			shortSummary: '```markdown\n## Samenvatting\nKern\n```',
			whatWorks: 'Sterke punten',
			missingOrWeak: '# Mist nog\nMeer voorbeelden',
			recommendations: 'Concrete actie',
			priorities: '1. Snel verbeteren',
			unknowns: ''
		})

		expect(output).toContain('## Korte samenvatting\nSamenvatting\nKern')
		expect(output).toContain('## Wat ontbreekt of onvoldoende is\nMist nog\nMeer voorbeelden')
		expect(output).toContain('## Prioriteit\n1. Snel verbeteren')
		expect(output).not.toContain('## Bewijsgaten en aannames')
	})
})
