import { AI_OPENAI_CONFIG } from '@ai'
import { AiBriefingRequestSchema, AiBriefingResponseSchema } from '@schema/reportAi'
import * as Sentry from '@sentry/nuxt'
import { zodTextFormat } from 'openai/helpers/zod'
import { z } from 'zod'

import { formatBriefingInput } from '../../utils/ai/briefing'
import { getOpenAiClient } from '../../utils/ai/openai'
import { getAiSystemPrompt } from '../../utils/ai/prompts'
import { extractResponseRefusalText, readRecordField } from '../../utils/ai/response'
import { requestAiRouteResponseWithRetry } from '../../utils/ai/route-request'
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
		const requestConfig = AI_OPENAI_CONFIG.briefingRequest
		timer.mark('request_validated')

		// 2) Load system prompt from server-side prompt content.
		const systemPrompt = await getAiSystemPrompt(event, 'ai-briefing-system')
		timer.mark('system_prompt_loaded')

		// 3) Compose model input from validated request data.
		const { client, model } = getOpenAiClient(event, { useCase: 'briefing' })
		const userPrompt = formatBriefingInput(input)
		timer.mark('request_composed', { model })

		// 4) Request a structured response so parsing is deterministic.
		const { response, didRetryAfterIncomplete } = await requestAiRouteResponseWithRetry({
			label: 'briefing',
			model,
			requestConfig,
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
						maxRetries: requestConfig.maxRetries
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
						maxRetries: requestConfig.maxRetries
					}
				)

				return {
					...plainResponse,
					output_parsed: null
				} as Awaited<ReturnType<typeof client.responses.parse>>
			},
			onResponseReceived: ({ isRetry, maxOutputTokens, reasoningEffort, verbosity }) => {
				timer.mark(
					isRetry ? 'openai_response_retry_received' : 'openai_response_received',
					{
						model,
						maxOutputTokens,
						reasoningEffort,
						verbosity
					}
				)
			}
		})

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
					Sentry.withScope((scope) => {
						scope.setLevel('warning')
						scope.setTag('area', 'ai')
						scope.setTag('kind', 'response_fallback')
						scope.setTag('ai_label', 'briefing')
						scope.setTag('ai_model', model)
						scope.setTag('response_fallback_type', 'json_text_fallback')
						Sentry.captureMessage(
							'[AI] briefing used JSON-text fallback after empty structured parse result'
						)
					})
				} else {
					briefing = sanitizeAiMarkdown(fallbackText)
					briefingSource = 'plain_text_fallback'
					console.warn(
						'[AI] briefing used plain-text fallback after empty structured parse result',
						{
							model
						}
					)
					Sentry.withScope((scope) => {
						scope.setLevel('warning')
						scope.setTag('area', 'ai')
						scope.setTag('kind', 'response_fallback')
						scope.setTag('ai_label', 'briefing')
						scope.setTag('ai_model', model)
						scope.setTag('response_fallback_type', 'plain_text_fallback')
						Sentry.captureMessage(
							'[AI] briefing used plain-text fallback after empty structured parse result'
						)
					})
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
			didRetryAfterIncomplete,
			model
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
