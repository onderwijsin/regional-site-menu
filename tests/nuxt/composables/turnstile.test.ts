import { useTurnstile } from '~/composables/turnstile'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { toastAddMock } = vi.hoisted(() => ({
	toastAddMock: vi.fn()
}))

describe('useTurnstile', () => {
	beforeEach(() => {
		toastAddMock.mockReset()

		vi.stubGlobal(
			'useRuntimeConfig',
			vi.fn(() => ({
				public: {
					turnstile: {
						siteKey: 'site-key'
					}
				}
			}))
		)

		vi.stubGlobal('useToast', () => ({
			add: toastAddMock
		}))

		vi.stubGlobal('useIcons', () => ({
			getIcon: (name: string) => `icon:${name}`
		}))
	})

	afterEach(() => {
		vi.restoreAllMocks()
		vi.useRealTimers()
	})

	it('shows pending hint toast', () => {
		const turnstile = useTurnstile()
		turnstile.showPendingHint()

		expect(toastAddMock).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Even wachten…',
				description: 'Bezig met beveiligingscontrole',
				color: 'warning'
			})
		)
	})

	it('shows missing-token error hint toast', () => {
		const turnstile = useTurnstile()
		turnstile.showMissingTokenErrorHint()

		expect(toastAddMock).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Beveilivingscontrole mislukt',
				description: 'Ververs de pagina en probeer het opnieuw',
				color: 'error'
			})
		)
	})

	it('returns trimmed token from retry helper when token is already available', async () => {
		const turnstile = useTurnstile()
		turnstile.token.value = ' token-123 '

		await expect(turnstile.getTokenWithRetry(0, 1)).resolves.toBe('token-123')
	})

	it('returns undefined when retry helper cannot obtain token', async () => {
		vi.useFakeTimers()
		const turnstile = useTurnstile()

		const promise = turnstile.getTokenWithRetry(1, 100)
		await vi.advanceTimersByTimeAsync(300)

		await expect(promise).resolves.toBeUndefined()
	})
})
