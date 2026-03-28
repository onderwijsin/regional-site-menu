import {
	extractResponseRefusalText,
	readRecordField,
	requestWithOpenAiCompatibility,
	shouldRetryAfterTokenLimitIncomplete
} from '~~/server/utils/ai/response'
import { describe, expect, it, vi } from 'vitest'

describe('requestWithOpenAiCompatibility', () => {
	it('falls back to plain text mode when structured parsing fails', async () => {
		const requestStructured = vi
			.fn()
			.mockRejectedValueOnce(new SyntaxError('Unexpected token in JSON at position 4'))
		const requestPlain = vi.fn().mockResolvedValue({ mode: 'plain' })

		const result = await requestWithOpenAiCompatibility({
			label: 'analysis',
			maxOutputTokens: 1200,
			includeReasoning: true,
			reasoningEffort: 'high',
			verbosity: 'medium',
			requestStructured,
			requestPlain
		})

		expect(result).toEqual({ mode: 'plain' })
		expect(requestStructured).toHaveBeenCalledTimes(1)
		expect(requestPlain).toHaveBeenCalledTimes(1)
	})

	it('retries with supported reasoning fallback when OpenAI rejects value', async () => {
		const requestStructured = vi
			.fn()
			.mockRejectedValueOnce({
				code: 'unsupported_value',
				param: 'reasoning.effort',
				message: "Unsupported value. Supported values are: 'medium', 'low'."
			})
			.mockResolvedValueOnce({ mode: 'structured' })

		await requestWithOpenAiCompatibility({
			label: 'analysis',
			maxOutputTokens: 1200,
			includeReasoning: true,
			reasoningEffort: 'high',
			verbosity: 'medium',
			requestStructured,
			requestPlain: vi.fn()
		})

		expect(requestStructured).toHaveBeenCalledTimes(2)
		expect(requestStructured.mock.calls[1]?.[0]?.reasoningEffort).toBe('medium')
	})

	it('retries without reasoning when no supported reasoning fallback is available', async () => {
		const requestStructured = vi
			.fn()
			.mockRejectedValueOnce({
				code: 'unsupported_parameter',
				param: 'reasoning.effort',
				message: 'Unsupported parameter: reasoning.effort'
			})
			.mockResolvedValueOnce({ mode: 'structured-no-reasoning' })

		const result = await requestWithOpenAiCompatibility({
			label: 'analysis',
			maxOutputTokens: 1200,
			includeReasoning: true,
			reasoningEffort: 'high',
			verbosity: 'medium',
			requestStructured,
			requestPlain: vi.fn()
		})

		expect(result).toEqual({ mode: 'structured-no-reasoning' })
		expect(requestStructured.mock.calls[1]?.[0]?.includeReasoning).toBe(false)
	})

	it('retries with verbosity compatibility fallbacks', async () => {
		const requestStructured = vi
			.fn()
			.mockRejectedValueOnce({
				code: 'unsupported_value',
				param: 'text.verbosity',
				message: "Unsupported value. Supported values are: 'low'."
			})
			.mockRejectedValueOnce({
				code: 'unsupported_parameter',
				param: 'text.verbosity',
				message: 'Unsupported parameter: text.verbosity'
			})
			.mockResolvedValueOnce({ mode: 'structured-no-verbosity' })

		const result = await requestWithOpenAiCompatibility({
			label: 'analysis',
			maxOutputTokens: 1200,
			includeReasoning: false,
			reasoningEffort: 'none',
			verbosity: 'high',
			requestStructured,
			requestPlain: vi.fn()
		})

		expect(result).toEqual({ mode: 'structured-no-verbosity' })
		expect(requestStructured.mock.calls[1]?.[0]?.verbosity).toBe('low')
		expect(requestStructured.mock.calls[2]?.[0]?.includeVerbosity).toBe(false)
	})
})

describe('response utility guards', () => {
	it('detects token-limit incomplete responses without usable output', () => {
		expect(
			shouldRetryAfterTokenLimitIncomplete({
				status: 'incomplete',
				incomplete_details: {
					reason: 'max_output_tokens'
				}
			})
		).toBe(true)

		expect(
			shouldRetryAfterTokenLimitIncomplete({
				status: 'incomplete',
				output_text: 'already has text',
				incomplete_details: {
					reason: 'max_output_tokens'
				}
			})
		).toBe(false)
	})

	it('extracts refusal text and safely reads record fields', () => {
		const refusal = extractResponseRefusalText({
			output: [
				{
					content: [
						{
							type: 'refusal',
							refusal: 'Ik kan dit niet doen.'
						}
					]
				}
			]
		})

		expect(refusal).toBe('Ik kan dit niet doen.')
		expect(readRecordField({ key: 1 }, 'key')).toBe(1)
		expect(readRecordField(null, 'key')).toBeUndefined()
	})
})
