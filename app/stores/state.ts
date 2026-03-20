import type { ViewFilter, ViewMode } from '~~/shared/types/primitives'

import { defineStore } from 'pinia'

export const useStateStore = defineStore(
	'State',
	() => {
		const mode = ref<ViewMode>('explore')

		const filter = ref<ViewFilter>('all')

		return {
			mode,
			filter,
		}
	},
	{
		persist: {
			pick: ['mode', 'filter'],
		},
	},
)
