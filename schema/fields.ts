import { z } from 'zod'

export const pillar = z.enum([
	'Inzicht & Overzicht',
	'Verdieping & Ervaring',
	'Activatie & Deelname',
	'Ondersteuning & Contact'
])
export const goal = z.enum(['Enthousiasmeren', 'Informeren', 'Activeren'])
export const scope = z.enum(['Regionaal', 'Bovenregionaal', 'Landelijk'])
export const priority = z.enum(['Must have', 'Should have', 'Nice to have'])
export const aiPromptKey = z.enum(['ai-briefing-system', 'ai-website-analysis-system'])

export type Pillar = z.infer<typeof pillar>
export type Goal = z.infer<typeof goal>
export type Scope = z.infer<typeof scope>
export type Priority = z.infer<typeof priority>
export type AiPromptKey = z.infer<typeof aiPromptKey>
