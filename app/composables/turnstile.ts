/**
 * Turnstile composable.
 *
 * Handles:
 * - token state
 * - enabled state
 * - safe token retrieval with lightweight retry
 * - reset lifecycle after submissions
 *
 * @returns Turnstile state and helper methods for token lifecycle handling.
 */
export function useTurnstile() {
	const runtimeConfig = useRuntimeConfig()
	const token = ref<string | undefined>(undefined)

	const isEnabled = computed(() => {
		return Boolean(runtimeConfig.public.turnstile?.siteKey?.trim())
	})

	function getToken(): string | undefined {
		return token.value?.trim() || undefined
	}

	async function getTokenWithRetry(retries = 3, delayMs = 250): Promise<string | undefined> {
		if (!isEnabled.value) {
			return undefined
		}

		for (let attempt = 0; attempt <= retries; attempt += 1) {
			const current = getToken()
			if (current) {
				return current
			}

			await new Promise<void>((resolve) => {
				setTimeout(resolve, delayMs)
			})
		}

		return undefined
	}

	function isReady(): boolean {
		if (!isEnabled.value) {
			return true
		}

		return Boolean(getToken())
	}

	function reset(instance?: { reset: () => void }): void {
		token.value = undefined
		if (!isEnabled.value) {
			return
		}

		instance?.reset()
	}

	function showPendingHint(): void {
		const toast = useToast()
		const { getIcon } = useIcons()

		toast.add({
			title: 'Even wachten…',
			description: 'Bezig met beveiligingscontrole',
			color: 'warning',
			icon: getIcon('warn')
		})
	}

	function showMissingTokenErrorHint(): void {
		const toast = useToast()
		const { getIcon } = useIcons()

		toast.add({
			title: 'Beveilivingscontrole mislukt',
			description: 'Ververs de pagina en probeer het opnieuw',
			color: 'error',
			icon: getIcon('error')
		})
	}

	return {
		token,
		isEnabled,
		getToken,
		getTokenWithRetry,
		isReady,
		reset,
		showPendingHint,
		showMissingTokenErrorHint
	}
}
