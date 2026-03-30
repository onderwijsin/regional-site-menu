import type { H3Event } from 'h3'

import { SECURITY_HEADERS } from '@constants'

import { isAdmin } from './admin'

/**
 * Validates the Turnstile token sent with a protected request.
 *
 * In local/test environments, validation is bypassed when no secret key is
 * configured to keep developer workflows frictionless.
 *
 * @param event - H3 event.
 * @param expectedAction - Logical action name expected for this route.
 * @returns Nothing when token is valid.
 */
export async function assertTurnstileToken(event: H3Event, expectedAction: string): Promise<void> {
	if (isAdmin(event)) {
		return
	}

	const config = useRuntimeConfig(event)
	const secretKey = config.turnstile?.secretKey?.trim()
	const isProd = Boolean(config.public?.mode?.isProd)

	if (!secretKey) {
		if (isProd) {
			throw createError({
				statusCode: 500,
				statusMessage: 'TURNSTILE_SECRET_KEY is missing in runtimeConfig'
			})
		}

		return
	}

	const token = getRequestHeader(event, SECURITY_HEADERS.turnstileToken)?.trim()
	if (!token) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Turnstile token is missing'
		})
	}

	let verification: { success: boolean; action?: string }
	try {
		verification = await verifyTurnstileToken(token, event)
	} catch (error: unknown) {
		if (isErrorWithStatusCode(error)) {
			throw error
		}

		throw createError({
			statusCode: 502,
			statusMessage: 'Turnstile validation could not be performed'
		})
	}

	if (!verification.success) {
		throw createError({
			statusCode: 403,
			statusMessage: 'Turnstile validation failed'
		})
	}

	if (verification.action && verification.action !== expectedAction) {
		throw createError({
			statusCode: 403,
			statusMessage: 'Turnstile action does not match'
		})
	}
}

function isErrorWithStatusCode(error: unknown): error is { statusCode: number } {
	return Boolean(
		error &&
		typeof error === 'object' &&
		'statusCode' in error &&
		typeof (error as { statusCode?: unknown }).statusCode === 'number'
	)
}
