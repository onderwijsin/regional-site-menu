import { AI_OPENAI_CONFIG } from '@ai'
import { AiBriefingRequestSchema, AiBriefingResponseSchema } from '@schema/reportAi'
import { zodTextFormat } from 'openai/helpers/zod'
import { z } from 'zod'

import { formatBriefingInput } from '../../utils/ai/briefing'
import { getOpenAiClient } from '../../utils/ai/openai'
import { getAiSystemPrompt } from '../../utils/ai/prompts'
import {
	extractResponseRefusalText,
	readRecordField,
	requestWithOpenAiCompatibility,
	shouldRetryAfterTokenLimitIncomplete
} from '../../utils/ai/response'
import { countWords, sanitizeAiMarkdown } from '../../utils/ai/text'
import { createServerExecutionTimer } from '../../utils/observability/timing'
import { assertTurnstileToken } from '../../utils/security/turnstile'

/**
 * Structured response shape expected from the LLM.
 *
 * We only accept one field (`briefing`) so the model output can be validated
 * deterministically before it enters the UI / PDF pipeline.
 */
const BriefingOutputSchema = z.object({
	briefing: z.string().min(1)
})

/**
 * Controller for `POST /api/ai/briefing`.
 *
 * Flow:
 * 1. Parse and validate the inbound payload with Zod.
 * 2. Resolve the editable system prompt from the server prompt registry.
 * 3. Build model input and request structured output from OpenAI.
 * 4. Normalize markdown text and compute word count.
 * 5. Validate and return the public API response shape.
 *
 * This route intentionally acts as a domain controller only; formatting and prompt
 * composition live in `server/utils/ai/*`.
 *
 * @returns Briefing text + metadata.
 */
