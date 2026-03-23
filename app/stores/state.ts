import type { ViewFilter, ViewMode } from '~~/shared/types/primitives'

import { defineStore } from 'pinia'

export const useStateStore = defineStore(
	'State',
	() => {
		const mode = ref<ViewMode>('explore')

		const filter = ref<ViewFilter>('all')

		const suggestionOpen = ref(false)

		return {
			mode,
			filter,
			suggestionOpen,
		}
	},
	{
		persist: {
			pick: ['mode', 'filter'],
		},
	},
)
