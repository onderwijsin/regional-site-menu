import { evaluateProtectedPostRequest } from '~~/server/utils/security/request-guard'
import { describe, expect, it } from 'vitest'

describe('security/request-guard', () => {
	it('allows non-protected paths', () => {
		const decision = evaluateProtectedPostRequest({
			pathname: '/api/health',
			requestOrigin: 'https://app.example.com',
			fetchSiteHeader: 'cross-site',
			originHeader: 'https://attacker.example.com'
		})

		expect(decision).toEqual({ allowed: true, reason: 'not_protected' })
	})

	it('allows missing sec-fetch-site but blocks explicit cross-site values', () => {
		expect(
			evaluateProtectedPostRequest({
				pathname: '/api/ai/briefing',
				requestOrigin: 'https://app.example.com',
				fetchSiteHeader: undefined,
				originHeader: 'https://app.example.com'
			})
		).toEqual({ allowed: true })

		expect(
			evaluateProtectedPostRequest({
				pathname: '/api/ai/briefing',
				requestOrigin: 'https://app.example.com',
				fetchSiteHeader: 'cross-site',
				originHeader: 'https://app.example.com'
			})
		).toEqual({ allowed: false, reason: 'invalid_fetch_site' })
	})

	it('allows protected paths when sec-fetch-site is whitespace', () => {
		const decision = evaluateProtectedPostRequest({
			pathname: '/api/ai/briefing',
			requestOrigin: 'https://app.example.com',
			fetchSiteHeader: '   ',
			originHeader: 'https://app.example.com'
		})

		expect(decision).toEqual({ allowed: true })
	})

	it('allows protected paths for same-origin requests', () => {
		const decision = evaluateProtectedPostRequest({
			pathname: '/api/ai/website-analysis',
			requestOrigin: 'https://app.example.com',
			fetchSiteHeader: 'same-origin',
			originHeader: 'https://app.example.com'
		})

		expect(decision).toEqual({ allowed: true })
	})

	it('falls back to referer when origin header is absent', () => {
		const decision = evaluateProtectedPostRequest({
			pathname: '/api/datahub/submission',
			requestOrigin: 'https://app.example.com',
			fetchSiteHeader: 'same-site',
			refererHeader: 'https://app.example.com/form?x=1'
		})

		expect(decision).toEqual({ allowed: true })
	})

	it('blocks protected paths when request origin itself is invalid', () => {
		const decision = evaluateProtectedPostRequest({
			pathname: '/api/ai/briefing',
			requestOrigin: 'not-a-url',
			fetchSiteHeader: 'same-origin',
			originHeader: 'https://app.example.com'
		})

		expect(decision).toEqual({ allowed: false, reason: 'invalid_origin' })
	})

	it('blocks protected paths when no valid origin metadata is available', () => {
		const decision = evaluateProtectedPostRequest({
			pathname: '/api/datahub/submission',
			requestOrigin: 'https://app.example.com',
			fetchSiteHeader: 'same-site',
			originHeader: 'null',
			refererHeader: 'not-a-url'
		})

		expect(decision).toEqual({ allowed: false, reason: 'invalid_origin' })
	})

	it('blocks protected paths for cross-origin origin/referer', () => {
		expect(
			evaluateProtectedPostRequest({
				pathname: '/api/ai/briefing',
				requestOrigin: 'https://app.example.com',
				fetchSiteHeader: 'same-origin',
				originHeader: 'https://evil.example.com'
			})
		).toEqual({ allowed: false, reason: 'invalid_origin' })

		expect(
			evaluateProtectedPostRequest({
				pathname: '/api/ai/briefing',
				requestOrigin: 'https://app.example.com',
				fetchSiteHeader: 'same-origin',
				refererHeader: 'https://evil.example.com/path'
			})
		).toEqual({ allowed: false, reason: 'invalid_origin' })
	})
})
