import type { H3Event } from 'h3'

import { AI_OPENAI_CONFIG } from '@constants'
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
			statusMessage: 'OPENAI_API_KEY ontbreekt in runtimeConfig'
		})
	}

	return {
		client: new OpenAI({ apiKey: token }),
		model: config.openai.model || AI_OPENAI_CONFIG.defaultModel
	}
}
