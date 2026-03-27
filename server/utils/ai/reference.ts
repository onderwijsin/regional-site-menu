import type { H3Event } from 'h3'

/**
 * Reads a text document from an internal app route within the same Nitro request.
 *
 * This avoids worker-to-self network calls on Cloudflare, which can cause 522
 * timeouts when routing back through the public domain.
 *
 * @param event - Current request context.
 * @param path - Route path to fetch.
 * @returns Plain text when available, otherwise an empty string.
 */
async function fetchInternalTextDocument(event: H3Event, path: string): Promise<string> {
	try {
		const text = await event.$fetch<string>(path, {
			headers: {
				Accept: 'text/plain',
			},
		})

		if (typeof text === 'string' && text.trim()) {
			return text
		}
	} catch {
		// Try fallback path in caller.
	}

	return ''
}

/**
 * Fetches the llms-full reference document from internal routes.
 *
 * @param event - Current request context.
 * @returns Plain text reference document.
 */
export async function fetchLlmsFullReferenceDocument(event: H3Event): Promise<string> {
	const fullText = await fetchInternalTextDocument(event, '/llms-full.txt')
	if (fullText) {
		return fullText
	}

	const fallbackText = await fetchInternalTextDocument(event, '/llms.txt')
	if (fallbackText) {
		return fallbackText
	}

	throw createError({
		statusCode: 500,
		statusMessage: 'Kon llms referentiedocument niet ophalen',
	})
}
