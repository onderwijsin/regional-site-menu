import { queryCollection } from '@nuxt/content/server'

/**
 * Returns all markdown-backed `_prompts` collection entries.
 *
 * @param event - H3 request event.
 * @returns Prompt records from Nuxt Content.
 */
export default defineEventHandler((event) => {
	return queryCollection(event, '_prompts').where('extension', '=', 'md').all()
})