export default defineEventHandler(async (event) => {
	const timer = createServerExecutionTimer('POST /api/ai/briefing')

	try {
		await assertTurnstileToken(event, 'ai_briefing')
		timer.mark('turnstile_verified')

		// 1) Boundary validation: fail fast on malformed payloads.
		const body = await readBody(event)
		const input = AiBriefingRequestSchema.parse(body)
		timer.mark('request_validated')

		// 2) Load system prompt from server-side prompt content.
		const systemPrompt = await getAiSystemPrompt(event, 'ai-briefing-system')
		timer.mark('system_prompt_loaded')

		// 3) Compose model input from validated request data.
		const { client, model } = getOpenAiClient(event)
		const userPrompt = formatBriefingInput(input)
		timer.mark('request_composed')

		// 4) Request a structured response so parsing is deterministic.
		/**
		 * Requests briefing output with compatibility fallbacks.
		 *
		 * Behavior:
		 * - starts with structured output (`responses.parse`)
		 * - degrades unsupported reasoning/verbosity params/values
		 * - falls back to plain-text mode (`responses.create`) when structured parse
		 *   fails at SDK JSON parse level
		 *
		 * @param options - Request tuning values.
		 * @returns OpenAI response object normalized to include `output_parsed` key.
		 */
		const requestBriefingResponse = async (options: {
			maxOutputTokens: number
			includeReasoning: boolean
			reasoningEffort: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'
			verbosity: 'low' | 'medium' | 'high'
		}): Promise<Awaited<ReturnType<typeof client.responses.parse>>> => {
			return await requestWithOpenAiCompatibility({
				label: 'briefing',
				maxOutputTokens: options.maxOutputTokens,
				includeReasoning: options.includeReasoning,
				reasoningEffort: options.reasoningEffort,
				verbosity: options.verbosity,
				requestStructured: async ({
					maxOutputTokens,
					includeReasoning,
					reasoningEffort,
					includeVerbosity,
					verbosity
				}) =>
					await client.responses.parse(
						{
							model,
							max_output_tokens: maxOutputTokens,
							...(includeReasoning
								? {
										reasoning: {
											effort: reasoningEffort
										}
									}
								: {}),
							input: [
								{
									role: 'system',
									content: systemPrompt
								},
								{
									role: 'user',
									content: userPrompt
								}
							],
							text: {
								...(includeVerbosity ? { verbosity } : {}),
								format: zodTextFormat(BriefingOutputSchema, 'briefing_output')
							}
						},
						{
							maxRetries: AI_OPENAI_CONFIG.briefingRequest.maxRetries
						}
					),
				requestPlain: async ({
					maxOutputTokens,
					includeReasoning,
					reasoningEffort,
					includeVerbosity,
					verbosity
				}) => {
					const plainResponse = await client.responses.create(
						{
							model,
							max_output_tokens: maxOutputTokens,
							...(includeReasoning
								? {
										reasoning: {
											effort: reasoningEffort
										}
									}
								: {}),
							input: [
								{
									role: 'system',
									content: systemPrompt
								},
								{
									role: 'user',
									content: userPrompt
								}
							],
							text: includeVerbosity ? { verbosity } : undefined
						},
						{
							maxRetries: AI_OPENAI_CONFIG.briefingRequest.maxRetries
						}
					)

					return {
						...plainResponse,
						output_parsed: null
					} as Awaited<ReturnType<typeof client.responses.parse>>
				}
			})
		}

		let didRetryAfterIncomplete = false
		let response = await requestBriefingResponse({
			maxOutputTokens: AI_OPENAI_CONFIG.briefingRequest.maxOutputTokens,
			includeReasoning: true,
			reasoningEffort: AI_OPENAI_CONFIG.briefingRequest.reasoningEffort,
			verbosity: AI_OPENAI_CONFIG.briefingRequest.verbosity
		})
		timer.mark('openai_response_received')

		if (shouldRetryAfterTokenLimitIncomplete(response)) {
			didRetryAfterIncomplete = true
			console.warn('[AI] briefing retrying after incomplete max_output_tokens response', {
				model,
				initialMaxOutputTokens: AI_OPENAI_CONFIG.briefingRequest.maxOutputTokens,
				retryMaxOutputTokens:
					AI_OPENAI_CONFIG.briefingRequest.maxOutputTokensOnIncompleteRetry
			})

			response = await requestBriefingResponse({
				maxOutputTokens: AI_OPENAI_CONFIG.briefingRequest.maxOutputTokensOnIncompleteRetry,
				includeReasoning: AI_OPENAI_CONFIG.briefingRequest.retryWithReasoningOnIncomplete,
				reasoningEffort: AI_OPENAI_CONFIG.briefingRequest.incompleteRetryReasoningEffort,
				verbosity: AI_OPENAI_CONFIG.briefingRequest.incompleteRetryVerbosity
			})
			timer.mark('openai_response_retry_received')
		}

		let briefing: string
		let briefingSource: 'structured' | 'json_text_fallback' | 'plain_text_fallback'
		if (response.output_parsed) {
			const parsedOutput = BriefingOutputSchema.parse(response.output_parsed)
			briefing = sanitizeAiMarkdown(parsedOutput.briefing)
			briefingSource = 'structured'
		} else {
			const fallbackText = response.output_text?.trim()
			if (fallbackText) {
				const parsedFromJsonText = tryParseBriefingOutputFromText(fallbackText)
				if (parsedFromJsonText) {
					briefing = sanitizeAiMarkdown(parsedFromJsonText.briefing)
					briefingSource = 'json_text_fallback'
					console.warn(
						'[AI] briefing used JSON-text fallback after empty structured parse result',
						{
							model
						}
					)
				} else {
					briefing = sanitizeAiMarkdown(fallbackText)
					briefingSource = 'plain_text_fallback'
					console.warn(
						'[AI] briefing used plain-text fallback after empty structured parse result',
						{
							model
						}
					)
				}
			} else {
				console.error('[AI] briefing returned no structured output and no output_text', {
					model,
					status: response.status,
					incompleteDetails: readRecordField(response, 'incomplete_details'),
					refusal: extractResponseRefusalText(response)
				})
				throw createError({
					statusCode: 502,
					statusMessage: 'AI briefing could not be generated'
				})
			}
		}

		const wordCount = countWords(briefing)
		timer.mark('response_normalized', {
			briefingSource,
			wordCount
		})

		const result = AiBriefingResponseSchema.parse({
			briefing,
			wordCount
		})
		timer.mark('response_validated')
		timer.done({
			didRetryAfterIncomplete
		})
		return result
	} catch (error: unknown) {
		timer.fail(error)
		throw error
	}
})

/**
 * Tries to parse structured briefing payload from a text response.
 *
 * @param text - Raw output text.
 * @returns Structured output when valid, otherwise null.
 */
function tryParseBriefingOutputFromText(
	text: string
): (typeof BriefingOutputSchema)['_output'] | null {
	const normalized = sanitizeAiMarkdown(text)

	try {
		const parsedJson = JSON.parse(normalized)
		const parsed = BriefingOutputSchema.safeParse(parsedJson)
		return parsed.success ? parsed.data : null
	} catch {
		return null
	}
}
