import type { AiPromptKey } from '@schema/fields'
import type { H3Event } from 'h3'

import { AI_SYSTEM_PROMPTS } from './prompt-content'

export type AiSystemPromptKey = AiPromptKey

/**
 * Resolves a system prompt from the runtime-safe prompt registry in `server/utils`.
 *
 * @param event - Current request context (kept for call-site compatibility).
 * @param key - Stable prompt key.
 * @returns Prompt text.
 */
export async function getAiSystemPrompt(_event: H3Event, key: AiSystemPromptKey): Promise<string> {
	const prompt = AI_SYSTEM_PROMPTS[key]?.trim()

	if (!prompt) {
		throw createError({
			statusCode: 500,
			statusMessage: `Prompt niet gevonden: ${key}`,
		})
	}

	return prompt
}
