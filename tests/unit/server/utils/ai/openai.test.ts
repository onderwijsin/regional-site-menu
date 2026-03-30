import {
	getOpenAiClient,
	getSupportedOpenAiValuesFromError,
	isUnsupportedOpenAiParameterError,
	pickFirstSupportedOpenAiValue
} from '~~/server/utils/ai/openai'
import { describe, expect, it, vi } from 'vitest'

const OpenAiConstructorMock = vi.hoisted(() => vi.fn())

vi.mock('openai', () => ({
	default: OpenAiConstructorMock
}))

describe('server/utils/ai/openai', () => {
	it('creates OpenAI client and falls back to default model', () => {
		vi.stubGlobal(
			'useRuntimeConfig',
			vi.fn().mockReturnValue({
				openai: {
					token: 'secret',
					model: ''
				}
			})
		)

		const result = getOpenAiClient({} as never)

		expect(OpenAiConstructorMock).toHaveBeenCalledWith({ apiKey: 'secret' })
		expect(result.model).toBe('gpt-5')
	})

	it('throws a typed runtime error when API key is missing', () => {
		const createErrorMock = vi.fn((input: { statusCode: number; statusMessage: string }) => {
			const error = new Error(input.statusMessage) as Error & {
				statusCode?: number
			}
			error.statusCode = input.statusCode
			return error
		})

		vi.stubGlobal('createError', createErrorMock)
		vi.stubGlobal(
			'useRuntimeConfig',
			vi.fn().mockReturnValue({
				openai: {
					token: '',
					model: 'gpt-test'
				}
			})
		)

		expect(() => getOpenAiClient({} as never)).toThrow(
			'OPENAI_API_KEY is missing in runtimeConfig'
		)
		expect(createErrorMock).toHaveBeenCalledWith({
			statusCode: 500,
			statusMessage: 'OPENAI_API_KEY is missing in runtimeConfig'
		})
	})

	it('detects unsupported parameter errors and extracts fallback values', () => {
		expect(
			isUnsupportedOpenAiParameterError(
				{ code: 'unsupported_value', param: 'reasoning.effort' },
				'reasoning.effort'
			)
		).toBe(true)

		expect(
			getSupportedOpenAiValuesFromError({
				message: "Unsupported value. Supported values are: 'medium', 'low'."
			})
		).toEqual(['medium', 'low'])

		expect(pickFirstSupportedOpenAiValue(['low', 'medium'], ['high', 'medium', 'low'])).toBe(
			'medium'
		)
	})
})
