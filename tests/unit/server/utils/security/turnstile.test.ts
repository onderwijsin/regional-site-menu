import { SECURITY_HEADERS } from '~~/config/constants'
import { describe, expect, it, vi } from 'vitest'

async function loadTurnstileUtil(
	options: {
		isAdmin?: boolean
		headers?: Record<string, string | undefined>
		verifyResult?: { success: boolean; action?: string }
		verifyError?: unknown
		url?: string
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
	vi.stubGlobal(
		'getRequestURL',
		vi.fn(() => new URL(options.url ?? 'https://app.example.com/api/ai/briefing'))
	)

	const sentryScopeMock = {
		setLevel: vi.fn(),
		setTag: vi.fn(),
		setContext: vi.fn()
	}
	const withScopeMock = vi.fn((callback: (_scope: typeof sentryScopeMock) => void) => {
		callback(sentryScopeMock)
	})
	const captureExceptionMock = vi.fn()
	const captureMessageMock = vi.fn()
	vi.doMock('@sentry/nuxt', () => ({
		withScope: withScopeMock,
		captureException: captureExceptionMock,
		captureMessage: captureMessageMock
	}))

	const verifyTurnstileTokenMock = vi.fn()
	if (typeof options.verifyError !== 'undefined') {
		verifyTurnstileTokenMock.mockRejectedValue(options.verifyError)
	} else {
		verifyTurnstileTokenMock.mockResolvedValue(options.verifyResult ?? { success: true })
	}
	vi.stubGlobal('verifyTurnstileToken', verifyTurnstileTokenMock)

	const isAdminMock = vi.fn(() => options.isAdmin ?? false)
	vi.doMock('~~/server/utils/security/admin', () => ({
		isAdmin: isAdminMock
	}))

	const module = await import('~~/server/utils/security/turnstile')
	return {
		assertTurnstileToken: module.assertTurnstileToken,
		verifyTurnstileTokenMock,
		isAdminMock,
		sentryScopeMock,
		withScopeMock,
		captureExceptionMock,
		captureMessageMock
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
			statusMessage: 'Turnstile token is missing'
		})
	})

	it('throws 500 in production when turnstile secret key is missing', async () => {
		const { assertTurnstileToken, verifyTurnstileTokenMock } = await loadTurnstileUtil({
			runtimeConfig: {
				turnstile: { secretKey: '   ' },
				public: { mode: { isProd: true } }
			}
		})

		await expect(assertTurnstileToken({} as never, 'ai_briefing')).rejects.toMatchObject({
			statusCode: 500,
			statusMessage: 'TURNSTILE_SECRET_KEY is missing in runtimeConfig'
		})
		expect(verifyTurnstileTokenMock).not.toHaveBeenCalled()
	})

	it('skips validation outside production when turnstile secret key is missing', async () => {
		const { assertTurnstileToken, verifyTurnstileTokenMock } = await loadTurnstileUtil({
			runtimeConfig: {
				turnstile: { secretKey: '   ' },
				public: { mode: { isProd: false } }
			}
		})

		await expect(assertTurnstileToken({} as never, 'ai_briefing')).resolves.toBeUndefined()
		expect(verifyTurnstileTokenMock).not.toHaveBeenCalled()
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
			statusMessage: 'Turnstile action does not match'
		})
	})

	it('throws when turnstile verification reports success as false', async () => {
		const { assertTurnstileToken } = await loadTurnstileUtil({
			headers: {
				[SECURITY_HEADERS.turnstileToken]: 'token-123'
			},
			verifyResult: {
				success: false
			}
		})

		await expect(assertTurnstileToken({} as never, 'ai_briefing')).rejects.toMatchObject({
			statusCode: 403,
			statusMessage: 'Turnstile validation failed'
		})
	})

	it('rethrows status-code errors from token verification', async () => {
		const verificationError = Object.assign(new Error('verification upstream error'), {
			statusCode: 429
		})
		const { assertTurnstileToken, withScopeMock } = await loadTurnstileUtil({
			headers: {
				[SECURITY_HEADERS.turnstileToken]: 'token-123'
			},
			verifyError: verificationError
		})

		await expect(assertTurnstileToken({} as never, 'ai_briefing')).rejects.toBe(
			verificationError
		)
		expect(withScopeMock).not.toHaveBeenCalled()
	})

	it('throws 502 and captures transport Error exceptions from token verification', async () => {
		const transportError = new Error('network failure')
		const {
			assertTurnstileToken,
			sentryScopeMock,
			withScopeMock,
			captureExceptionMock,
			captureMessageMock
		} = await loadTurnstileUtil({
			headers: {
				[SECURITY_HEADERS.turnstileToken]: 'token-123'
			},
			verifyError: transportError
		})

		await expect(assertTurnstileToken({} as never, 'ai_briefing')).rejects.toMatchObject({
			statusCode: 502,
			statusMessage: 'Turnstile validation could not be performed'
		})
		expect(withScopeMock).toHaveBeenCalledTimes(1)
		expect(sentryScopeMock.setLevel).toHaveBeenCalledWith('error')
		expect(sentryScopeMock.setTag).toHaveBeenCalledWith('area', 'security')
		expect(sentryScopeMock.setTag).toHaveBeenCalledWith(
			'kind',
			'turnstile_verification_transport_failure'
		)
		expect(sentryScopeMock.setContext).toHaveBeenCalledWith('turnstile_verification', {
			expectedAction: 'ai_briefing',
			path: '/api/ai/briefing'
		})
		expect(captureExceptionMock).toHaveBeenCalledWith(transportError)
		expect(captureMessageMock).not.toHaveBeenCalled()
	})

	it('throws 502 and captures non-Error transport failures as message', async () => {
		const { assertTurnstileToken, captureExceptionMock, captureMessageMock } =
			await loadTurnstileUtil({
				headers: {
					[SECURITY_HEADERS.turnstileToken]: 'token-123'
				},
				verifyError: 'socket disconnect'
			})

		await expect(assertTurnstileToken({} as never, 'ai_briefing')).rejects.toMatchObject({
			statusCode: 502,
			statusMessage: 'Turnstile validation could not be performed'
		})
		expect(captureExceptionMock).not.toHaveBeenCalled()
		expect(captureMessageMock).toHaveBeenCalledWith(
			'Turnstile validation transport failure with non-Error exception'
		)
	})
})
