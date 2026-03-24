import { defineCollection, defineContentConfig } from '@nuxt/content'
import { z } from 'zod'

import { goal, pillar, priority, scope } from './schema/fields'

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
				pillar,
				goals: z.array(goal),
				scope,
				priority,
				exampleUrl: z.url().optional(),
				audit: z
					.object({
						description: z.string().optional(),
					})
					.optional(),
			}),
		}),
	},
})
