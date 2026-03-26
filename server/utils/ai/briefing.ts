import type { AiBriefingRequest } from '@schema/reportAi'

/**
 * Builds the user prompt for briefing generation.
 *
 * @param input - Validated request payload.
 * @returns Prompt text.
 */
export function formatBriefingInput(input: AiBriefingRequest): string {
	const lines: string[] = [`Regio: ${input.region}`, '', 'Doelen van de regio:']

	if (input.regionGoals?.length) {
		for (const goal of input.regionGoals) {
			lines.push(`- ${goal}`)
		}
	} else {
		lines.push('- Niet expliciet opgegeven')
	}

	lines.push('')
	lines.push('Gekozen onderdelen:')

	for (const component of input.chosenComponents) {
		lines.push(
			`- ${component.title} (${component.pillar} | ${component.priority} | score: ${component.score ?? 'geen'})`,
		)
		lines.push(`  - Doelen: ${component.goals.join(', ')}`)
		lines.push(`  - Beschrijving: ${component.description}`)
		lines.push(`  - Opmerking van regio: ${component.comment || 'Geen toelichting'}`)
	}

	lines.push('')
	lines.push('Extra context:')
	lines.push(input.extraContext?.trim() || 'Geen extra context opgegeven.')

	if (input.websiteAnalysisContext?.trim()) {
		// The staged flow injects website analysis here so briefing can be more concrete.
		lines.push('')
		lines.push('Resultaat van website-analyse (gebruik als aanvullende context):')
		lines.push(input.websiteAnalysisContext.trim())
	}

	return lines.join('\n')
}
