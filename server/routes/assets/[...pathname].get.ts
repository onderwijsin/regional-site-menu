import { createError, eventHandler, getRouterParam } from 'h3'
import { blob } from 'hub:blob'

export default eventHandler(async (event) => {
	const pathname = getRouterParam(event, 'pathname')

	if (!pathname) {
		throw createError({ statusCode: 404, statusMessage: 'Not Found' })
	}
	setHeader(event, 'Content-Security-Policy', "default-src 'none';")
	return blob.serve(event, pathname)
})
