import type { OpenAiReasoningEffort, OpenAiVerbosity } from '../../utils/ai/response'

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
import { getOpenAiClient } from '../../utils/ai/openai'
import { getAiSystemPrompt } from '../../utils/ai/prompts'
import { fetchLlmsFullReferenceDocument } from '../../utils/ai/reference'
import {
	extractResponseRefusalText,
	readRecordField,
	requestWithOpenAiCompatibility,
	shouldRetryAfterTokenLimitIncomplete
} from '../../utils/ai/response'
import { countWords, sanitizeAiMarkdown } from '../../utils/ai/text'
import { crawlWebsiteForAnalysis } from '../../utils/crawler/website'
import { createServerExecutionTimer } from '../../utils/observability/timing'
import { assertTurnstileToken } from '../../utils/security/turnstile'

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
	const timer = createServerExecutionTimer('POST /api/ai/website-analysis')

	try {
		await assertTurnstileToken(event, 'ai_website_analysis')
		timer.mark('turnstile_verified')

		// 1) Boundary validation.
		const body = await readBody(event)
		const input = AiWebsiteAnalysisRequestSchema.parse(body)
		const requestConfig = AI_OPENAI_CONFIG.analysisRequest
		timer.mark('request_validated')

		const maxPages = input.maxPages ?? AI_WEBSITE_ANALYSIS_DEFAULT_PAGES
		const allowedDomains = createAllowedDomains(input.url)
		const crawledPages = await crawlWebsiteForAnalysis({
			startUrl: input.url,
			allowedDomains,
			maxPages
		})
		timer.mark('crawl_completed', {
			maxPages,
			crawledPages: crawledPages.length
		})

		const evidencePages = crawledPages.filter((page) => page.excerpt.trim().length > 0)
		timer.mark('evidence_filtered', {
			evidencePages: evidencePages.length
		})

		// If crawling yields no textual evidence, the model has no trustworthy input.
		if (evidencePages.length === 0) {
			throw createError({
				statusCode: 502,
				statusMessage:
					'AI website analysis could not retrieve usable page content from the provided website'
			})
		}

		// 3) Resolve system prompt + reference context.
		const systemPrompt = await getAiSystemPrompt(event, 'ai-website-analysis-system')
		timer.mark('system_prompt_loaded')
		const referenceDocument = await fetchLlmsFullReferenceDocument(event)
		timer.mark('reference_document_loaded')

		// 4) Create OpenAI client bound to runtime secrets/model configuration.
		const { client, model } = getOpenAiClient(event, { useCase: 'website-analysis' })
		const userPrompt = formatWebsiteAnalysisInput({
			url: input.url,
			region: input.region,
			referenceDocument,
			maxPages,
			crawledPages: evidencePages
		})
		timer.mark('request_composed', { model })

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
			reasoningEffort: OpenAiReasoningEffort
			verbosity: OpenAiVerbosity
		}): Promise<Awaited<ReturnType<typeof client.responses.parse>>> => {
			return await requestWithOpenAiCompatibility({
				label: 'website-analysis',
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
							text: {
								...(includeVerbosity ? { verbosity } : {}),
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
							maxRetries: requestConfig.maxRetries
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
		let response = await requestWebsiteAnalysisResponse({
			maxOutputTokens: requestConfig.maxOutputTokens,
			includeReasoning: true,
			reasoningEffort: requestConfig.reasoningEffort,
			verbosity: requestConfig.verbosity
		})
		timer.mark('openai_response_received', {
			model,
			maxOutputTokens: requestConfig.maxOutputTokens,
			reasoningEffort: requestConfig.reasoningEffort,
			verbosity: requestConfig.verbosity
		})

		if (shouldRetryAfterTokenLimitIncomplete(response)) {
			didRetryAfterIncomplete = true
			console.warn(
				'[AI] website-analysis retrying after incomplete max_output_tokens response',
				{
					model,
					initialMaxOutputTokens: requestConfig.maxOutputTokens,
					retryMaxOutputTokens: requestConfig.maxOutputTokensOnIncompleteRetry
				}
			)

			response = await requestWebsiteAnalysisResponse({
				maxOutputTokens: requestConfig.maxOutputTokensOnIncompleteRetry,
				includeReasoning: requestConfig.retryWithReasoningOnIncomplete,
				reasoningEffort: requestConfig.incompleteRetryReasoningEffort,
				verbosity: requestConfig.incompleteRetryVerbosity
			})
			timer.mark('openai_response_retry_received', {
				model,
				maxOutputTokens: requestConfig.maxOutputTokensOnIncompleteRetry,
				reasoningEffort: requestConfig.incompleteRetryReasoningEffort,
				verbosity: requestConfig.incompleteRetryVerbosity
			})
		}

		let analysis: string
		let analysisSource: 'structured' | 'json_text_fallback' | 'plain_text_fallback'
		if (response.output_parsed) {
			const parsedOutput = WebsiteAnalysisOutputSchema.parse(response.output_parsed)
			analysis = sanitizeAiMarkdown(renderWebsiteAnalysisMarkdown(parsedOutput))
			analysisSource = 'structured'
		} else {
			const fallbackText = response.output_text?.trim()
			if (fallbackText) {
				const parsedFromJsonText = tryParseWebsiteAnalysisOutputFromText(fallbackText)
				if (parsedFromJsonText) {
					analysis = sanitizeAiMarkdown(renderWebsiteAnalysisMarkdown(parsedFromJsonText))
					analysisSource = 'json_text_fallback'
					console.warn(
						'[AI] website-analysis used JSON-text fallback after empty structured parse result',
						{ model }
					)
				} else {
					analysis = sanitizeAiMarkdown(fallbackText)
					analysisSource = 'plain_text_fallback'
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
					statusMessage: 'AI website analysis could not be generated'
				})
			}
		}

		const wordCount = countWords(analysis)
		timer.mark('response_normalized', {
			analysisSource,
			wordCount
		})

		// 5) Normalize analysis markdown and attach deterministic source URLs.
		const usedSources = [...new Set([input.url, ...evidencePages.map((page) => page.url)])]

		// Return API contract with both backwards-compatible and canonical URL fields.
		const result = AiWebsiteAnalysisResponseSchema.parse({
			analysis,
			wordCount,
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
		timer.mark('response_validated', {
			usedSources: result.usedSources.length,
			analysedPages: result.analysedPages.length
		})
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
