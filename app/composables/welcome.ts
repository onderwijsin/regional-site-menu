import { Welcome } from '#components'

export const useWelcome = () => {
	const overlay = useOverlay()
	const state = useStateStore()

	const modal = overlay.create(Welcome)

	function open() {
		modal.open()
	}

	return {
		openWelcome: open,
		showWelcome: computed(() => state.shouldShowWelcomeModal),
		hideWelcomeForNextVisit: state.hideWelcomeForNextVisit,
	}
}
