import { AI_OPENAI_CONFIG } from '@ai'
import {
	AI_WEBSITE_ANALYSIS_DEFAULT_PAGES,
	AiWebsiteAnalysisRequestSchema,
	AiWebsiteAnalysisResponseSchema
} from '@schema/reportAi'
import { zodTextFormat } from 'openai/helpers/zod'

import { createAllowedDomains, formatWebsiteAnalysisInput } from '../../utils/ai/analysis'
import {
	renderWebsiteAnalysisMarkdown,
	WebsiteAnalysisOutputSchema
} from '../../utils/ai/analysis-output'
import {
	getOpenAiClient,
	getSupportedOpenAiValuesFromError,
	isUnsupportedOpenAiParameterError,
	pickFirstSupportedOpenAiValue
} from '../../utils/ai/openai'
import { getAiSystemPrompt } from '../../utils/ai/prompts'
import { fetchLlmsFullReferenceDocument } from '../../utils/ai/reference'
import { countWords, sanitizeAiMarkdown } from '../../utils/ai/text'
import { crawlWebsiteForAnalysis } from '../../utils/crawler/website'

/**
 * Controller for `POST /api/ai/website-analysis`.
 *
 * Flow:
 * 1. Validate request payload.
 * 2. Crawl the requested domain server-side (same-domain, capped, deterministic).
 * 3. Resolve system prompt + llms reference document.
 * 4. Ask OpenAI to analyze only the crawled context.
 * 5. Return typed response contract with explicit evidence URLs.
 *
 * Route responsibilities are intentionally domain/controller-level only. Helper
 * utilities for parsing, prompt building, and evidence extraction are placed in
 * `server/utils/ai/*`.
 *
 * @returns Analysis markdown + traceability metadata.
 */
