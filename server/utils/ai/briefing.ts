import type { AiBriefingRequest } from '@schema/reportAi'

/**
 * Builds the user prompt for briefing generation.
 *
 * @param input - Validated request payload.
 * @returns Prompt text.
 */
export function formatBriefingInput(input: AiBriefingRequest): string {
	const lines: string[] = [
		`Regio: ${input.region}`,
		'',
		'# Strategische signalen uit de auditinput',
		...buildStrategicSignals(input),
		'',
		'Doelen van de regio:'
	]

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
			`- ${component.title} (${component.pillar} | ${component.priority} | score: ${component.score ?? 'geen'})`
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

/**
 * Derives compact strategic signals from audit input to increase personalization.
 *
 * @param input - Validated briefing request payload.
 * @returns Prompt lines with profile signals.
 */
function buildStrategicSignals(input: AiBriefingRequest): string[] {
	const lines: string[] = [`- Aantal gekozen onderdelen: ${input.chosenComponents.length}`]
	const scoredComponents = input.chosenComponents.filter(
		(component): component is typeof component & { score: number } => component.score !== null
	)

	if (scoredComponents.length > 0) {
		const averageScore =
			scoredComponents.reduce((sum, component) => sum + component.score, 0) /
			scoredComponents.length

		lines.push(`- Gemiddelde score (waar ingevuld): ${averageScore.toFixed(1)} / 10`)
		lines.push(
			`- Laagst scorende onderdelen (<=6): ${formatComponentList(
				scoredComponents.filter((component) => component.score <= 6),
				4
			)}`
		)
		lines.push(
			`- Hoogst scorende onderdelen (>=8): ${formatComponentList(
				scoredComponents
					.filter((component) => component.score >= 8)
					.sort((a, b) => b.score - a.score),
				4
			)}`
		)
	} else {
		lines.push(
			'- Scores ontbreken grotendeels: gebruik vooral comments en beschrijvingen als signaal.'
		)
	}

	const pillarCounts = countComponentField(input.chosenComponents, 'pillar')
	lines.push(`- Verdeling per pijler: ${formatCountMap(pillarCounts)}`)

	const priorityCounts = countComponentField(input.chosenComponents, 'priority')
	lines.push(`- Verdeling per prioriteit: ${formatCountMap(priorityCounts)}`)

	const goalCounts = countStringValues(
		input.chosenComponents.flatMap((component) => component.goals)
	)
	lines.push(`- Meest genoemde doelen: ${formatTopCounts(goalCounts, 6)}`)

	const commentedComponents = input.chosenComponents.filter(
		(component) => component.comment.trim().length > 0
	)
	lines.push(
		`- Onderdelen met regiotoelichting: ${formatComponentList(commentedComponents, 6, false)}`
	)

	return lines
}

type BriefingComponent = AiBriefingRequest['chosenComponents'][number]

/**
 * Counts occurrences for one component field.
 *
 * @param components - Chosen components.
 * @param key - Component field key.
 * @returns Count map.
 */
function countComponentField(
	components: BriefingComponent[],
	key: 'pillar' | 'priority'
): Record<string, number> {
	const counts: Record<string, number> = {}

	for (const component of components) {
		const value = component[key]
		counts[value] = (counts[value] ?? 0) + 1
	}

	return counts
}

/**
 * Counts plain string occurrences.
 *
 * @param values - String values.
 * @returns Count map.
 */
function countStringValues(values: string[]): Record<string, number> {
	const counts: Record<string, number> = {}

	for (const value of values) {
		counts[value] = (counts[value] ?? 0) + 1
	}

	return counts
}

/**
 * Formats a map of key counts as one compact string.
 *
 * @param counts - Count map.
 * @returns Human-readable summary.
 */
function formatCountMap(counts: Record<string, number>): string {
	const entries = Object.entries(counts)
	if (entries.length === 0) {
		return 'Geen'
	}

	return entries
		.sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
		.map(([key, count]) => `${key}: ${count}`)
		.join(', ')
}

/**
 * Formats top-count keys in descending order.
 *
 * @param counts - Count map.
 * @param maxItems - Maximum entries.
 * @returns Human-readable top list.
 */
function formatTopCounts(counts: Record<string, number>, maxItems: number): string {
	const topEntries = Object.entries(counts)
		.sort(([, leftCount], [, rightCount]) => rightCount - leftCount)
		.slice(0, maxItems)

	if (topEntries.length === 0) {
		return 'Geen'
	}

	return topEntries.map(([key, count]) => `${key} (${count})`).join(', ')
}

/**
 * Formats selected components for compact prompt output.
 *
 * @param components - Components to print.
 * @param maxItems - Max components to include.
 * @param withScore - Whether to append score values.
 * @returns Compact component list.
 */
function formatComponentList(
	components: Array<{ title: string; score?: number | null }>,
	maxItems: number,
	withScore = true
): string {
	const selected = components.slice(0, maxItems)
	if (selected.length === 0) {
		return 'Geen'
	}

	return selected
		.map((component) => {
			if (!withScore || component.score === null || component.score === undefined) {
				return component.title
			}

			return `${component.title} (${component.score}/10)`
		})
		.join(', ')
}
