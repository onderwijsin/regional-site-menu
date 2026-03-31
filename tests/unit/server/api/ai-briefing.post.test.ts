import { AI_ROUTE_REQUEST_CONFIG } from '~~/config/ai'
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
		generateTextImpl?: ReturnType<typeof vi.fn>
		body?: unknown
	} = {}
) {
	vi.resetModules()

	const generateTextImpl =
		options.generateTextImpl ??
		vi.fn().mockResolvedValue({
			output: {
				briefing: '  AI briefing  '
			}
		})
	const outputObjectMock = vi.fn((value: unknown) => value)
	const assertTurnstileTokenMock = vi.fn().mockResolvedValue(undefined)
	const resolveAiProviderMock = vi.fn().mockReturnValue({
		provider: 'openai',
		model: 'gpt-test',
		languageModel: { mocked: true }
	})

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

	vi.doMock('ai', () => ({
		generateText: generateTextImpl,
		Output: {
			object: outputObjectMock
		}
	}))
	vi.doMock('~~/server/utils/ai/provider', () => ({
		resolveAiProvider: resolveAiProviderMock
	}))
	vi.doMock('~~/server/utils/ai/briefing', () => ({
		formatBriefingInput: () => 'Genereer briefing'
	}))
	vi.doMock('~~/server/utils/ai/prompts', () => ({
		getAiSystemPrompt: vi.fn(async () => 'System prompt')
	}))
	vi.doMock('~~/server/utils/security/turnstile', () => ({
		assertTurnstileToken: assertTurnstileTokenMock
	}))
	vi.doMock('~~/server/utils/ai/text', () => ({
		sanitizeAiMarkdown: (value: string) => value.trim(),
		countWords: (value: string) => value.trim().split(/\s+/).filter(Boolean).length
	}))

	const module = await import('~~/server/api/ai/briefing.post')
	return {
		handler: module.default,
		generateTextImpl,
		assertTurnstileTokenMock,
		resolveAiProviderMock,
		outputObjectMock
	}
}

describe('POST /api/ai/briefing', () => {
	it('returns structured briefing output', async () => {
		const {
			handler,
			generateTextImpl,
			assertTurnstileTokenMock,
			resolveAiProviderMock,
			outputObjectMock
		} = await loadHandler()

		const result = await handler({} as never)

		expect(result).toEqual({
			briefing: 'AI briefing',
			wordCount: 2
		})
		expect(resolveAiProviderMock).toHaveBeenCalledWith({})
		expect(generateTextImpl).toHaveBeenCalledTimes(1)
		expect(outputObjectMock).toHaveBeenCalledTimes(1)
		expect(assertTurnstileTokenMock).toHaveBeenCalledWith({}, 'ai_briefing')
	})

	it('accepts nested structured briefing output returned by provider', async () => {
		const generateTextImpl = vi.fn().mockResolvedValue({
			output: {
				briefing: {
					briefing: '  Geneste briefing  '
				}
			}
		})
		const { handler } = await loadHandler({ generateTextImpl })

		const result = await handler({} as never)

		expect(result).toEqual({
			briefing: 'Geneste briefing',
			wordCount: 2
		})
		expect(generateTextImpl).toHaveBeenCalledTimes(1)
	})

	it('uses the configured request budget', async () => {
		const { handler, generateTextImpl } = await loadHandler()
		await handler({} as never)

		expect(generateTextImpl.mock.calls[0]?.[0]?.maxOutputTokens).toBe(
			AI_ROUTE_REQUEST_CONFIG.briefingRequest.maxOutputTokens
		)
		expect(generateTextImpl.mock.calls[0]?.[0]?.temperature).toBe(
			AI_ROUTE_REQUEST_CONFIG.briefingRequest.temperature
		)
		expect(generateTextImpl.mock.calls[0]?.[0]?.maxRetries).toBe(
			AI_ROUTE_REQUEST_CONFIG.briefingRequest.maxRetries
		)
	})

	it('throws a 502 when generation fails', async () => {
		const generateTextImpl = vi.fn().mockRejectedValue(new Error('provider failure'))
		const { handler } = await loadHandler({ generateTextImpl })

		await expect(handler({} as never)).rejects.toMatchObject({
			statusCode: 502,
			statusMessage: 'AI briefing could not be generated'
		})
	})

	it('falls back to plain-text mode when structured output does not match schema', async () => {
		const generateTextImpl = vi
			.fn()
			.mockRejectedValueOnce(new Error('No object generated: response did not match schema.'))
			.mockResolvedValueOnce({ text: 'Fallback briefing tekst' })
		const { handler } = await loadHandler({ generateTextImpl })

		const result = await handler({} as never)

		expect(result).toEqual({
			briefing: 'Fallback briefing tekst',
			wordCount: 3
		})
		expect(generateTextImpl).toHaveBeenCalledTimes(2)
	})

	it('throws a 502 when plain-text fallback generation fails', async () => {
		const generateTextImpl = vi
			.fn()
			.mockRejectedValueOnce(new Error('No object generated: response did not match schema.'))
			.mockRejectedValueOnce(new Error('fallback provider failure'))
		const { handler } = await loadHandler({ generateTextImpl })

		await expect(handler({} as never)).rejects.toMatchObject({
			statusCode: 502,
			statusMessage: 'AI briefing could not be generated'
		})
		expect(generateTextImpl).toHaveBeenCalledTimes(2)
	})

	it('throws a 502 when plain-text fallback returns empty text', async () => {
		const generateTextImpl = vi
			.fn()
			.mockRejectedValueOnce(new Error('No object generated: response did not match schema.'))
			.mockResolvedValueOnce({ text: '   ' })
		const { handler } = await loadHandler({ generateTextImpl })

		await expect(handler({} as never)).rejects.toMatchObject({
			statusCode: 502,
			statusMessage: 'AI briefing could not be generated'
		})
		expect(generateTextImpl).toHaveBeenCalledTimes(2)
	})
})
