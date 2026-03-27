import { createError, eventHandler, getRouterParam } from 'h3'
import { blob } from 'hub:blob'

export default eventHandler(async (event) => {
	const pathname = getRouterParam(event, 'pathname')

	if (!pathname) {
		throw createError({ statusCode: 404, statusMessage: 'Not Found' })
	}

	/**
	 * Nuxt Studio prefixes images with /assets, so that the actual request path by the app
	 * needs to be /assets/assets/:filename, which is ugly.
	 * So if the pathname starts with /assets here, slice it!
	 */
	const sanitizedPathname = pathname.startsWith('/assets') ? pathname.slice(7) : pathname
	setHeader(event, 'Content-Security-Policy', "default-src 'none';")
	return blob.serve(event, sanitizedPathname)
})
