import { SECURITY_HEADERS } from '~~/config/constants'
import { isAdmin } from '~~/server/utils/security/admin'
import { describe, expect, it, vi } from 'vitest'

function mockHeaders(headers: Record<string, string | undefined>) {
	vi.stubGlobal(
		'getRequestHeader',
		vi.fn((_event: unknown, name: string) => headers[name.toLowerCase()])
	)
}

describe('security/admin', () => {
	it('returns true when x-admin-token matches runtime api token', () => {
		vi.stubGlobal(
			'useRuntimeConfig',
			vi.fn(() => ({ apiToken: 'master-token' }))
		)
		mockHeaders({
			[SECURITY_HEADERS.adminToken]: 'master-token'
		})

		expect(isAdmin({} as never)).toBe(true)
	})

	it('returns true when Authorization bearer token matches runtime api token', () => {
		vi.stubGlobal(
			'useRuntimeConfig',
			vi.fn(() => ({ apiToken: 'master-token' }))
		)
		mockHeaders({
			authorization: 'Bearer master-token'
		})

		expect(isAdmin({} as never)).toBe(true)
	})

	it('returns false for invalid bearer format or wrong token', () => {
		vi.stubGlobal(
			'useRuntimeConfig',
			vi.fn(() => ({ apiToken: 'master-token' }))
		)
		mockHeaders({
			authorization: 'Basic abc',
			[SECURITY_HEADERS.adminToken]: 'wrong-token'
		})

		expect(isAdmin({} as never)).toBe(false)
	})

	it('returns false when runtime api token is missing', () => {
		vi.stubGlobal(
			'useRuntimeConfig',
			vi.fn(() => ({ apiToken: '' }))
		)
		mockHeaders({
			[SECURITY_HEADERS.adminToken]: 'master-token'
		})

		expect(isAdmin({} as never)).toBe(false)
	})

	it('returns false when admin token header is wrong and authorization header is missing', () => {
		vi.stubGlobal(
			'useRuntimeConfig',
			vi.fn(() => ({ apiToken: 'master-token' }))
		)
		mockHeaders({
			[SECURITY_HEADERS.adminToken]: 'wrong-token'
		})

		expect(isAdmin({} as never)).toBe(false)
	})
})
