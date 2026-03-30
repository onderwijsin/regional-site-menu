import { queryCollection } from '@nuxt/content/server'

/**
 * Returns all markdown-backed `extras` collection entries.
 *
 * @param event - H3 request event.
 * @returns Extra resources from Nuxt Content.
 */
export default defineEventHandler((event) => {
	return queryCollection(event, 'extras').where('extension', '=', 'md').all()
})
