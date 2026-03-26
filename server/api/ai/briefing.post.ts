import { AiBriefingRequestSchema, AiBriefingResponseSchema } from '@schema/reportAi'
import { zodTextFormat } from 'openai/helpers/zod'
import { z } from 'zod'

import { formatBriefingInput } from '../../utils/ai/briefing'
import { getOpenAiClient } from '../../utils/ai/openai'
import { getAiSystemPrompt } from '../../utils/ai/prompts'
import { countWords, sanitizeAiMarkdown } from '../../utils/ai/text'

/**
 * Structured response shape expected from the LLM.
 *
 * We only accept one field (`briefing`) so the model output can be validated
 * deterministically before it enters the UI / PDF pipeline.
 */
const BriefingOutputSchema = z.object({
	briefing: z.string().min(1),
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
	// 1) Boundary validation: fail fast on malformed payloads.
	const body = await readBody(event)
	const input = AiBriefingRequestSchema.parse(body)

	// 2) Load system prompt from server-side prompt content.
	const systemPrompt = await getAiSystemPrompt(event, 'ai-briefing-system')

	// 3) Compose model input from validated request data.
	const { client, model } = getOpenAiClient(event)
	const userPrompt = formatBriefingInput(input)

	// 4) Request a structured response so parsing is deterministic.
	const response = await client.responses.parse({
		model,
		temperature: 0.2,
		max_output_tokens: 1800,
		input: [
			{
				role: 'system',
				content: systemPrompt,
			},
			{
				role: 'user',
				content: userPrompt,
			},
		],
		text: {
			format: zodTextFormat(BriefingOutputSchema, 'briefing_output'),
		},
	})

	// Missing parsed content means the model did not satisfy the schema contract.
	if (!response.output_parsed) {
		throw createError({
			statusCode: 502,
			statusMessage: 'AI briefing kon niet worden gegenereerd',
		})
	}

	// 5) Normalize markdown and return typed response contract.
	const briefing = sanitizeAiMarkdown(response.output_parsed.briefing)

	return AiBriefingResponseSchema.parse({
		briefing,
		wordCount: countWords(briefing),
	})
})
