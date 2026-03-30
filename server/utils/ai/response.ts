import * as Sentry from '@sentry/nuxt'

import {
	getSupportedOpenAiValuesFromError,
	isUnsupportedOpenAiParameterError,
	pickFirstSupportedOpenAiValue
} from './openai'

export type OpenAiReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'
export type OpenAiVerbosity = 'low' | 'medium' | 'high'

type OpenAiCompatibilityOptions = {
	maxOutputTokens: number
	includeReasoning: boolean
	reasoningEffort: OpenAiReasoningEffort
	includeVerbosity: boolean
	verbosity: OpenAiVerbosity
}

type RequestWithOpenAiCompatibilityArgs<TResponse> = {
	label: string
	model: string
	maxOutputTokens: number
	includeReasoning: boolean
	reasoningEffort: OpenAiReasoningEffort
	verbosity: OpenAiVerbosity
	// eslint-disable-next-line no-unused-vars
	requestStructured(options: OpenAiCompatibilityOptions): Promise<TResponse>
	// eslint-disable-next-line no-unused-vars
	requestPlain(options: OpenAiCompatibilityOptions): Promise<TResponse>
}

/**
 * Requests an OpenAI response with compatibility fallbacks for model/runtime
 * differences around structured parsing, reasoning effort and verbosity.
 *
 * @param args - Request options and executors for structured/plain calls.
 * @returns OpenAI response shape from caller-provided executors.
 */
export async function requestWithOpenAiCompatibility<TResponse>(
	args: RequestWithOpenAiCompatibilityArgs<TResponse>
): Promise<TResponse> {
	let includeReasoning = args.includeReasoning
	let includeVerbosity = true
	let reasoningEffort = args.reasoningEffort
	let verbosity = args.verbosity
	let useStructuredOutput = true

	while (true) {
		try {
			const options: OpenAiCompatibilityOptions = {
				maxOutputTokens: args.maxOutputTokens,
				includeReasoning,
				reasoningEffort,
				includeVerbosity,
				verbosity
			}

			if (useStructuredOutput) {
				return await args.requestStructured(options)
			}

			return await args.requestPlain(options)
		} catch (error: unknown) {
			if (useStructuredOutput && isStructuredOutputJsonParseError(error)) {
				useStructuredOutput = false
				console.warn(
					`[AI] ${args.label} structured parse failed, retrying with plain-text response mode`
				)
				captureAiCompatibilityFallback('structured_parse_to_plain_text', {
					label: args.label,
					model: args.model,
					maxOutputTokens: args.maxOutputTokens,
					errorMessage: readErrorMessage(error)
				})
				continue
			}

			if (includeReasoning && isUnsupportedOpenAiParameterError(error, 'reasoning.effort')) {
				const supportedValues = getSupportedOpenAiValuesFromError(error)
				const reasoningFallback = pickFirstSupportedOpenAiValue(supportedValues, [
					'high',
					'medium',
					'low',
					'minimal',
					'none'
				])

				if (reasoningFallback && reasoningFallback !== reasoningEffort) {
					reasoningEffort = reasoningFallback as OpenAiReasoningEffort
					console.warn(
						`[AI] ${args.label} retrying with fallback reasoning.effort value`,
						{
							reasoningEffort
						}
					)
					captureAiCompatibilityFallback('reasoning_effort_value_fallback', {
						label: args.label,
						model: args.model,
						maxOutputTokens: args.maxOutputTokens,
						reasoningEffort,
						errorMessage: readErrorMessage(error)
					})
					continue
				}

				includeReasoning = false
				console.warn(
					`[AI] ${args.label} retrying without reasoning.effort for model compatibility`
				)
				captureAiCompatibilityFallback('reasoning_effort_disabled', {
					label: args.label,
					model: args.model,
					maxOutputTokens: args.maxOutputTokens,
					errorMessage: readErrorMessage(error)
				})
				continue
			}

			if (includeVerbosity && isUnsupportedOpenAiParameterError(error, 'text.verbosity')) {
				const supportedValues = getSupportedOpenAiValuesFromError(error)
				const verbosityFallback = pickFirstSupportedOpenAiValue(supportedValues, [
					'high',
					'medium',
					'low'
				])

				if (verbosityFallback && verbosityFallback !== verbosity) {
					verbosity = verbosityFallback as OpenAiVerbosity
					console.warn(`[AI] ${args.label} retrying with fallback text.verbosity value`, {
						verbosity
					})
					captureAiCompatibilityFallback('verbosity_value_fallback', {
						label: args.label,
						model: args.model,
						maxOutputTokens: args.maxOutputTokens,
						verbosity,
						errorMessage: readErrorMessage(error)
					})
					continue
				}

				includeVerbosity = false
				console.warn(
					`[AI] ${args.label} retrying without text.verbosity for model compatibility`
				)
				captureAiCompatibilityFallback('verbosity_disabled', {
					label: args.label,
					model: args.model,
					maxOutputTokens: args.maxOutputTokens,
					errorMessage: readErrorMessage(error)
				})
				continue
			}

			throw error
		}
	}
}

