import { describe, expect, it, vi } from 'vitest'

async function loadAssetsRoute(pathname?: string) {
	vi.resetModules()

	const createErrorMock = vi.fn((input: { statusCode: number; statusMessage: string }) => {
		const error = new Error(input.statusMessage) as Error & {
			statusCode?: number
			statusMessage?: string
		}
		error.statusCode = input.statusCode
		error.statusMessage = input.statusMessage
		return error
	})
	const eventHandlerMock = vi.fn((handler: unknown) => handler)
	const getRouterParamMock = vi.fn(() => pathname)
	const serveMock = vi.fn().mockResolvedValue({ ok: true })
	const setHeaderMock = vi.fn()

	vi.stubGlobal('setHeader', setHeaderMock)
	vi.doMock('h3', () => ({
		createError: createErrorMock,
		eventHandler: eventHandlerMock,
		getRouterParam: getRouterParamMock
	}))
	vi.doMock('hub:blob', () => ({
		blob: {
			serve: serveMock
		}
	}))

	const module = await import('~~/server/routes/assets/[...pathname].get')
	return {
		handler: module.default as (_event: unknown) => Promise<unknown>,
		createErrorMock,
		getRouterParamMock,
		serveMock,
		setHeaderMock
	}
}

describe('GET /assets/[...pathname]', () => {
	it('throws 404 when pathname is missing', async () => {
		const { handler, serveMock, setHeaderMock } = await loadAssetsRoute(undefined)

		await expect(handler({})).rejects.toMatchObject({
			statusCode: 404,
			statusMessage: 'Not Found'
		})
		expect(setHeaderMock).not.toHaveBeenCalled()
		expect(serveMock).not.toHaveBeenCalled()
	})

	it('sets csp header and serves blob from assets prefix', async () => {
		const { handler, serveMock, setHeaderMock, getRouterParamMock } =
			await loadAssetsRoute('images/logo.svg')
		const event = { id: 'event-1' }

		await expect(handler(event)).resolves.toEqual({ ok: true })
		expect(getRouterParamMock).toHaveBeenCalledWith(event, 'pathname')
		expect(setHeaderMock).toHaveBeenCalledWith(
			event,
			'Content-Security-Policy',
			"default-src 'none';"
		)
		expect(serveMock).toHaveBeenCalledWith(event, '/assets/images/logo.svg')
	})
})
