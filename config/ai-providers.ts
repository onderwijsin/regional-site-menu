import type { LanguageModel } from 'ai'

import { createMistral } from '@ai-sdk/mistral'
import { createOpenAI } from '@ai-sdk/openai'

export const AI_PROVIDER_IDS = ['openai', 'mistral'] as const
export type AiProviderName = (typeof AI_PROVIDER_IDS)[number]

type RuntimeProviderConfig = {
	/** Provider API token read from runtime config. */
	token?: string
	/** Optional provider-wide model override from runtime config. */
	model?: string
}

type RuntimeConfigLike = {
	/** Runtime config segment for OpenAI provider values. */
	openai?: RuntimeProviderConfig
	/** Runtime config segment for Mistral provider values. */
	mistral?: RuntimeProviderConfig
}

type AiProviderDefinition = {
	/** Error message thrown when the provider token is missing. */
	missingTokenMessage: string
	/** Static fallback model when no runtime model override is provided. */
	defaultModel: string
	/** Reads this provider's token/model from the full runtime config object. */
	readRuntimeConfig: (_runtimeConfig: RuntimeConfigLike) => RuntimeProviderConfig
	/** Creates an AI SDK language model instance for this provider and model id. */
	createLanguageModel: (_args: { token: string; model: string }) => LanguageModel
}

/**
 * Central provider registry used by AI provider resolution.
 *
 * Add new providers here so resolver logic stays generic and extendable.
 */
export const AI_PROVIDER_CONFIG = {
	openai: {
		/** Error message used when OPENAI_API_KEY is not configured. */
		missingTokenMessage: 'Missing OPENAI_API_KEY for OpenAI provider',
		/** Default OpenAI model used when OPENAI_MODEL is not set. */
		defaultModel: 'gpt-5-mini',
		/** Reads OpenAI token/model fields from runtime config. */
		readRuntimeConfig: (runtimeConfig) => ({
			token: runtimeConfig.openai?.token,
			model: runtimeConfig.openai?.model
		}),
		/** Creates a model instance using the OpenAI provider factory. */
		createLanguageModel: ({ token, model }) => {
			const openai = createOpenAI({ apiKey: token })
			return openai(model)
		}
	},
	mistral: {
		/** Error message used when MISTRAL_API_KEY is not configured. */
		missingTokenMessage: 'Missing MISTRAL_API_KEY for Mistral provider',
		/** Default Mistral model used when MISTRAL_MODEL is not set. */
		defaultModel: 'mistral-small-latest',
		/** Reads Mistral token/model fields from runtime config. */
		readRuntimeConfig: (runtimeConfig) => ({
			token: runtimeConfig.mistral?.token,
			model: runtimeConfig.mistral?.model
		}),
		/** Creates a model instance using the Mistral provider factory. */
		createLanguageModel: ({ token, model }) => {
			const mistral = createMistral({ apiKey: token })
			return mistral(model)
		}
	}
} as const satisfies Record<AiProviderName, AiProviderDefinition>
