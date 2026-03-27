import { createError, eventHandler, getRouterParam } from 'h3'
import { blob } from 'hub:blob'

export default eventHandler(async (event) => {
	const pathname = getRouterParam(event, 'pathname')

	console.log('pathname')
	if (!pathname) {
		throw createError({ statusCode: 404, statusMessage: 'Not Found' })
	}
	console.log(await blob.list())
	return blob.serve(event, pathname)
})
