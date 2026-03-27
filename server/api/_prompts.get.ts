import { queryCollection } from '@nuxt/content/server'

export default defineEventHandler(async (event) => {
	return await queryCollection(event, '_prompts').where('extension', '=', 'md').all()
})
