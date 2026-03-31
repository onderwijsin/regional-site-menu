import { describe, expect, it, vi } from 'vitest'

async function loadSentryTestRoute() {
	vi.resetModules()
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const module = await import('~~/server/api/_sentry/trigger-error.get')
	return {
		handler: module.default as () => never
	}
}

describe('GET /api/_sentry/trigger-error', () => {
	it('throws the intentional sentry test error', async () => {
		const { handler } = await loadSentryTestRoute()
		expect(() => handler()).toThrowError('Sentry test API route error')
	})
})
