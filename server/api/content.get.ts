import { queryCollection } from '@nuxt/content/server'

/**
 * Returns all markdown-backed `items` collection entries.
 *
 * @param event - H3 request event.
 * @returns Content items from Nuxt Content.
 */
export default defineEventHandler((event) => {
	return queryCollection(event, 'items').where('extension', '=', 'md').all()
})
