import type { ItemsCollectionItem } from '@nuxt/content'
import type { ViewMode } from '~~/shared/types/primitives'

import { defineStore } from 'pinia'

export const useStateStore = defineStore(
	'State',
	() => {
		const mode = ref<ViewMode>('explore')
		const filter = ref<ItemsCollectionItem['goals'][number] | 'all'>('all')

		const suggestionOpen = ref(false)

		const hideWelcome = ref(false)

		function hideWelcomeForNextVisit() {
			hideWelcome.value = true
		}

		const shouldShowWelcomeModal = computed(() => !hideWelcome.value)

		return {
			mode,
			filter,
			suggestionOpen,
			hideWelcomeForNextVisit,
			shouldShowWelcomeModal,
		}
	},
	{
		persist: {
			pick: ['mode', 'filter', 'hideWelcome'],
		},
	},
)
