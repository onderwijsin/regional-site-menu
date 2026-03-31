import { AI_OPENAI_CONFIG } from '~~/config/ai'
import { describe, expect, it, vi } from 'vitest'

function createWebsiteAnalysisOutput() {
	return {
		shortSummary: 'Samenvatting',
		whatWorks: 'Sterke punten',
		missingOrWeak: 'Ontbrekende onderdelen',
		recommendations: 'Aanbevelingen',
		priorities: 'Prioriteiten',
		unknowns: null
	}
}

async function loadHandler(
	options: {
		parseImpl?: ReturnType<typeof vi.fn>
		createImpl?: ReturnType<typeof vi.fn>
		crawlPages?: Array<{ url: string; title?: string; excerpt: string; fullContent: string }>
		body?: unknown
	} = {}
) {
	vi.resetModules()

	const parseImpl =
		options.parseImpl ??
		vi.fn().mockResolvedValue({
			status: 'completed',
			output_parsed: createWebsiteAnalysisOutput()
		})
	const createImpl = options.createImpl ?? vi.fn()
	const assertTurnstileTokenMock = vi.fn().mockResolvedValue(undefined)
	const crawlPages = options.crawlPages ?? [
		{
			url: 'https://example.com',
			title: 'Home',
			excerpt: 'Welkom op de site',
			fullContent: '<main><p>Welkom op de site</p></main>'
		},
		{
			url: 'https://example.com/contact',
			title: 'Contact',
			excerpt: '',
			fullContent: ''
		}
	]

	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	vi.stubGlobal(
		'readBody',
		vi.fn().mockResolvedValue(
			options.body ?? {
				url: 'https://example.com',
				region: 'Utrecht',
				maxPages: 2
			}
		)
	)
	vi.stubGlobal('createError', (input: { statusCode: number; statusMessage: string }) => {
		const error = new Error(input.statusMessage) as Error & {
			statusCode?: number
			statusMessage?: string
		}
		error.statusCode = input.statusCode
		error.statusMessage = input.statusMessage
		return error
	})

	vi.doMock('~~/server/utils/ai/openai', () => ({
		getOpenAiClient: () => ({
			model: 'gpt-test',
			client: {
				responses: {
					parse: parseImpl,
					create: createImpl
				}
			}
		})
	}))
	vi.doMock('~~/server/utils/ai/prompts', () => ({
		getAiSystemPrompt: vi.fn(async () => 'System prompt')
	}))
	vi.doMock('~~/server/utils/ai/reference', () => ({
		fetchLlmsFullReferenceDocument: vi.fn(async () => 'LLMS reference')
	}))
	vi.doMock('~~/server/utils/security/turnstile', () => ({
		assertTurnstileToken: assertTurnstileTokenMock
	}))
	vi.doMock('~~/server/utils/crawler/website', () => ({
		crawlWebsiteForAnalysis: vi.fn(async () => crawlPages)
	}))
	vi.doMock('~~/server/utils/ai/text', () => ({
		sanitizeAiMarkdown: (value: string) => value.trim(),
		countWords: (value: string) => value.trim().split(/\s+/).filter(Boolean).length
	}))

	const module = await import('~~/server/api/ai/website-analysis.post')
	return {
		handler: module.default,
		parseImpl,
		createImpl,
		assertTurnstileTokenMock
	}
}