export default defineEventHandler(async (event) => {
	// 1) Boundary validation.
	const body = await readBody(event)
	const input = AiWebsiteAnalysisRequestSchema.parse(body)

	const maxPages = input.maxPages ?? AI_WEBSITE_ANALYSIS_DEFAULT_PAGES
	const allowedDomains = createAllowedDomains(input.url)
	const crawledPages = await crawlWebsiteForAnalysis({
		startUrl: input.url,
		allowedDomains,
		maxPages
	})

	const evidencePages = crawledPages.filter((page) => page.excerpt.trim().length > 0)

	// If crawling yields no textual evidence, the model has no trustworthy input.
	if (evidencePages.length === 0) {
		throw createError({
			statusCode: 502,
			statusMessage:
				'AI website-analyse kon geen bruikbare pagina-inhoud ophalen van de opgegeven website'
		})
	}

	// 3) Resolve system prompt + reference context.
	const systemPrompt = await getAiSystemPrompt(event, 'ai-website-analysis-system')
	const referenceDocument = await fetchLlmsFullReferenceDocument(event)
	const userPrompt = formatWebsiteAnalysisInput({
		url: input.url,
		region: input.region,
		referenceDocument,
		maxPages,
		crawledPages: evidencePages
	})

	// 4) Create OpenAI client bound to runtime secrets/model configuration.
	const { client, model } = getOpenAiClient(event)
	/**
	 * Requests website-analysis output with compatibility fallbacks.
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
	const requestWebsiteAnalysisResponse = async (options: {
		maxOutputTokens: number
		includeReasoning: boolean
		reasoningEffort: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'
		verbosity: 'low' | 'medium' | 'high'
	}): Promise<Awaited<ReturnType<typeof client.responses.parse>>> => {
		let includeReasoning = options.includeReasoning
		let includeVerbosity = true
		let reasoningEffort = options.reasoningEffort
		let verbosity = options.verbosity
		let useStructuredOutput = true

		while (true) {
			try {
				if (useStructuredOutput) {
					return await client.responses.parse(
						{
							model,
							max_output_tokens: options.maxOutputTokens,
							...(includeReasoning
								? {
										reasoning: {
											effort: reasoningEffort
										}
									}
								: {}),
							text: {
								...(includeVerbosity
									? {
											verbosity
										}
									: {}),
								format: zodTextFormat(
									WebsiteAnalysisOutputSchema,
									'website_analysis_output'
								)
							},
							input: [
								{
									role: 'system',
									content: systemPrompt
								},
								{
									role: 'user',
									content: userPrompt
								}
							]
						},
						{
							maxRetries: AI_OPENAI_CONFIG.analysisRequest.maxRetries
						}
					)
				}

				const plainResponse = await client.responses.create(
					{
						model,
						max_output_tokens: options.maxOutputTokens,
						...(includeReasoning
							? {
									reasoning: {
										effort: reasoningEffort
									}
								}
							: {}),
						text: includeVerbosity ? { verbosity } : undefined,
						input: [
							{
								role: 'system',
								content: systemPrompt
							},
							{
								role: 'user',
								content: userPrompt
							}
						]
					},
					{
						maxRetries: AI_OPENAI_CONFIG.analysisRequest.maxRetries
					}
				)

				return {
					...plainResponse,
					output_parsed: null
				} as Awaited<ReturnType<typeof client.responses.parse>>
			} catch (error: unknown) {
				if (useStructuredOutput && isStructuredOutputJsonParseError(error)) {
					useStructuredOutput = false
					console.warn(
						'[AI] website-analysis structured parse failed, retrying with plain-text response mode',
						{ model }
					)
					continue
				}

				if (
					includeReasoning &&
					isUnsupportedOpenAiParameterError(error, 'reasoning.effort')
				) {
					const supportedValues = getSupportedOpenAiValuesFromError(error)
					const reasoningFallback = pickFirstSupportedOpenAiValue(supportedValues, [
						'high',
						'medium',
						'low',
						'minimal',
						'none'
					])

					if (reasoningFallback && reasoningFallback !== reasoningEffort) {
						reasoningEffort = reasoningFallback as typeof reasoningEffort
						console.warn(
							'[AI] website-analysis retrying with fallback reasoning.effort value',
							{
								model,
								reasoningEffort
							}
						)
						continue
					}

					includeReasoning = false
					console.warn(
						'[AI] website-analysis retrying without reasoning.effort for model compatibility',
						{ model }
					)
					continue
				}

				if (
					includeVerbosity &&
					isUnsupportedOpenAiParameterError(error, 'text.verbosity')
				) {
					const supportedValues = getSupportedOpenAiValuesFromError(error)
					const verbosityFallback = pickFirstSupportedOpenAiValue(supportedValues, [
						'high',
						'medium',
						'low'
					])

					if (verbosityFallback && verbosityFallback !== verbosity) {
						verbosity = verbosityFallback as typeof verbosity
						console.warn(
							'[AI] website-analysis retrying with fallback text.verbosity value',
							{
								model,
								verbosity
							}
						)
						continue
					}

					includeVerbosity = false
					console.warn(
						'[AI] website-analysis retrying without text.verbosity for model compatibility',
						{ model }
					)
					continue
				}

				throw error
			}
		}
	}

	let response = await requestWebsiteAnalysisResponse({
		maxOutputTokens: AI_OPENAI_CONFIG.analysisRequest.maxOutputTokens,
		includeReasoning: true,
		reasoningEffort: AI_OPENAI_CONFIG.analysisRequest.reasoningEffort,
		verbosity: AI_OPENAI_CONFIG.analysisRequest.verbosity
	})

	if (shouldRetryAfterTokenLimitIncomplete(response)) {
		console.warn('[AI] website-analysis retrying after incomplete max_output_tokens response', {
			model,
			initialMaxOutputTokens: AI_OPENAI_CONFIG.analysisRequest.maxOutputTokens,
			retryMaxOutputTokens: AI_OPENAI_CONFIG.analysisRequest.maxOutputTokensOnIncompleteRetry
		})

		response = await requestWebsiteAnalysisResponse({
			maxOutputTokens: AI_OPENAI_CONFIG.analysisRequest.maxOutputTokensOnIncompleteRetry,
			includeReasoning: AI_OPENAI_CONFIG.analysisRequest.retryWithReasoningOnIncomplete,
			reasoningEffort: AI_OPENAI_CONFIG.analysisRequest.incompleteRetryReasoningEffort,
			verbosity: AI_OPENAI_CONFIG.analysisRequest.incompleteRetryVerbosity
		})
	}

	let analysis: string
	if (response.output_parsed) {
		const parsedOutput = WebsiteAnalysisOutputSchema.parse(response.output_parsed)
		analysis = sanitizeAiMarkdown(renderWebsiteAnalysisMarkdown(parsedOutput))
	} else {
		const fallbackText = response.output_text?.trim()
		if (fallbackText) {
			const parsedFromJsonText = tryParseWebsiteAnalysisOutputFromText(fallbackText)
			if (parsedFromJsonText) {
				analysis = sanitizeAiMarkdown(renderWebsiteAnalysisMarkdown(parsedFromJsonText))
				console.warn(
					'[AI] website-analysis used JSON-text fallback after empty structured parse result',
					{ model }
				)
			} else {
				analysis = sanitizeAiMarkdown(fallbackText)
				console.warn(
					'[AI] website-analysis used plain-text fallback after empty structured parse result',
					{
						model
					}
				)
			}
		} else {
			console.error(
				'[AI] website-analysis returned no structured output and no output_text',
				{
					model,
					status: response.status,
					incompleteDetails: readRecordField(response, 'incomplete_details'),
					refusal: extractResponseRefusalText(response)
				}
			)
			throw createError({
				statusCode: 502,
				statusMessage: 'AI website-analyse kon niet worden gegenereerd'
			})
		}
	}

	// 5) Normalize analysis markdown and attach deterministic source URLs.
	const usedSources = [...new Set([input.url, ...evidencePages.map((page) => page.url)])]

	// Return API contract with both backwards-compatible and canonical URL fields.
	return AiWebsiteAnalysisResponseSchema.parse({
		analysis,
		wordCount: countWords(analysis),
		crawledPages: evidencePages.map((page) => ({
			url: page.url,
			title: page.title
		})),
		analysedPages: evidencePages.map((page) => ({
			url: page.url,
			title: page.title
		})),
		usedSources
	})
})

/**
 * Returns true when model output is incomplete due output-token exhaustion.
 *
 * @param response - Responses API payload.
 * @returns Whether a higher-token retry is warranted.
 */
function shouldRetryAfterTokenLimitIncomplete(response: unknown): boolean {
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

/**
 * Tries to parse structured analysis payload from a text response.
 *
 * @param text - Raw output text.
 * @returns Structured output when valid, otherwise null.
 */
function tryParseWebsiteAnalysisOutputFromText(
	text: string
): (typeof WebsiteAnalysisOutputSchema)['_output'] | null {
	const normalized = sanitizeAiMarkdown(text)

	try {
		const parsedJson = JSON.parse(normalized)
		const parsed = WebsiteAnalysisOutputSchema.safeParse(parsedJson)
		return parsed.success ? parsed.data : null
	} catch {
		return null
	}
}

/**
 * Best-effort extraction of refusal text from response output items.
 *
 * @param response - Parsed responses API payload.
 * @returns Refusal text when present.
 */
function extractResponseRefusalText(response: unknown): string | null {
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
function readRecordField(value: unknown, key: string): unknown {
	if (!value || typeof value !== 'object') {
		return undefined
	}

	return (value as Record<string, unknown>)[key]
}
