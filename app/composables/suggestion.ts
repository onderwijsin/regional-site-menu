import { Suggestion } from '#components'

type SuggestionProps = {
	title?: string
	description?: string
}

export const useSuggestion = (props?: SuggestionProps) => {
	const overlay = useOverlay()

	const slideover = overlay.create(Suggestion, {
		props,
	})

	function openSuggestion() {
		slideover.open()
	}

	function closeSuggestion() {
		slideover.close()
	}

	return {
		openSuggestion,
		closeSuggestion,
	}
}
