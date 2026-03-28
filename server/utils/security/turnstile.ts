import type { H3Event } from 'h3'

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
	const config = useRuntimeConfig(event)
	const secretKey = config.turnstile?.secretKey?.trim()
	const isProd = Boolean(config.public?.mode?.isProd)

	if (!secretKey) {
		if (isProd) {
			throw createError({
				statusCode: 500,
				statusMessage: 'TURNSTILE_SECRET_KEY ontbreekt in runtimeConfig'
			})
		}

		return
	}

	const token = getRequestHeader(event, 'x-turnstile-token')?.trim()
	if (!token) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Turnstile token ontbreekt'
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
			statusMessage: 'Turnstile validatie kon niet worden uitgevoerd'
		})
	}

	if (!verification.success) {
		throw createError({
			statusCode: 403,
			statusMessage: 'Turnstile validatie mislukt'
		})
	}

	if (verification.action && verification.action !== expectedAction) {
		throw createError({
			statusCode: 403,
			statusMessage: 'Turnstile actie komt niet overeen'
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
