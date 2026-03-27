import type { NuxtConfig } from '@nuxt/schema'

export const robots = {
	groups: [
		/**
		 * ----------------------------------------
		 * 1. Block ALL search engine indexing bots
		 * ----------------------------------------
		 */
		{
			userAgent: [
				'Googlebot',
				'Bingbot',
				'DuckDuckBot',
				'Baiduspider',
				'YandexBot',
				'Slurp', // Yahoo
				'Applebot' // Spotlight/Siri indexing
			],
			disallow: '/'
		},

		/**
		 * ----------------------------------------
		 * 2. Block SEO / scraping tools (optional but recommended)
		 * ----------------------------------------
		 */
		{
			userAgent: ['AhrefsBot', 'MJ12bot'],
			disallow: '/'
		},

		/**
		 * ----------------------------------------
		 * 3. Block dataset / training crawlers explicitly
		 * (stronger than Content-Signal alone)
		 * ----------------------------------------
		 */
		{
			userAgent: ['CCBot', 'Bytespider', 'Diffbot'],
			disallow: '/'
		},

		/**
		 * ----------------------------------------
		 * 4. Allow everything else + AI directives
		 * ----------------------------------------
		 */
		{
			userAgent: '*',
			allow: '/',
			contentSignal: {
				search: 'no', // ❌ no indexing
				'ai-input': 'yes', // ✅ allow RAG / LLM usage
				'ai-train': 'no' // ❌ no training
			},
			contentUsage: {
				'train-ai': 'n'
			}
		},

		/**
		 * ----------------------------------------
		 * 5. Vendor-specific AI controls
		 * ----------------------------------------
		 */

		// Google AI (Gemini, Vertex)
		{
			userAgent: 'Google-Extended',
			disallow: '/'
		},

		// Apple AI
		{
			userAgent: 'Applebot-Extended',
			disallow: '/'
		}
	]
} satisfies NuxtConfig['robots']
