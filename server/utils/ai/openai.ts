import type { H3Event } from 'h3'

import { AI_OPENAI_CONFIG } from '@ai'
import OpenAI from 'openai'

/**
 * Creates a configured OpenAI client for the current request.
 *
 * @param event - Current server request event.
 * @returns OpenAI client + resolved model name.
 */
export function getOpenAiClient(event: H3Event): { client: OpenAI; model: string } {
	const config = useRuntimeConfig(event)
	const token = config.openai.token

	if (!token) {
		throw createError({
			statusCode: 500,
			statusMessage: 'OPENAI_API_KEY is missing in runtimeConfig'
		})
	}

	return {
		client: new OpenAI({ apiKey: token }),
		model: config.openai.model || AI_OPENAI_CONFIG.defaultModel
	}
}

/**
 * Returns true when OpenAI rejects a request parameter for the active model.
 *
 * @param error - Unknown thrown error.
 * @param parameter - Parameter path reported by OpenAI (e.g. `reasoning.effort`).
 * @returns Whether this is a compatibility API error for the target param.
 */
export function isUnsupportedOpenAiParameterError(error: unknown, parameter: string): boolean {
	if (!error || typeof error !== 'object') {
		return false
	}

	const maybeError = error as { code?: unknown; param?: unknown }
	return (
		(maybeError.code === 'unsupported_parameter' || maybeError.code === 'unsupported_value') &&
		maybeError.param === parameter
	)
}

/**
 * Extracts supported values listed by OpenAI in a compatibility error message.
 *
 * @param error - Unknown thrown error.
 * @returns Supported values from message, in server-reported order.
 */
export function getSupportedOpenAiValuesFromError(error: unknown): string[] {
	if (!error || typeof error !== 'object') {
		return []
	}

	const maybeError = error as { message?: unknown }
	if (typeof maybeError.message !== 'string') {
		return []
	}

	const supportedValuesMatch = maybeError.message.match(/Supported values are:\s*(.+?)(?:\.|$)/i)
	if (!supportedValuesMatch?.[1]) {
		return []
	}

	const values = [...supportedValuesMatch[1].matchAll(/'([^']+)'/g)]
		.map((match) => match[1])
		.filter((value): value is string => typeof value === 'string' && value.length > 0)
	return [...new Set(values)]
}

/**
 * Picks the first value that is both supported and preferred.
 *
 * @param supportedValues - Values reported by the API as supported.
 * @param preferredOrder - Preference order from strongest to weakest.
 * @returns Selected fallback value, or undefined when no overlap exists.
 */
export function pickFirstSupportedOpenAiValue(
	supportedValues: string[],
	preferredOrder: string[]
): string | undefined {
	for (const candidate of preferredOrder) {
		if (supportedValues.includes(candidate)) {
			return candidate
		}
	}

	return undefined
}
