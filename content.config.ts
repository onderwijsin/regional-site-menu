import { defineCollection, defineContentConfig } from '@nuxt/content'
import { z } from 'zod'

export default defineContentConfig({
	collections: {
		items: defineCollection({
			type: 'page',
			source: {
				include: '**',
				exclude: [],
			},
			schema: z.object({
				title: z.string(),
				description: z.string(),
				date: z.iso.date(),
				pillar: z.enum([
					'Inzicht & Overzicht',
					'Verdieping & Ervaring',
					'Activatie & Deelname',
					'Ondersteuning & Contact',
				]),
				goals: z.array(z.enum(['Enthousiasmeren', 'Informeren', 'Activeren'])),
				scope: z.array(z.enum(['Regionaal', 'Boven-regionaal', 'Landelijk'])),
				priority: z.enum(['Must have', 'Should have', 'Nice to have']),
				exampleUrl: z.url().optional(),
			}),
		}),
	},
})
