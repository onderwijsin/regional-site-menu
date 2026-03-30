import { Welcome } from '#components'

/**
 * Creates helpers for controlling the welcome modal.
 *
 * @returns Open action and reactive visibility signal for the welcome flow.
 */
export const useWelcome = () => {
	const overlay = useOverlay()
	const state = useStateStore()

	const modal = overlay.create(Welcome)

	function open() {
		modal.open()
	}

	return {
		openWelcome: open,
		showWelcome: computed(() => state.shouldShowWelcomeModal)
	}
}
