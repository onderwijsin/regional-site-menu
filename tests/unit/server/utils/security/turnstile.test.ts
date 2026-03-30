import { SECURITY_HEADERS } from '~~/config/constants'
import { describe, expect, it, vi } from 'vitest'

async function loadTurnstileUtil(
	options: {
		isAdmin?: boolean
		headers?: Record<string, string | undefined>
		verifyResult?: { success: boolean; action?: string }
		runtimeConfig?: {
			turnstile?: { secretKey?: string }
			public?: { mode?: { isProd?: boolean } }
		}
	} = {}
) {
	vi.resetModules()

	vi.stubGlobal('createError', (input: { statusCode: number; statusMessage: string }) => {
		const error = new Error(input.statusMessage) as Error & {
			statusCode?: number
			statusMessage?: string
		}
		error.statusCode = input.statusCode
		error.statusMessage = input.statusMessage
		return error
	})

	vi.stubGlobal(
		'useRuntimeConfig',
		vi.fn(() => ({
			turnstile: { secretKey: 'secret-key' },
			public: { mode: { isProd: true } },
			...(options.runtimeConfig ?? {})
		}))
	)

	vi.stubGlobal(
		'getRequestHeader',
		vi.fn((_event: unknown, name: string) => options.headers?.[name.toLowerCase()])
	)

	const verifyTurnstileTokenMock = vi
		.fn()
		.mockResolvedValue(options.verifyResult ?? { success: true })
	vi.stubGlobal('verifyTurnstileToken', verifyTurnstileTokenMock)

	const isAdminMock = vi.fn(() => options.isAdmin ?? false)
	vi.doMock('~~/server/utils/security/admin', () => ({
		isAdmin: isAdminMock
	}))

	const module = await import('~~/server/utils/security/turnstile')
	return {
		assertTurnstileToken: module.assertTurnstileToken,
		verifyTurnstileTokenMock,
		isAdminMock
	}
}

describe('security/turnstile', () => {
	it('bypasses validation when request is admin', async () => {
		const { assertTurnstileToken, verifyTurnstileTokenMock } = await loadTurnstileUtil({
			isAdmin: true
		})

		await expect(assertTurnstileToken({} as never, 'ai_briefing')).resolves.toBeUndefined()
		expect(verifyTurnstileTokenMock).not.toHaveBeenCalled()
	})

	it('throws when token header is missing', async () => {
		const { assertTurnstileToken } = await loadTurnstileUtil({
			headers: {}
		})

		await expect(assertTurnstileToken({} as never, 'ai_briefing')).rejects.toMatchObject({
			statusCode: 400,
			statusMessage: 'Turnstile token ontbreekt'
		})
	})

	it('calls verifyTurnstileToken when token is present', async () => {
		const { assertTurnstileToken, verifyTurnstileTokenMock } = await loadTurnstileUtil({
			headers: {
				[SECURITY_HEADERS.turnstileToken]: 'token-123'
			}
		})

		await expect(assertTurnstileToken({} as never, 'ai_briefing')).resolves.toBeUndefined()
		expect(verifyTurnstileTokenMock).toHaveBeenCalledWith('token-123', {})
	})

	it('throws when turnstile action does not match expected action', async () => {
		const { assertTurnstileToken } = await loadTurnstileUtil({
			headers: {
				[SECURITY_HEADERS.turnstileToken]: 'token-123'
			},
			verifyResult: {
				success: true,
				action: 'suggestion_submission'
			}
		})

		await expect(assertTurnstileToken({} as never, 'ai_briefing')).rejects.toMatchObject({
			statusCode: 403,
			statusMessage: 'Turnstile actie komt niet overeen'
		})
	})
})
