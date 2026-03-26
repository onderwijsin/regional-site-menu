import type { ItemsCollectionItem } from '@nuxt/content'

/**
 * Canonical pillar ordering used across filters, reports, and forms.
 */
export const PILLARS = [
	'Inzicht & Overzicht',
	'Verdieping & Ervaring',
	'Activatie & Deelname',
	'Ondersteuning & Contact',
] as const satisfies readonly ItemsCollectionItem['pillar'][]

/**
 * Canonical goal ordering used across filters and forms.
 */
export const GOALS = [
	'Enthousiasmeren',
	'Informeren',
	'Activeren',
] as const satisfies readonly ItemsCollectionItem['goals'][number][]

const PILLAR_HINTS: Record<ItemsCollectionItem['pillar'], string> = {
	'Inzicht & Overzicht':
		'De website maakt snel duidelijk waar de regio voor staat, wat het aanbod is en helpt de gebruiker op weg in de oriëntatie.',
	'Verdieping & Ervaring':
		'De website helpt de gebruiker om zich te verdiepen en een goed beeld te krijgen van opleidingen, beroepen en ervaringen.',
	'Activatie & Deelname':
		'De website biedt de gebruiker concrete handvatten en vervolgacties om verder te komen in zijn stap naar het onderwijs.',
	'Ondersteuning & Contact':
		'De website maakt duidelijk welke ondersteuning beschikbaar is en biedt toegankelijke manieren om contact op te nemen.',
}

const GOAL_HINTS: Record<ItemsCollectionItem['goals'][number], string> = {
	Informeren:
		'Je wilt de potentiële onderwijsprofessional informeren over de mogelijkheden in het onderwijs, en specifiek binnen jouw regio.',
	Activeren:
		'Je wilt de potentiële onderwijsprofessional activeren om een concrete vervolgstap te zetten in zijn klantreis.',
	Enthousiasmeren:
		'Je wilt de potentiële onderwijsprofessional enthousiasmeren en verleiden om te kiezen voor een baan in het onderwijs.',
}

const SCOPE_HINTS: Record<ItemsCollectionItem['scope'], string> = {
	Regionaal: 'Deze informatie is alleen relevant binnen jouw onderwijsregio.',
	Bovenregionaal:
		"Jouw informatie-aanbod is relevant binnen jouw regio én nabijgelegen onderwijsregio's.",
	Landelijk: "Jouw informatie-aanbod is relevant voor álle onderwijsregio's in Nederland.",
}

const PRIORITY_HINTS: Record<ItemsCollectionItem['priority'], string> = {
	'Must have': 'Dit element is essentieel voor de gebruiker.',
	'Should have': 'Dit element is in de meeste gevallen belangrijk voor de gebruiker.',
	'Nice to have': 'Dit element is optioneel, maar kan de gebruikerservaring verbeteren.',
}

export function getPillarHint(value: ItemsCollectionItem['pillar']): string {
	return (
		PILLAR_HINTS[value] ??
		'Eén van de content categorieën van de website van jouw regionale onderwijsloket'
	)
}

export function getGoalHint(value: ItemsCollectionItem['goals'][number]): string {
	return GOAL_HINTS[value] ?? 'Eén van de doelen van de website van jouw regionale onderwijsloket'
}

export function getScopeHint(value: ItemsCollectionItem['scope']): string {
	return (
		SCOPE_HINTS[value] ??
		'Geeft aan binnen welke geografische scope deze informatie relevant is.'
	)
}

export function getPriorityHint(value: ItemsCollectionItem['priority']): string {
	return PRIORITY_HINTS[value] ?? 'Geeft aan hoe belangrijk dit element is voor de gebruiker.'
}

export function getPillarIconName(
	value: ItemsCollectionItem['pillar'],
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
