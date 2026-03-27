import type { H3Event } from 'h3'

const STATIC_LLMS_FULL_PATH = '/ai-reference/llms-full.static.txt'
const STATIC_LLMS_PATH = '/ai-reference/llms.static.txt'
const DYNAMIC_LLMS_FULL_PATH = '/llms-full.txt'
const DYNAMIC_LLMS_PATH = '/llms.txt'

/**
 * Reads a text document from an internal app route within the same Nitro request.
 *
 * This avoids worker-to-self network calls on Cloudflare.
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
 * Fetches the LLM reference document for AI analysis.
 *
 * In production this only reads from static build snapshots under
 * `/.output/public/ai-reference/*` to avoid Nuxt Content runtime queries.
 * In development, it falls back to dynamic llms routes for convenience.
 *
 * @param event - Current request context.
 * @returns Plain text reference document.
 */
export async function fetchLlmsFullReferenceDocument(event: H3Event): Promise<string> {
	const fullText = await fetchInternalTextDocument(event, STATIC_LLMS_FULL_PATH)
	if (fullText) {
		return fullText
	}

	const fallbackText = await fetchInternalTextDocument(event, STATIC_LLMS_PATH)
	if (fallbackText) {
		return fallbackText
	}

	if (import.meta.dev) {
		const devFullText = await fetchInternalTextDocument(event, DYNAMIC_LLMS_FULL_PATH)
		if (devFullText) {
			return devFullText
		}

		const devFallbackText = await fetchInternalTextDocument(event, DYNAMIC_LLMS_PATH)
		if (devFallbackText) {
			return devFallbackText
		}
	}

	throw createError({
		statusCode: 500,
		statusMessage:
			'Kon statisch llms referentiedocument niet ophalen; build snapshot ontbreekt of is leeg',
	})
}
