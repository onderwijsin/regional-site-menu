import type { H3Event } from 'h3'

import { AI_REFERENCE_PATHS } from '@ai'

/**
 * Reads a text document from an internal app route within the same Nitro request.
 *
 * @param event - Current request context.
 * @param path - Route path to fetch.
 * @returns Plain text when available, otherwise an empty string.
 */
async function fetchInternalTextDocument(event: H3Event, path: string): Promise<string> {
	try {
		const text = await event.$fetch<string>(path, {
			headers: {
				Accept: 'text/plain'
			}
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
 * @param event - Current request context.
 * @returns Plain text reference document.
 */
export async function fetchLlmsFullReferenceDocument(event: H3Event): Promise<string> {
	const fullText = await fetchInternalTextDocument(event, AI_REFERENCE_PATHS.llmsFull)
	if (fullText) {
		return fullText
	}

	const fallbackText = await fetchInternalTextDocument(event, AI_REFERENCE_PATHS.llms)
	if (fallbackText) {
		return fallbackText
	}

	throw createError({
		statusCode: 500,
		statusMessage: 'Could not fetch llms reference document'
	})
}
