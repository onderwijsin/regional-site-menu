import { AI_OPENAI_CONFIG } from '@constants'
import {
	AI_WEBSITE_ANALYSIS_DEFAULT_PAGES,
	AiWebsiteAnalysisRequestSchema,
	AiWebsiteAnalysisResponseSchema
} from '@schema/reportAi'

import { createAllowedDomains, formatWebsiteAnalysisInput } from '../../utils/ai/analysis'
import { getOpenAiClient } from '../../utils/ai/openai'
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
	const response = await client.responses.create(
		{
			model,
			temperature: AI_OPENAI_CONFIG.analysisRequest.temperature,
			max_output_tokens: AI_OPENAI_CONFIG.analysisRequest.maxOutputTokens,
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

	const analysisText = response.output_text?.trim()
	if (!analysisText) {
		throw createError({
			statusCode: 502,
			statusMessage: 'AI website-analyse kon niet worden gegenereerd'
		})
	}

	// 5) Normalize analysis markdown and attach deterministic source URLs.
	const analysis = sanitizeAiMarkdown(analysisText)
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
