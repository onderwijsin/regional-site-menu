import type { H3Event } from 'h3'

const STATIC_LLMS_FULL_PATH = '/ai-reference/llms-full.static.txt'
const STATIC_LLMS_PATH = '/ai-reference/llms.static.txt'
const DYNAMIC_LLMS_FULL_PATH = '/llms-full.txt'
const DYNAMIC_LLMS_PATH = '/llms.txt'

type AssetsBinding = {
	fetch: typeof globalThis.fetch
}

function getAssetsBinding(event: H3Event): AssetsBinding | null {
	const assets = (event.context as { cloudflare?: { env?: { ASSETS?: unknown } } }).cloudflare
		?.env?.ASSETS
	if (assets && typeof (assets as AssetsBinding).fetch === 'function') {
		return assets as AssetsBinding
	}

	return null
}

/**
 * Reads a text document from Cloudflare's static `ASSETS` binding.
 *
 * This bypasses Nitro route matching, so it cannot hit catch-all content pages.
 *
 * @param event - Current request context.
 * @param path - Absolute public path to fetch.
 * @returns Plain text when available, otherwise an empty string.
 */
async function fetchTextDocumentFromAssetsBinding(event: H3Event, path: string): Promise<string> {
	const assets = getAssetsBinding(event)
	if (!assets) {
		return ''
	}

	try {
		const url = new URL(path, 'https://assets.local')
		const response = await assets.fetch(url.toString(), {
			headers: {
				Accept: 'text/plain',
			},
		})

		if (!response.ok) {
			return ''
		}

		const text = await response.text()
		if (text.trim()) {
			return text
		}
	} catch {
		// Try fallback in caller.
	}

	return ''
}

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
	const fullText = await fetchTextDocumentFromAssetsBinding(event, STATIC_LLMS_FULL_PATH)
	if (fullText) {
		return fullText
	}

	const fallbackText = await fetchTextDocumentFromAssetsBinding(event, STATIC_LLMS_PATH)
	if (fallbackText) {
		return fallbackText
	}

	// In local dev there is no Cloudflare `ASSETS` binding, so we use route fetch.
	if (import.meta.dev) {
		const staticFullText = await fetchInternalTextDocument(event, STATIC_LLMS_FULL_PATH)
		if (staticFullText) {
			return staticFullText
		}

		const staticFallbackText = await fetchInternalTextDocument(event, STATIC_LLMS_PATH)
		if (staticFallbackText) {
			return staticFallbackText
		}

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
