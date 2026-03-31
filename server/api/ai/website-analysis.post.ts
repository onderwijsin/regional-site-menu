import { AI_ROUTE_REQUEST_CONFIG } from '@ai'
import {
	AI_WEBSITE_ANALYSIS_DEFAULT_PAGES,
	AiWebsiteAnalysisRequestSchema,
	AiWebsiteAnalysisResponseSchema
} from '@schema/reportAi'
import { createAllowedDomains, formatWebsiteAnalysisInput } from '@server/utils/ai/analysis'
import {
	renderWebsiteAnalysisMarkdown,
	WebsiteAnalysisOutputSchema
} from '@server/utils/ai/analysis-output'
import { getAiSystemPrompt } from '@server/utils/ai/prompts'
import { resolveAiProvider } from '@server/utils/ai/provider'
import { fetchLlmsFullReferenceDocument } from '@server/utils/ai/reference'
import { countWords, sanitizeAiMarkdown } from '@server/utils/ai/text'
import { crawlWebsiteForAnalysis } from '@server/utils/crawler/website'
import { createServerExecutionTimer } from '@server/utils/observability/timing'
import { assertTurnstileToken } from '@server/utils/security/turnstile'
import { generateText, Output } from 'ai'

/**
 * Controller for `POST /api/ai/website-analysis`.
 *
 * Flow:
 * 1. Validate request payload.
 * 2. Crawl the requested domain server-side (same-domain, capped, deterministic).
 * 3. Resolve system prompt + llms reference document.
 * 4. Ask the configured AI SDK provider to analyze only the crawled context.
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
		const requestConfig = AI_ROUTE_REQUEST_CONFIG.analysisRequest
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

		const evidencePages = crawledPages.filter(hasPageEvidence)
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

		const { provider, model, languageModel } = resolveAiProvider(event)
		const userPrompt = formatWebsiteAnalysisInput({
			url: input.url,
			region: input.region,
			referenceDocument,
			maxPages,
			crawledPages: evidencePages
		})
		timer.mark('request_composed', { model, provider })

		let analysis: string
		try {
			const { output } = await generateText({
				model: languageModel,
				system: systemPrompt,
				prompt: userPrompt,
				maxOutputTokens: requestConfig.maxOutputTokens,
				temperature: requestConfig.temperature,
				maxRetries: requestConfig.maxRetries,
				output: Output.object({
					schema: WebsiteAnalysisOutputSchema,
					name: 'website_analysis_output',
					description:
						'Generate structured Dutch website analysis sections with concise, evidence-based markdown content.'
				})
			})

			const parsedOutput = WebsiteAnalysisOutputSchema.parse(output)
			analysis = sanitizeAiMarkdown(renderWebsiteAnalysisMarkdown(parsedOutput))
		} catch (error: unknown) {
			console.error('[AI] website-analysis generation failed', {
				provider,
				model,
				errorMessage: error instanceof Error ? error.message : undefined
			})
			throw createError({
				statusCode: 502,
				statusMessage: 'AI website analysis could not be generated'
			})
		}

		timer.mark('ai_response_received', {
			model,
			provider,
			maxOutputTokens: requestConfig.maxOutputTokens
		})

		const wordCount = countWords(analysis)
		timer.mark('response_normalized', {
			analysisSource: 'structured',
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
			model,
			provider
		})
		return result
	} catch (error: unknown) {
		timer.fail(error)
		throw error
	}
})

/**
 * Returns true when a crawled page has meaningful textual evidence.
 *
 * @param page - Crawled page snapshot.
 * @returns Whether the page can be used as analysis evidence.
 */
function hasPageEvidence(page: { excerpt: string; fullContent: string }): boolean {
	if (page.excerpt.trim().length > 0) {
		return true
	}

	const textFromSemanticHtml = page.fullContent
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
	return textFromSemanticHtml.length > 0
}
