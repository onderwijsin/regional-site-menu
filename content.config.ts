import { defineCollection, defineContentConfig } from '@nuxt/content'
import { z } from 'zod'

import { goal, pillar, priority, scope } from './schema/fields'

export default defineContentConfig({
	collections: {
		items: defineCollection({
			type: 'page',
			source: {
				include: 'items/**',
				exclude: [],
				// Drops the leading /items prefix in path. We only use that for organisation; it should not have an effect on front end routing!
				prefix: '/',
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
		extras: defineCollection({
			type: 'page',
			source: {
				include: 'extras/**/*.md',
				exclude: [],
			},
			schema: z.object({
				title: z.string(),
				description: z.string(),
				date: z.iso.date(),
			}),
		}),
	},
})
