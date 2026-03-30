import type { H3Event } from 'h3'

import { SECURITY_HEADERS } from '@constants'

/**
 * Checks whether the incoming request should be treated as admin.
 *
 * Accepted credentials:
 * - `x-admin-token: <API_TOKEN>`
 * - `Authorization: Bearer <API_TOKEN>`
 *
 * @param event - H3 event.
 * @returns Whether request contains a valid admin token.
 */
export function isAdmin(event: H3Event): boolean {
	const adminToken = useRuntimeConfig(event).apiToken?.trim()
	if (!adminToken) {
		return false
	}

	const apiTokenHeader = getRequestHeader(event, SECURITY_HEADERS.adminToken)?.trim()
	if (apiTokenHeader && apiTokenHeader === adminToken) {
		return true
	}

	const authorizationHeader = getRequestHeader(event, 'authorization')?.trim()
	if (!authorizationHeader) {
		return false
	}

	const [scheme, ...valueParts] = authorizationHeader.split(/\s+/)
	if (!scheme || scheme.toLowerCase() !== 'bearer') {
		return false
	}

	const bearerToken = valueParts.join(' ').trim()
	return bearerToken.length > 0 && bearerToken === adminToken
}
