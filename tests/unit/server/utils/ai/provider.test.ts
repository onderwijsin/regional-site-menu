import { resolveAiProvider } from '~~/server/utils/ai/provider'
import { describe, expect, it, vi } from 'vitest'

const createOpenAIMock = vi.hoisted(() => vi.fn())
const createMistralMock = vi.hoisted(() => vi.fn())

vi.mock('@ai-sdk/openai', () => ({
	createOpenAI: createOpenAIMock
}))

vi.mock('@ai-sdk/mistral', () => ({
	createMistral: createMistralMock
}))

describe('server/utils/ai/provider', () => {
	it('resolves openai provider by default when AI_PROVIDER is unset', () => {
		const languageModel = { provider: 'openai', model: 'gpt-test' }
		const openaiProviderFactory = vi.fn().mockReturnValue(languageModel)
		createOpenAIMock.mockReturnValue(openaiProviderFactory)

		vi.stubGlobal('useRuntimeConfig', () => ({
			ai: {
				provider: ''
			},
			openai: {
				token: 'openai-secret',
				model: 'gpt-test'
			},
			mistral: {
				token: 'mistral-secret'
			}
		}))

		const result = resolveAiProvider({} as never)

		expect(result.provider).toBe('openai')
		expect(result.model).toBe('gpt-test')
		expect(result.languageModel).toBe(languageModel)
		expect(createOpenAIMock).toHaveBeenCalledWith({ apiKey: 'openai-secret' })
		expect(openaiProviderFactory).toHaveBeenCalledWith('gpt-test')
	})

	it('resolves mistral provider when configured', () => {
		const languageModel = { provider: 'mistral', model: 'mistral-test' }
		const mistralProviderFactory = vi.fn().mockReturnValue(languageModel)
		createMistralMock.mockReturnValue(mistralProviderFactory)

		vi.stubGlobal('useRuntimeConfig', () => ({
			ai: {
				provider: 'mistral'
			},
			openai: {
				token: 'openai-secret'
			},
			mistral: {
				token: 'mistral-secret',
				model: 'mistral-test'
			}
		}))

		const result = resolveAiProvider({} as never)

		expect(result.provider).toBe('mistral')
		expect(result.model).toBe('mistral-test')
		expect(result.languageModel).toBe(languageModel)
		expect(createMistralMock).toHaveBeenCalledWith({ apiKey: 'mistral-secret' })
		expect(mistralProviderFactory).toHaveBeenCalledWith('mistral-test')
	})

	it('falls back to provider default model when runtime model is unset', () => {
		const languageModel = { provider: 'openai', model: 'gpt-5-mini' }
		const openaiProviderFactory = vi.fn().mockReturnValue(languageModel)
		createOpenAIMock.mockReturnValue(openaiProviderFactory)

		vi.stubGlobal('useRuntimeConfig', () => ({
			ai: {
				provider: 'openai'
			},
			openai: {
				token: 'openai-secret',
				model: ''
			},
			mistral: {
				token: 'mistral-secret'
			}
		}))

		const result = resolveAiProvider({} as never)

		expect(result.model).toBe('gpt-5-mini')
		expect(openaiProviderFactory).toHaveBeenCalledWith('gpt-5-mini')
	})

	it('throws when openai provider is selected but OPENAI_API_KEY is missing', () => {
		const createErrorMock = vi.fn((input: { statusCode: number; statusMessage: string }) => {
			const error = new Error(input.statusMessage) as Error & {
				statusCode?: number
			}
			error.statusCode = input.statusCode
			return error
		})

		vi.stubGlobal('createError', createErrorMock)
		vi.stubGlobal('useRuntimeConfig', () => ({
			ai: {
				provider: 'openai'
			},
			openai: {
				token: ''
			},
			mistral: {
				token: 'mistral-secret'
			}
		}))

		expect(() => resolveAiProvider({} as never)).toThrow(
			'Missing OPENAI_API_KEY for OpenAI provider'
		)
		expect(createErrorMock).toHaveBeenCalledWith({
			statusCode: 500,
			statusMessage: 'Missing OPENAI_API_KEY for OpenAI provider'
		})
	})

	it('throws when mistral provider is selected but MISTRAL_API_KEY is missing', () => {
		const createErrorMock = vi.fn((input: { statusCode: number; statusMessage: string }) => {
			const error = new Error(input.statusMessage) as Error & {
				statusCode?: number
			}
			error.statusCode = input.statusCode
			return error
		})

		vi.stubGlobal('createError', createErrorMock)
		vi.stubGlobal('useRuntimeConfig', () => ({
			ai: {
				provider: 'mistral'
			},
			openai: {
				token: 'openai-secret'
			},
			mistral: {
				token: ''
			}
		}))

		expect(() => resolveAiProvider({} as never)).toThrow(
			'Missing MISTRAL_API_KEY for Mistral provider'
		)
		expect(createErrorMock).toHaveBeenCalledWith({
			statusCode: 500,
			statusMessage: 'Missing MISTRAL_API_KEY for Mistral provider'
		})
	})

	it('throws when AI_PROVIDER has an unsupported value', () => {
		const createErrorMock = vi.fn((input: { statusCode: number; statusMessage: string }) => {
			const error = new Error(input.statusMessage) as Error & {
				statusCode?: number
			}
			error.statusCode = input.statusCode
			return error
		})

		vi.stubGlobal('createError', createErrorMock)
		vi.stubGlobal('useRuntimeConfig', () => ({
			ai: {
				provider: 'anthropic'
			},
			openai: {
				token: 'openai-secret'
			},
			mistral: {
				token: 'mistral-secret'
			}
		}))

		expect(() => resolveAiProvider({} as never)).toThrow(
			'Unsupported AI_PROVIDER value: anthropic'
		)
		expect(createErrorMock).toHaveBeenCalledWith({
			statusCode: 500,
			statusMessage: 'Unsupported AI_PROVIDER value: anthropic'
		})
	})
})
