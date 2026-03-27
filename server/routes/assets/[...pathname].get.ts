import { createError, eventHandler, getRouterParam } from 'h3'
import { blob } from 'hub:blob'

export default eventHandler(async (event) => {
	const pathname = getRouterParam(event, 'pathname')

	if (!pathname) {
		throw createError({ statusCode: 404, statusMessage: 'Not Found' })
	}

	/**
	 * Nuxt Studio prefixes images with /assets when they are uploaded. So assets are stored in R2
	 * is an assets dir. Since pathname no longer contains '/assets' here, we need to prepend it!
	 */
	setHeader(event, 'Content-Security-Policy', "default-src 'none';")
	return blob.serve(event, `/assets/${pathname}`)
})
