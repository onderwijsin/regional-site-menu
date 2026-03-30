import type { OpenAiReasoningEffort, OpenAiVerbosity } from './response'

import * as Sentry from '@sentry/nuxt'

import { requestWithOpenAiCompatibility, shouldRetryAfterTokenLimitIncomplete } from './response'

/**
 * OpenAI request tuning values used by AI route controllers.
 */
export type AiRouteRequestConfig = {
	maxOutputTokens: number
	maxOutputTokensOnIncompleteRetry: number
	retryWithReasoningOnIncomplete: boolean
	reasoningEffort: OpenAiReasoningEffort
	incompleteRetryReasoningEffort: OpenAiReasoningEffort
	verbosity: OpenAiVerbosity
	incompleteRetryVerbosity: OpenAiVerbosity
}

/**
 * Compatibility request options resolved per call attempt.
 */
type AiRouteCompatibilityRequestOptions = {
	maxOutputTokens: number
	includeReasoning: boolean
	reasoningEffort: OpenAiReasoningEffort
	includeVerbosity: boolean
	verbosity: OpenAiVerbosity
}

type AiRouteResponseObservedMetadata = {
	isRetry: boolean
	maxOutputTokens: number
	reasoningEffort: OpenAiReasoningEffort
	verbosity: OpenAiVerbosity
}

type RequestAiRouteResponseArgs<TResponse> = {
	label: string
	model: string
	requestConfig: AiRouteRequestConfig
	// eslint-disable-next-line no-unused-vars
	requestStructured(options: AiRouteCompatibilityRequestOptions): Promise<TResponse>
	// eslint-disable-next-line no-unused-vars
	requestPlain(options: AiRouteCompatibilityRequestOptions): Promise<TResponse>
	// eslint-disable-next-line no-unused-vars
	onResponseReceived?: (args: AiRouteResponseObservedMetadata) => void
}

/**
 * Executes one AI route request with shared compatibility behavior and token-limit retry.
 *
 * Shared behavior:
 * - starts in structured mode
 * - falls back for unsupported reasoning/verbosity parameters
 * - degrades to plain text mode on structured JSON parse failures
 * - retries once with higher token budget when response is incomplete due token limits
 *
 * @param args - Request callbacks and route-specific config.
 * @returns Response payload and retry metadata.
 */
export async function requestAiRouteResponseWithRetry<TResponse>(
	args: RequestAiRouteResponseArgs<TResponse>
): Promise<{ response: TResponse; didRetryAfterIncomplete: boolean }> {
	const requestOnce = async (options: {
		maxOutputTokens: number
		includeReasoning: boolean
		reasoningEffort: OpenAiReasoningEffort
		verbosity: OpenAiVerbosity
	}): Promise<TResponse> => {
		return await requestWithOpenAiCompatibility({
			label: args.label,
			model: args.model,
			maxOutputTokens: options.maxOutputTokens,
			includeReasoning: options.includeReasoning,
			reasoningEffort: options.reasoningEffort,
			verbosity: options.verbosity,
			requestStructured: args.requestStructured,
			requestPlain: args.requestPlain
		})
	}

	let didRetryAfterIncomplete = false
	let response = await requestOnce({
		maxOutputTokens: args.requestConfig.maxOutputTokens,
		includeReasoning: true,
		reasoningEffort: args.requestConfig.reasoningEffort,
		verbosity: args.requestConfig.verbosity
	})
	args.onResponseReceived?.({
		isRetry: false,
		maxOutputTokens: args.requestConfig.maxOutputTokens,
		reasoningEffort: args.requestConfig.reasoningEffort,
		verbosity: args.requestConfig.verbosity
	})

	if (!shouldRetryAfterTokenLimitIncomplete(response)) {
		return { response, didRetryAfterIncomplete }
	}

	didRetryAfterIncomplete = true
	console.warn(`[AI] ${args.label} retrying after incomplete max_output_tokens response`, {
		model: args.model,
		initialMaxOutputTokens: args.requestConfig.maxOutputTokens,
		retryMaxOutputTokens: args.requestConfig.maxOutputTokensOnIncompleteRetry
	})
	Sentry.withScope((scope) => {
		scope.setLevel('warning')
		scope.setTag('area', 'ai')
		scope.setTag('kind', 'incomplete_retry')
		scope.setTag('ai_label', args.label)
		scope.setTag('ai_model', args.model)
		scope.setContext('ai_incomplete_retry', {
			label: args.label,
			model: args.model,
			initialMaxOutputTokens: args.requestConfig.maxOutputTokens,
			retryMaxOutputTokens: args.requestConfig.maxOutputTokensOnIncompleteRetry
		})
		Sentry.captureMessage('[AI] retry after incomplete max_output_tokens response')
	})

	response = await requestOnce({
		maxOutputTokens: args.requestConfig.maxOutputTokensOnIncompleteRetry,
		includeReasoning: args.requestConfig.retryWithReasoningOnIncomplete,
		reasoningEffort: args.requestConfig.incompleteRetryReasoningEffort,
		verbosity: args.requestConfig.incompleteRetryVerbosity
	})
	args.onResponseReceived?.({
		isRetry: true,
		maxOutputTokens: args.requestConfig.maxOutputTokensOnIncompleteRetry,
		reasoningEffort: args.requestConfig.incompleteRetryReasoningEffort,
		verbosity: args.requestConfig.incompleteRetryVerbosity
	})

	return { response, didRetryAfterIncomplete }
}
