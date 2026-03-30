import { describe, expect, it, vi } from 'vitest'

async function loadRouteGuard(
	options: {
		isAdmin?: boolean
		decision?: { allowed: boolean }
		url?: string
		headers?: Record<string, string | undefined>
	} = {}
) {
	vi.resetModules()

	const evaluateProtectedPostRequestMock = vi
		.fn()
		.mockReturnValue(options.decision ?? { allowed: true })
	const isAdminMock = vi.fn(() => options.isAdmin ?? false)

	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	vi.stubGlobal(
		'getRequestURL',
		vi.fn(() => new URL(options.url ?? 'https://app.example.com/api/ai/briefing'))
	)
	vi.stubGlobal(
		'getRequestHeader',
		vi.fn((_event: unknown, name: string) => options.headers?.[name.toLowerCase()])
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

	vi.doMock('~~/server/utils/security/request-guard', () => ({
		evaluateProtectedPostRequest: evaluateProtectedPostRequestMock
	}))
	vi.doMock('~~/server/utils/security/admin', () => ({
		isAdmin: isAdminMock
	}))

	const module = await import('~~/server/middleware/route-guard')
	return {
		handler: module.default,
		evaluateProtectedPostRequestMock,
		isAdminMock
	}
}

describe('server/middleware/route-guard', () => {
	it('skips guard for non-POST requests', async () => {
		const { handler, evaluateProtectedPostRequestMock, isAdminMock } = await loadRouteGuard()
		expect(() => handler({ node: { req: { method: 'GET' } } } as never)).not.toThrow()

		expect(isAdminMock).not.toHaveBeenCalled()
		expect(evaluateProtectedPostRequestMock).not.toHaveBeenCalled()
	})

	it('bypasses route guard for admin requests', async () => {
		const { handler, evaluateProtectedPostRequestMock, isAdminMock } = await loadRouteGuard({
			isAdmin: true,
			decision: { allowed: false }
		})

		expect(() => handler({ node: { req: { method: 'POST' } } } as never)).not.toThrow()
		expect(isAdminMock).toHaveBeenCalledWith({ node: { req: { method: 'POST' } } })
		expect(evaluateProtectedPostRequestMock).not.toHaveBeenCalled()
	})

	it('throws 403 when protected POST request origin check fails', async () => {
		const { handler, evaluateProtectedPostRequestMock } = await loadRouteGuard({
			isAdmin: false,
			decision: { allowed: false },
			url: 'https://app.example.com/api/datahub/submission',
			headers: {
				'sec-fetch-site': 'cross-site',
				origin: 'https://evil.example.com',
				referer: 'https://evil.example.com/path'
			}
		})

		expect(() => handler({ node: { req: { method: 'POST' } } } as never)).toThrow(
			'Invalid request origin'
		)
		expect(evaluateProtectedPostRequestMock).toHaveBeenCalledWith({
			pathname: '/api/datahub/submission',
			requestOrigin: 'https://app.example.com',
			fetchSiteHeader: 'cross-site',
			originHeader: 'https://evil.example.com',
			refererHeader: 'https://evil.example.com/path'
		})
	})
})
