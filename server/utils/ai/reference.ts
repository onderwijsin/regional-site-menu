import type { H3Event } from 'h3'

/**
 * Fetches the llms-full reference document from the app route.
 *
 * @param event - Current request context.
 * @returns Plain text reference document.
 */
export async function fetchLlmsFullReferenceDocument(event: H3Event): Promise<string> {
	const requestUrl = getRequestURL(event)
	const fullUrl = new URL('/llms-full.txt', requestUrl).toString()

	try {
		const text = await $fetch<string>(fullUrl, {
			headers: {
				Accept: 'text/plain',
			},
		})

		if (text.trim()) {
			return text
		}
	} catch {
		// Fallback below.
	}

	const fallbackUrl = new URL('/llms.txt', requestUrl).toString()
	const fallbackText = await $fetch<string>(fallbackUrl, {
		headers: {
			Accept: 'text/plain',
		},
	})

	if (!fallbackText.trim()) {
		throw createError({
			statusCode: 500,
			statusMessage: 'Kon llms referentiedocument niet ophalen',
		})
	}

	return fallbackText
}
