import { isAdmin } from '../utils/security/admin'
import { evaluateProtectedPostRequest } from '../utils/security/request-guard'

/**
 * Global middleware that protects sensitive POST routes from cross-site abuse.
 *
 * It intentionally targets only selected high-cost/high-impact routes and keeps
 * all other traffic untouched.
 */
export default defineEventHandler((event) => {
	const method = event.node.req.method?.toUpperCase()
	if (method !== 'POST') {
		return
	}

	if (isAdmin(event)) {
		return
	}

	const requestUrl = getRequestURL(event)
	const decision = evaluateProtectedPostRequest({
		pathname: requestUrl.pathname,
		requestOrigin: requestUrl.origin,
		fetchSiteHeader: getRequestHeader(event, 'sec-fetch-site'),
		originHeader: getRequestHeader(event, 'origin'),
		refererHeader: getRequestHeader(event, 'referer')
	})

	if (!decision.allowed) {
		throw createError({
			statusCode: 403,
			statusMessage: 'Ongeldige request-herkomst'
		})
	}
})
