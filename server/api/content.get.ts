import { queryCollection } from '@nuxt/content/server'

export default defineEventHandler(async (event) => {
	return await queryCollection(event, 'items').where('extension', '=', 'md').all()
})
