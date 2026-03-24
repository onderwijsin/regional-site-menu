import { z } from 'zod'

export const pillar = z.enum([
	'Inzicht & Overzicht',
	'Verdieping & Ervaring',
	'Activatie & Deelname',
	'Ondersteuning & Contact',
])
export const goal = z.enum(['Enthousiasmeren', 'Informeren', 'Activeren'])
export const scope = z.enum(['Regionaal', 'Bovenregionaal', 'Landelijk'])
export const priority = z.enum(['Must have', 'Should have', 'Nice to have'])
