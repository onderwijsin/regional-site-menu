import type { LanguageModel } from 'ai'
import type { H3Event } from 'h3'

import { AI_PROVIDER_CONFIG, AI_PROVIDER_IDS } from '~~/config/ai-providers'

type AiProviderName = (typeof AI_PROVIDER_IDS)[number]

type ResolvedAiProvider = {
	provider: AiProviderName
	model: string
	languageModel: LanguageModel
}

/**
 * Resolves the configured AI provider and model for the current request.
 *
 * @param event - Current server request event.
 * @returns Selected provider, model id, and AI SDK language model instance.
 */
export function resolveAiProvider(event: H3Event): ResolvedAiProvider {
	const config = useRuntimeConfig(event)
	const provider = resolveAiProviderName(config.ai?.provider)
	const providerConfig = AI_PROVIDER_CONFIG[provider]
	const runtimeProviderConfig = providerConfig.readRuntimeConfig(config)
	const token = runtimeProviderConfig.token
	if (!token) {
		throw createError({
			statusCode: 500,
			statusMessage: providerConfig.missingTokenMessage
		})
	}

	const model = runtimeProviderConfig.model || providerConfig.defaultModel
	return {
		provider,
		model,
		languageModel: providerConfig.createLanguageModel({ token, model })
	}
}

/**
 * Resolves supported AI provider value from runtime config.
 *
 * @param value - Raw runtime provider value.
 * @returns Normalized supported provider name.
 */
function resolveAiProviderName(value: unknown): AiProviderName {
	const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
	if (!normalized) {
		return 'openai'
	}

	if ((AI_PROVIDER_IDS as readonly string[]).includes(normalized)) {
		return normalized as AiProviderName
	}

	throw createError({
		statusCode: 500,
		statusMessage: `Unsupported AI_PROVIDER value: ${normalized}`
	})
}
