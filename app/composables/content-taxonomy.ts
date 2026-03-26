import type { Goal, Pillar, Priority, Scope } from '~~/shared/types/primitives'

/**
 * Canonical pillar ordering used across filters, reports, and forms.
 */
export const PILLARS = [
	'Inzicht & Overzicht',
	'Verdieping & Ervaring',
	'Activatie & Deelname',
	'Ondersteuning & Contact',
] as const satisfies readonly Pillar[]

/**
 * Canonical goal ordering used across filters and forms.
 */
export const GOALS = [
	'Enthousiasmeren',
	'Informeren',
	'Activeren',
] as const satisfies readonly Goal[]

const PILLAR_HINTS: Record<Pillar, string> = {
	'Inzicht & Overzicht':
		'De website maakt snel duidelijk waar de regio voor staat, wat het aanbod is en helpt de gebruiker op weg in de oriëntatie.',
	'Verdieping & Ervaring':
		'De website helpt de gebruiker om zich te verdiepen en een goed beeld te krijgen van opleidingen, beroepen en ervaringen.',
	'Activatie & Deelname':
		'De website biedt de gebruiker concrete handvatten en vervolgacties om verder te komen in zijn stap naar het onderwijs.',
	'Ondersteuning & Contact':
		'De website maakt duidelijk welke ondersteuning beschikbaar is en biedt toegankelijke manieren om contact op te nemen.',
}

const GOAL_HINTS: Record<Goal, string> = {
	Informeren:
		'Je wilt de potentiële onderwijsprofessional informeren over de mogelijkheden in het onderwijs, en specifiek binnen jouw regio.',
	Activeren:
		'Je wilt de potentiële onderwijsprofessional activeren om een concrete vervolgstap te zetten in zijn klantreis.',
	Enthousiasmeren:
		'Je wilt de potentiële onderwijsprofessional enthousiasmeren en verleiden om te kiezen voor een baan in het onderwijs.',
}

const SCOPE_HINTS: Record<Scope, string> = {
	Regionaal: 'Deze informatie is alleen relevant binnen jouw onderwijsregio.',
	Bovenregionaal:
		"Jouw informatie-aanbod is relevant binnen jouw regio én nabijgelegen onderwijsregio's.",
	Landelijk: "Jouw informatie-aanbod is relevant voor álle onderwijsregio's in Nederland.",
}

const PRIORITY_HINTS: Record<Priority, string> = {
	'Must have': 'Dit element is essentieel voor de gebruiker.',
	'Should have': 'Dit element is in de meeste gevallen belangrijk voor de gebruiker.',
	'Nice to have': 'Dit element is optioneel, maar kan de gebruikerservaring verbeteren.',
}

export function getPillarHint(value: Pillar): string {
	return (
		PILLAR_HINTS[value] ??
		'Eén van de content categorieën van de website van jouw regionale onderwijsloket'
	)
}

export function getGoalHint(value: Goal): string {
	return GOAL_HINTS[value] ?? 'Eén van de doelen van de website van jouw regionale onderwijsloket'
}

export function getScopeHint(value: Scope): string {
	return (
		SCOPE_HINTS[value] ??
		'Geeft aan binnen welke geografische scope deze informatie relevant is.'
	)
}

export function getPriorityHint(value: Priority): string {
	return PRIORITY_HINTS[value] ?? 'Geeft aan hoe belangrijk dit element is voor de gebruiker.'
}

export function getPillarIconName(
	value: Pillar,
): 'inzicht' | 'verdieping' | 'activatie' | 'ondersteuning' {
	if (value === 'Inzicht & Overzicht') {
		return 'inzicht'
	}

	if (value === 'Verdieping & Ervaring') {
		return 'verdieping'
	}

	if (value === 'Activatie & Deelname') {
		return 'activatie'
	}

	return 'ondersteuning'
}
