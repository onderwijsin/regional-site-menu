import type { H3Event } from 'h3'

import { AI_REFERENCE_PATHS } from '@ai'
import * as Sentry from '@sentry/nuxt'

/**
 * Reads a text document from an internal app route within the same Nitro request.
 *
 * @param event - Current request context.
 * @param path - Route path to fetch.
 * @returns Plain text when available, otherwise an empty string.
 */
async function fetchInternalTextDocument(
	event: H3Event,
	path: string
): Promise<{ text: string; didFail: boolean }> {
	try {
		const text = await event.$fetch<string>(path, {
			headers: {
				Accept: 'text/plain'
			}
		})

		if (typeof text === 'string' && text.trim()) {
			return { text, didFail: false }
		}
	} catch {
		return { text: '', didFail: true }
	}

	return { text: '', didFail: false }
}

/**
 * Fetches the LLM reference document for AI analysis.
 *
 * @param event - Current request context.
 * @returns Plain text reference document.
 */
export async function fetchLlmsFullReferenceDocument(event: H3Event): Promise<string> {
	const fullResult = await fetchInternalTextDocument(event, AI_REFERENCE_PATHS.llmsFull)
	const fullText = fullResult.text
	if (fullText) {
		return fullText
	}

	const fallbackResult = await fetchInternalTextDocument(event, AI_REFERENCE_PATHS.llms)
	const fallbackText = fallbackResult.text
	if (fallbackText) {
		if (fullResult.didFail) {
			Sentry.withScope((scope) => {
				scope.setLevel('warning')
				scope.setTag('area', 'ai')
				scope.setTag('kind', 'reference_fallback')
				scope.setTag('reference_source', 'llms')
				scope.setContext('ai_reference_fallback', {
					primaryPath: AI_REFERENCE_PATHS.llmsFull,
					fallbackPath: AI_REFERENCE_PATHS.llms
				})
				Sentry.captureMessage('[AI] llms-full fetch failed, fell back to llms')
			})
		}

		return fallbackText
	}

	throw createError({
		statusCode: 500,
		statusMessage: 'Could not fetch llms reference document'
	})
}
