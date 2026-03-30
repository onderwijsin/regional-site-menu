import { fetchLlmsFullReferenceDocument } from '~~/server/utils/ai/reference'
import { describe, expect, it, vi } from 'vitest'

describe('server/utils/ai/reference', () => {
	it('returns llms-full document when available', async () => {
		const fetchMock = vi.fn().mockResolvedValue('Uitgebreide referentie')
		const event = { $fetch: fetchMock } as never

		await expect(fetchLlmsFullReferenceDocument(event)).resolves.toBe('Uitgebreide referentie')
		expect(fetchMock).toHaveBeenNthCalledWith(1, '/llms-full.txt', {
			headers: {
				Accept: 'text/plain'
			}
		})
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})

	it('falls back to llms.txt when llms-full is empty or whitespace', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce('   ')
			.mockResolvedValueOnce('Compacte fallback referentie')
		const event = { $fetch: fetchMock } as never

		await expect(fetchLlmsFullReferenceDocument(event)).resolves.toBe(
			'Compacte fallback referentie'
		)
		expect(fetchMock).toHaveBeenNthCalledWith(1, '/llms-full.txt', {
			headers: {
				Accept: 'text/plain'
			}
		})
		expect(fetchMock).toHaveBeenNthCalledWith(2, '/llms.txt', {
			headers: {
				Accept: 'text/plain'
			}
		})
	})

	it('falls back to llms.txt when llms-full fetch throws', async () => {
		const fetchMock = vi
			.fn()
			.mockRejectedValueOnce(new Error('route unavailable'))
			.mockResolvedValueOnce('Fallback inhoud')
		const event = { $fetch: fetchMock } as never

		await expect(fetchLlmsFullReferenceDocument(event)).resolves.toBe('Fallback inhoud')
		expect(fetchMock).toHaveBeenCalledTimes(2)
	})

	it('throws a typed runtime error when both documents are unavailable', async () => {
		const fetchMock = vi
			.fn()
			.mockRejectedValueOnce(new Error('missing full'))
			.mockResolvedValueOnce('')
		const event = { $fetch: fetchMock } as never

		const createErrorMock = vi.fn((input: { statusCode: number; statusMessage: string }) => {
			const error = new Error(input.statusMessage) as Error & {
				statusCode?: number
				statusMessage?: string
			}
			error.statusCode = input.statusCode
			error.statusMessage = input.statusMessage
			return error
		})
		vi.stubGlobal('createError', createErrorMock)

		await expect(fetchLlmsFullReferenceDocument(event)).rejects.toMatchObject({
			statusCode: 500,
			statusMessage: 'Could not fetch llms reference document'
		})
		expect(createErrorMock).toHaveBeenCalledWith({
			statusCode: 500,
			statusMessage: 'Could not fetch llms reference document'
		})
	})
})