describe('POST /api/ai/website-analysis', () => {
	it('returns structured analysis plus deterministic evidence URLs', async () => {
		const { handler, parseImpl, assertTurnstileTokenMock } = await loadHandler()

		const result = await handler({} as never)

		expect(result.analysis).toContain('## Korte samenvatting')
		expect(result.crawledPages).toEqual([{ url: 'https://example.com', title: 'Home' }])
		expect(result.analysedPages).toEqual([{ url: 'https://example.com', title: 'Home' }])
		expect(result.usedSources).toEqual(['https://example.com'])
		expect(parseImpl).toHaveBeenCalledTimes(1)
		expect(assertTurnstileTokenMock).toHaveBeenCalledWith({}, 'ai_website_analysis')
	})

	it('throws when crawl returns no pages with evidence text', async () => {
		const { handler, parseImpl } = await loadHandler({
			crawlPages: [
				{ url: 'https://example.com', title: 'Home', excerpt: '   ', fullContent: '' }
			]
		})

		await expect(handler({} as never)).rejects.toMatchObject({
			statusCode: 502,
			statusMessage:
				'AI website analysis could not retrieve usable page content from the provided website'
		})
		expect(parseImpl).not.toHaveBeenCalled()
	})

	it('accepts a page as evidence when excerpt is empty but semantic content has text', async () => {
		const { handler, parseImpl } = await loadHandler({
			crawlPages: [
				{
					url: 'https://example.com/home',
					title: 'Home',
					excerpt: '   ',
					fullContent: '<main><h1>Home</h1><p>Betrouwbare tekst</p></main>'
				}
			]
		})

		const result = await handler({} as never)

		expect(result.analysis).toContain('## Korte samenvatting')
		expect(result.crawledPages).toEqual([{ url: 'https://example.com/home', title: 'Home' }])
		expect(parseImpl).toHaveBeenCalledTimes(1)
	})

	it('falls back to plain response mode when structured parse fails', async () => {
		const parseImpl = vi.fn().mockRejectedValue(new SyntaxError('Unexpected token in JSON'))
		const createImpl = vi.fn().mockResolvedValue({
			status: 'completed',
			output_parsed: null,
			output_text: 'Vrije analyse tekst'
		})

		const { handler } = await loadHandler({ parseImpl, createImpl })
		const result = await handler({} as never)

		expect(result.analysis).toBe('Vrije analyse tekst')
		expect(parseImpl).toHaveBeenCalledTimes(1)
		expect(createImpl).toHaveBeenCalledTimes(1)
	})

	it('throws a 502 when neither structured output nor output_text is available', async () => {
		const parseImpl = vi.fn().mockResolvedValue({
			status: 'completed',
			output_parsed: null,
			output_text: ''
		})

		const { handler } = await loadHandler({ parseImpl })

		await expect(handler({} as never)).rejects.toMatchObject({
			statusCode: 502,
			statusMessage: 'AI website analysis could not be generated'
		})
	})

	it('retries with second parse call after incomplete max-output response', async () => {
		const parseImpl = vi
			.fn()
			.mockResolvedValueOnce({
				status: 'incomplete',
				output_parsed: null,
				output_text: '',
				incomplete_details: { reason: 'max_output_tokens' }
			})
			.mockResolvedValueOnce({
				status: 'completed',
				output_parsed: createWebsiteAnalysisOutput()
			})

		const { handler } = await loadHandler({ parseImpl })
		const result = await handler({} as never)

		expect(result.analysis).toContain('## Korte samenvatting')
		expect(parseImpl).toHaveBeenCalledTimes(2)
	})

	it('uses the configured medium request budget', async () => {
		const parseImpl = vi.fn().mockResolvedValue({
			status: 'completed',
			output_parsed: createWebsiteAnalysisOutput()
		})

		const { handler } = await loadHandler({ parseImpl })
		await handler({} as never)

		expect(parseImpl.mock.calls[0]?.[0]?.max_output_tokens).toBe(
			AI_OPENAI_CONFIG.analysisRequest.maxOutputTokens
		)
		expect(parseImpl.mock.calls[0]?.[0]?.reasoning?.effort).toBe(
			AI_OPENAI_CONFIG.analysisRequest.reasoningEffort
		)
	})

	it('uses JSON-text fallback when output_text contains serialized structured analysis', async () => {
		const parseImpl = vi.fn().mockResolvedValue({
			status: 'completed',
			output_parsed: null,
			output_text: JSON.stringify(createWebsiteAnalysisOutput())
		})

		const { handler } = await loadHandler({ parseImpl })
		const result = await handler({} as never)

		expect(result.analysis).toContain('## Korte samenvatting')
		expect(result.analysis).toContain('## Wat gaat goed')
	})
})
