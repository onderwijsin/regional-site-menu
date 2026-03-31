import { AI_ROUTE_REQUEST_CONFIG } from '@ai'
import { AiBriefingRequestSchema, AiBriefingResponseSchema } from '@schema/reportAi'
import { formatBriefingInput } from '@server/utils/ai/briefing'
import { getAiSystemPrompt } from '@server/utils/ai/prompts'
import { resolveAiProvider } from '@server/utils/ai/provider'
import { countWords, sanitizeAiMarkdown } from '@server/utils/ai/text'
import { createServerExecutionTimer } from '@server/utils/observability/timing'
import { assertTurnstileToken } from '@server/utils/security/turnstile'
import { generateText, Output } from 'ai'
import { z } from 'zod'

/**
 * Structured response shape expected from the LLM.
 *
 * We only accept one field (`briefing`) so the model output can be validated
 * deterministically before it enters the UI / PDF pipeline.
 */
const BriefingOutputSchema = z.object({
	briefing: z.union([
		z.string().min(1),
		z.object({
			briefing: z.string().min(1)
		})
	])
})

/**
 * Controller for `POST /api/ai/briefing`.
 *
 * Flow:
 * 1. Parse and validate the inbound payload with Zod.
 * 2. Resolve the editable system prompt from the server prompt registry.
 * 3. Build model input and request structured output from the AI SDK.
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
		const requestConfig = AI_ROUTE_REQUEST_CONFIG.briefingRequest
		timer.mark('request_validated')

		// 2) Load system prompt from server-side prompt content.
		const systemPrompt = await getAiSystemPrompt(event, 'ai-briefing-system')
		timer.mark('system_prompt_loaded')

		// 3) Compose model input from validated request data.
		const { provider, model, languageModel } = resolveAiProvider(event)
		const userPrompt = formatBriefingInput(input)
		timer.mark('request_composed', { model, provider })

		// 4) Request structured output via AI SDK Core.
		let briefing: string
		let briefingSource: 'structured' | 'plain_text_fallback' = 'structured'
		try {
			const { output } = await generateText({
				model: languageModel,
				system: systemPrompt,
				prompt: userPrompt,
				maxOutputTokens: requestConfig.maxOutputTokens,
				temperature: requestConfig.temperature,
				maxRetries: requestConfig.maxRetries,
				output: Output.object({
					schema: BriefingOutputSchema,
					name: 'briefing_output',
					description:
						'Generate a structured Dutch implementation briefing with one markdown field: briefing.'
				})
			})

			const parsedOutput = BriefingOutputSchema.parse(output)
			const briefingValue =
				typeof parsedOutput.briefing === 'string'
					? parsedOutput.briefing
					: parsedOutput.briefing.briefing
			briefing = sanitizeAiMarkdown(briefingValue)
		} catch (error: unknown) {
			const isStructuredOutputMismatch =
				error instanceof Error &&
				error.message.toLowerCase().includes('no object generated')
			if (!isStructuredOutputMismatch) {
				console.error('[AI] briefing generation failed', {
					provider,
					model,
					errorMessage: error instanceof Error ? error.message : undefined
				})
				throw createError({
					statusCode: 502,
					statusMessage: 'AI briefing could not be generated'
				})
			}

			console.warn(
				'[AI] briefing structured output failed, retrying with plain-text fallback mode',
				{
					provider,
					model,
					errorName: error instanceof Error ? error.name : undefined,
					errorMessage: error instanceof Error ? error.message : undefined
				}
			)
			let plainTextFallback = ''
			try {
				const { text } = await generateText({
					model: languageModel,
					system: systemPrompt,
					prompt: userPrompt,
					maxOutputTokens: requestConfig.maxOutputTokens,
					temperature: requestConfig.temperature,
					maxRetries: requestConfig.maxRetries
				})
				plainTextFallback = text.trim()
			} catch (fallbackError: unknown) {
				console.error('[AI] briefing plain-text fallback generation failed', {
					provider,
					model,
					errorMessage: fallbackError instanceof Error ? fallbackError.message : undefined
				})
				throw createError({
					statusCode: 502,
					statusMessage: 'AI briefing could not be generated'
				})
			}

			if (!plainTextFallback) {
				throw createError({
					statusCode: 502,
					statusMessage: 'AI briefing could not be generated'
				})
			}

			briefing = sanitizeAiMarkdown(plainTextFallback)
			briefingSource = 'plain_text_fallback'
		}

		timer.mark('ai_response_received', {
			model,
			provider,
			maxOutputTokens: requestConfig.maxOutputTokens
		})

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
			model,
			provider
		})
		return result
	} catch (error: unknown) {
		timer.fail(error)
		throw error
	}
})
