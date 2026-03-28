import type { AiBriefingRequest } from '~~/schema/reportAi'

import { formatBriefingInput } from '~~/server/utils/ai/briefing'
import { describe, expect, it } from 'vitest'

const baseInput: AiBriefingRequest = {
	region: 'Utrecht',
	regionGoals: ['Informeren', 'Activeren'],
	chosenComponents: [
		{
			id: 'c-1',
			title: 'Homepage',
			pillar: 'Inzicht & Overzicht',
			goals: ['Informeren'],
			priority: 'Must have',
			description: 'Heldere landingspagina',
			score: 9,
			comment: 'Goed overzicht'
		},
		{
			id: 'c-2',
			title: 'Contact',
			pillar: 'Ondersteuning & Contact',
			goals: ['Activeren'],
			priority: 'Should have',
			description: 'Contactmogelijkheden',
			score: 5,
			comment: ''
		},
		{
			id: 'c-3',
			title: 'Verdiepingspagina',
			pillar: 'Verdieping & Ervaring',
			goals: ['Informeren'],
			priority: 'Nice to have',
			description: 'Inhoudelijke verdieping',
			score: null,
			comment: 'Meer voorbeelden gewenst'
		}
	],
	extraContext: 'Extra aandacht voor zij-instroom'
}

describe('formatBriefingInput', () => {
	it('renders strategic signal summary and component details', () => {
		const output = formatBriefingInput(baseInput)

		expect(output).toContain('Regio: Utrecht')
		expect(output).toContain('- Aantal gekozen onderdelen: 3')
		expect(output).toContain('- Gemiddelde score (waar ingevuld): 7.0 / 10')
		expect(output).toContain('- Laagst scorende onderdelen (<=6): Contact (5/10)')
		expect(output).toContain('- Hoogst scorende onderdelen (>=8): Homepage (9/10)')
		expect(output).toContain('Verdeling per pijler:')
		expect(output).toContain('Meest genoemde doelen: Informeren (2), Activeren (1)')
		expect(output).toContain('Opmerking van regio: Geen toelichting')
		expect(output).toContain('Extra context:\nExtra aandacht voor zij-instroom')
	})

	it('falls back when goals, scores, and context are mostly missing', () => {
		const output = formatBriefingInput({
			...baseInput,
			regionGoals: undefined,
			extraContext: '   ',
			chosenComponents: baseInput.chosenComponents.map((component) => ({
				...component,
				score: null,
				comment: ''
			})),
			websiteAnalysisContext: 'Analysecontext van website'
		})

		expect(output).toContain('Doelen van de regio:\n- Niet expliciet opgegeven')
		expect(output).toContain('Scores ontbreken grotendeels')
		expect(output).toContain('Onderdelen met regiotoelichting: Geen')
		expect(output).toContain('Geen extra context opgegeven.')
		expect(output).toContain('Resultaat van website-analyse (gebruik als aanvullende context):')
		expect(output).toContain('Analysecontext van website')
	})
})
