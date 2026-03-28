import { AI_OPENAI_CONFIG } from '~~/config/ai'
import { describe, expect, it, vi } from 'vitest'

function createBriefingRequestBody() {
	return {
		region: 'Utrecht',
		regionGoals: ['Informeren'],
		chosenComponents: [
			{
				id: 'item-1',
				title: 'Homepage',
				pillar: 'Inzicht & Overzicht',
				goals: ['Informeren'],
				priority: 'Must have',
				description: 'Beschrijving',
				score: 8,
				comment: 'Sterk'
			}
		],
		extraContext: 'Extra context'
	}
}

async function loadHandler(
	options: {
		parseImpl?: ReturnType<typeof vi.fn>
		createImpl?: ReturnType<typeof vi.fn>
		body?: unknown
	} = {}
) {
	vi.resetModules()

	const parseImpl =
		options.parseImpl ??
		vi.fn().mockResolvedValue({
			status: 'completed',
			output_parsed: {
				briefing: '  AI briefing  '
			}
		})
	const createImpl = options.createImpl ?? vi.fn()

	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	vi.stubGlobal(
		'readBody',
		vi.fn().mockResolvedValue(options.body ?? createBriefingRequestBody())
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
	vi.doMock('~~/server/utils/ai/briefing', () => ({
		formatBriefingInput: () => 'Genereer briefing'
	}))
	vi.doMock('~~/server/utils/ai/prompts', () => ({
		getAiSystemPrompt: vi.fn(async () => 'System prompt')
	}))
	vi.doMock('~~/server/utils/ai/text', () => ({
		sanitizeAiMarkdown: (value: string) => value.trim(),
		countWords: (value: string) => value.trim().split(/\s+/).filter(Boolean).length
	}))

	const module = await import('~~/server/api/ai/briefing.post')
	return {
		handler: module.default,
		parseImpl,
		createImpl
	}
}

describe('POST /api/ai/briefing', () => {
	it('returns structured briefing output', async () => {
		const { handler, parseImpl, createImpl } = await loadHandler()

		const result = await handler({} as never)

		expect(result).toEqual({
			briefing: 'AI briefing',
			wordCount: 2
		})
		expect(parseImpl).toHaveBeenCalledTimes(1)
		expect(createImpl).not.toHaveBeenCalled()
	})

	it('retries with increased token budget after incomplete max-output response', async () => {
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
				output_parsed: {
					briefing: 'Tweede poging briefing'
				}
			})

		const { handler } = await loadHandler({ parseImpl })
		const result = await handler({} as never)

		expect(result.briefing).toBe('Tweede poging briefing')
		expect(parseImpl).toHaveBeenCalledTimes(2)
		expect(parseImpl.mock.calls[0]?.[0]?.max_output_tokens).toBe(
			AI_OPENAI_CONFIG.briefingRequest.maxOutputTokens
		)
		expect(parseImpl.mock.calls[1]?.[0]?.max_output_tokens).toBe(
			AI_OPENAI_CONFIG.briefingRequest.maxOutputTokensOnIncompleteRetry
		)
	})

	it('falls back to plain response mode when structured parse throws JSON syntax error', async () => {
		const parseImpl = vi.fn().mockRejectedValue(new SyntaxError('Unexpected token in JSON'))
		const createImpl = vi.fn().mockResolvedValue({
			status: 'completed',
			output_parsed: null,
			output_text: '{"briefing":"Fallback briefing"}'
		})

		const { handler } = await loadHandler({ parseImpl, createImpl })
		const result = await handler({} as never)

		expect(result).toEqual({
			briefing: 'Fallback briefing',
			wordCount: 2
		})
		expect(parseImpl).toHaveBeenCalledTimes(1)
		expect(createImpl).toHaveBeenCalledTimes(1)
	})

	it('throws a 502 when no structured output and no fallback text are returned', async () => {
		const parseImpl = vi.fn().mockResolvedValue({
			status: 'completed',
			output_parsed: null,
			output_text: ''
		})

		const { handler } = await loadHandler({ parseImpl })

		await expect(handler({} as never)).rejects.toMatchObject({
			statusCode: 502,
			statusMessage: 'AI briefing kon niet worden gegenereerd'
		})
	})

	it('uses plain-text fallback when output_text is not valid JSON payload', async () => {
		const parseImpl = vi.fn().mockResolvedValue({
			status: 'completed',
			output_parsed: null,
			output_text: '{"briefing":'
		})

		const { handler } = await loadHandler({ parseImpl })
		const result = await handler({} as never)

		expect(result).toEqual({
			briefing: '{"briefing":',
			wordCount: 1
		})
	})
})
