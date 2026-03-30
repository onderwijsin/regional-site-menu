import { DATAHUB_CONFIG } from '~~/config/constants'
import { describe, expect, it, vi } from 'vitest'

async function loadHandler() {
	vi.resetModules()
	const assertTurnstileTokenMock = vi.fn().mockResolvedValue(undefined)
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	vi.stubGlobal('createError', (input: { statusCode: number; statusMessage: string }) => {
		const error = new Error(input.statusMessage) as Error & {
			statusCode?: number
			statusMessage?: string
		}
		error.statusCode = input.statusCode
		error.statusMessage = input.statusMessage
		return error
	})
	vi.doMock('~~/server/utils/security/turnstile', () => ({
		assertTurnstileToken: assertTurnstileTokenMock
	}))

	const module = await import('~~/server/api/datahub/submission.post')
	return {
		handler: module.default,
		assertTurnstileTokenMock
	}
}

describe('POST /api/datahub/submission', () => {
	it('forwards validated payload to Datahub and returns success', async () => {
		const body = {
			title: 'Nieuwe suggestie',
			description: 'Korte beschrijving',
			body: 'Lange toelichting',
			category: 'extra',
			goals: ['Informeren'],
			exampleUrl: 'https://example.com'
		}

		const readBody = vi.fn().mockResolvedValue(body)
		const useRuntimeConfig = vi.fn().mockReturnValue({
			datahub: {
				url: 'https://datahub.example',
				token: 'secret-token'
			}
		})
		const fetchSpy = vi.fn().mockResolvedValue({ id: '123' })

		vi.stubGlobal('readBody', readBody)
		vi.stubGlobal('useRuntimeConfig', useRuntimeConfig)
		vi.stubGlobal('$fetch', fetchSpy)

		const { handler, assertTurnstileTokenMock } = await loadHandler()
		await expect(handler({})).resolves.toEqual({ success: true })

		expect(fetchSpy).toHaveBeenCalledWith('https://datahub.example/items/submissions', {
			method: 'POST',
			headers: {
				Authorization: 'Bearer secret-token'
			},
			body: {
				form_type: DATAHUB_CONFIG.submissionFormType,
				payload: body
			},
			query: {
				fields: [...DATAHUB_CONFIG.responseFields]
			}
		})
		expect(assertTurnstileTokenMock).toHaveBeenCalledWith({}, 'suggestion_submission')
	})

	it('throws when runtime config misses DATAHUB_URL', async () => {
		vi.stubGlobal(
			'readBody',
			vi.fn().mockResolvedValue({
				title: 'Nieuwe suggestie',
				description: 'Korte beschrijving',
				body: 'Lange toelichting',
				category: 'extra',
				goals: ['Informeren'],
				exampleUrl: 'https://example.com'
			})
		)
		vi.stubGlobal('useRuntimeConfig', vi.fn().mockReturnValue({ datahub: { token: 'token' } }))
		vi.stubGlobal('$fetch', vi.fn())

		const { handler } = await loadHandler()
		await expect(handler({})).rejects.toMatchObject({
			statusCode: 500,
			statusMessage: 'DATAHUB_URL is missing in runtimeConfig'
		})
	})

	it('throws on invalid request payload before calling downstream API', async () => {
		const fetchSpy = vi.fn()
		vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ title: '' }))
		vi.stubGlobal(
			'useRuntimeConfig',
			vi.fn().mockReturnValue({
				datahub: {
					url: 'https://datahub.example',
					token: 'secret-token'
				}
			})
		)
		vi.stubGlobal('$fetch', fetchSpy)

		const { handler } = await loadHandler()
		await expect(handler({})).rejects.toBeTruthy()
		expect(fetchSpy).not.toHaveBeenCalled()
	})
})
