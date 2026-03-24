import type { ItemsCollectionItem } from '@nuxt/content'
import type { ViewMode } from '~~/shared/types/primitives'

import { defineStore } from 'pinia'

type AuditEntry = {
	score: number | undefined
	comment: string
}

export const useStateStore = defineStore(
	'State',
	() => {
		const mode = ref<ViewMode>('explore')
		const filter = ref<ItemsCollectionItem['goals'][number] | 'all'>('all')

		const suggestionOpen = ref(false)

		const hideWelcome = ref(false)

		const shouldShowWelcomeModal = computed(() => !hideWelcome.value)

		const audit = reactive<Record<string, AuditEntry>>({})

		function getAuditScore(itemId: string): number | undefined {
			return audit[itemId]?.score
		}

		function setAuditScore(itemId: string, score: number) {
			if (!audit[itemId]) {
				audit[itemId] = { score, comment: '' }
			} else {
				audit[itemId].score = score
			}
		}

		function getAuditComment(itemId: string): string | undefined {
			return audit[itemId]?.comment
		}

		function setAuditComment(itemId: string, comment: string) {
			if (!audit[itemId]) {
				audit[itemId] = { score: undefined, comment }
			} else {
				audit[itemId].comment = comment
			}
		}

		return {
			mode,
			filter,
			suggestionOpen,
			hideWelcome,
			shouldShowWelcomeModal,
			getAuditScore,
			setAuditScore,
			getAuditComment,
			setAuditComment,
		}
	},
	{
		persist: {
			pick: ['mode', 'filter', 'hideWelcome'],
		},
	},
)