/**
 * Returns true when model output is incomplete due output-token exhaustion.
 *
 * @param response - Responses API payload.
 * @returns Whether a higher-token retry is warranted.
 */
export function shouldRetryAfterTokenLimitIncomplete(response: unknown): boolean {
	const status = readRecordField(response, 'status')
	if (status !== 'incomplete') {
		return false
	}

	const hasParsedOutput = Boolean(readRecordField(response, 'output_parsed'))
	const outputText = readRecordField(response, 'output_text')
	const hasOutputText = typeof outputText === 'string' && outputText.trim().length > 0
	if (hasParsedOutput || hasOutputText) {
		return false
	}

	const incompleteDetails = readRecordField(response, 'incomplete_details')
	const reason = readRecordField(incompleteDetails, 'reason')
	return reason === 'max_output_tokens'
}

/**
 * Best-effort extraction of refusal text from response output items.
 *
 * @param response - Parsed responses API payload.
 * @returns Refusal text when present.
 */
export function extractResponseRefusalText(response: unknown): string | null {
	const outputItems = readRecordField(response, 'output')
	if (!Array.isArray(outputItems)) {
		return null
	}

	for (const item of outputItems) {
		const content = readRecordField(item, 'content')
		if (!Array.isArray(content)) {
			continue
		}

		for (const part of content) {
			if (readRecordField(part, 'type') === 'refusal') {
				const refusal = readRecordField(part, 'refusal')
				if (typeof refusal === 'string' && refusal.trim()) {
					return refusal.trim()
				}
			}
		}
	}

	return null
}

/**
 * Reads an object field safely from unknown values.
 *
 * @param value - Unknown value.
 * @param key - Field key.
 * @returns Field value or undefined.
 */
export function readRecordField(value: unknown, key: string): unknown {
	if (!value || typeof value !== 'object') {
		return undefined
	}

	return (value as Record<string, unknown>)[key]
}

/**
 * Returns true when the OpenAI SDK fails to parse structured JSON output text.
 *
 * @param error - Unknown thrown error.
 * @returns Whether this is a structured-output JSON parse failure.
 */
function isStructuredOutputJsonParseError(error: unknown): boolean {
	if (!(error instanceof SyntaxError)) {
		return false
	}

	return error.message.toLowerCase().includes('json')
}

function readErrorMessage(error: unknown): string | undefined {
	return error instanceof Error ? error.message : undefined
}

/**
 * Captures compatibility fallback behavior in Sentry as warning telemetry.
 *
 * @param type - Stable fallback identifier.
 * @param meta - Additional structured metadata.
 * @returns Nothing.
 */
function captureAiCompatibilityFallback(type: string, meta: Record<string, unknown>): void {
	Sentry.withScope((scope) => {
		scope.setLevel('warning')
		scope.setTag('area', 'ai')
		scope.setTag('kind', 'compatibility_fallback')
		scope.setTag('fallback_type', type)
		scope.setContext('ai_fallback', meta)

		Sentry.captureMessage(`[AI] compatibility fallback: ${type}`)
	})
}
