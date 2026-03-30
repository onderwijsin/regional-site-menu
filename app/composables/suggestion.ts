import { Suggestion } from '#components'

type SuggestionProps = {
	title?: string
	description?: string
}

/**
 * Creates open/close handlers for the suggestion slideover.
 *
 * @param props - Optional title/description shown in the suggestion overlay.
 * @returns Overlay control methods.
 */
export const useSuggestion = (props?: SuggestionProps) => {
	const overlay = useOverlay()

	const slideover = overlay.create(Suggestion, {
		props
	})

	function openSuggestion() {
		slideover.open()
	}

	function closeSuggestion() {
		slideover.close()
	}

	return {
		openSuggestion,
		closeSuggestion
	}
}
