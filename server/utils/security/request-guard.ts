const ALLOWED_FETCH_SITES = new Set(['same-origin', 'same-site', 'none'])

export const PROTECTED_POST_PATHS = new Set([
	'/api/ai/briefing',
	'/api/ai/website-analysis',
	'/api/datahub/submission'
])

type RequestGuardInput = {
	pathname: string
	requestOrigin: string
	fetchSiteHeader?: string
	originHeader?: string
	refererHeader?: string
}

export type RequestGuardDecision = {
	allowed: boolean
	reason?: 'not_protected' | 'invalid_fetch_site' | 'invalid_origin'
}

/**
 * Validates browser request metadata for protected POST API routes.
 *
 * Enforced checks:
 * - `sec-fetch-site` must indicate same-origin/same-site browser context.
 * - `origin` (or fallback `referer`) must match the current request origin.
 *
 * @param input - Request metadata extracted in middleware.
 * @returns Allow/deny decision with machine-readable reason.
 */
export function evaluateProtectedPostRequest(input: RequestGuardInput): RequestGuardDecision {
	if (!PROTECTED_POST_PATHS.has(input.pathname)) {
		return { allowed: true, reason: 'not_protected' }
	}

	if (input.fetchSiteHeader && !isAllowedFetchSite(input.fetchSiteHeader)) {
		return { allowed: false, reason: 'invalid_fetch_site' }
	}

	if (!isSameOriginRequest(input.requestOrigin, input.originHeader, input.refererHeader)) {
		return { allowed: false, reason: 'invalid_origin' }
	}

	return { allowed: true }
}

function isAllowedFetchSite(fetchSiteHeader: string | undefined): boolean {
	const normalized = fetchSiteHeader?.trim().toLowerCase()
	if (!normalized) {
		return true
	}

	return ALLOWED_FETCH_SITES.has(normalized)
}

function isSameOriginRequest(
	requestOrigin: string,
	originHeader: string | undefined,
	refererHeader: string | undefined
): boolean {
	const normalizedRequestOrigin = normalizeOrigin(requestOrigin)
	if (!normalizedRequestOrigin) {
		return false
	}

	const normalizedOrigin = normalizeOrigin(originHeader)
	if (normalizedOrigin) {
		return normalizedOrigin === normalizedRequestOrigin
	}

	const normalizedRefererOrigin = normalizeOrigin(refererHeader)
	if (normalizedRefererOrigin) {
		return normalizedRefererOrigin === normalizedRequestOrigin
	}

	return false
}

function normalizeOrigin(value: string | undefined): string | null {
	const trimmed = value?.trim()
	if (!trimmed || trimmed === 'null') {
		return null
	}

	try {
		return new URL(trimmed).origin.toLowerCase()
	} catch {
		return null
	}
}
