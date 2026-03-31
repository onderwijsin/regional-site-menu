import { AI_ROUTE_REQUEST_CONFIG } from '~~/config/ai'
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
		generateTextImpl?: ReturnType<typeof vi.fn>
		crawlPages?: Array<{ url: string; title?: string; excerpt: string; fullContent: string }>
		body?: unknown
	} = {}
) {
	vi.resetModules()

	const generateTextImpl =
		options.generateTextImpl ??
		vi.fn().mockResolvedValue({
			output: createWebsiteAnalysisOutput()
		})
	const outputObjectMock = vi.fn((value: unknown) => value)
	const assertTurnstileTokenMock = vi.fn().mockResolvedValue(undefined)
	const resolveAiProviderMock = vi.fn().mockReturnValue({
		provider: 'openai',
		model: 'gpt-test',
		languageModel: { mocked: true }
	})
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

	vi.doMock('ai', () => ({
		generateText: generateTextImpl,
		Output: {
			object: outputObjectMock
		}
	}))
	vi.doMock('~~/server/utils/ai/provider', () => ({
		resolveAiProvider: resolveAiProviderMock
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
		generateTextImpl,
		assertTurnstileTokenMock,
		resolveAiProviderMock
	}
}

describe('POST /api/ai/website-analysis', () => {
	it('returns structured analysis plus deterministic evidence URLs', async () => {
		const { handler, generateTextImpl, assertTurnstileTokenMock, resolveAiProviderMock } =
			await loadHandler()

		const result = await handler({} as never)

		expect(result.analysis).toContain('## Korte samenvatting')
		expect(result.crawledPages).toEqual([{ url: 'https://example.com', title: 'Home' }])
		expect(result.analysedPages).toEqual([{ url: 'https://example.com', title: 'Home' }])
		expect(result.usedSources).toEqual(['https://example.com'])
		expect(resolveAiProviderMock).toHaveBeenCalledWith({})
		expect(generateTextImpl).toHaveBeenCalledTimes(1)
		expect(assertTurnstileTokenMock).toHaveBeenCalledWith({}, 'ai_website_analysis')
	})

	it('throws when crawl returns no pages with evidence text', async () => {
		const { handler, generateTextImpl } = await loadHandler({
			crawlPages: [
				{ url: 'https://example.com', title: 'Home', excerpt: '   ', fullContent: '' }
			]
		})

		await expect(handler({} as never)).rejects.toMatchObject({
			statusCode: 502,
			statusMessage:
				'AI website analysis could not retrieve usable page content from the provided website'
		})
		expect(generateTextImpl).not.toHaveBeenCalled()
	})

	it('accepts a page as evidence when excerpt is empty but semantic content has text', async () => {
		const { handler, generateTextImpl } = await loadHandler({
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
		expect(generateTextImpl).toHaveBeenCalledTimes(1)
	})

	it('throws a 502 when model generation fails', async () => {
		const generateTextImpl = vi.fn().mockRejectedValue(new Error('provider failure'))
		const { handler } = await loadHandler({ generateTextImpl })

		await expect(handler({} as never)).rejects.toMatchObject({
			statusCode: 502,
			statusMessage: 'AI website analysis could not be generated'
		})
	})

	it('uses the configured request budget', async () => {
		const { handler, generateTextImpl } = await loadHandler()
		await handler({} as never)

		expect(generateTextImpl.mock.calls[0]?.[0]?.maxOutputTokens).toBe(
			AI_ROUTE_REQUEST_CONFIG.analysisRequest.maxOutputTokens
		)
		expect(generateTextImpl.mock.calls[0]?.[0]?.temperature).toBe(
			AI_ROUTE_REQUEST_CONFIG.analysisRequest.temperature
		)
		expect(generateTextImpl.mock.calls[0]?.[0]?.maxRetries).toBe(
			AI_ROUTE_REQUEST_CONFIG.analysisRequest.maxRetries
		)
	})
})
