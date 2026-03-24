import type { ItemsCollectionItem } from '@nuxt/content'
import type { AuditEntry } from '~~/shared/types/audit'
import type { ViewMode } from '~~/shared/types/primitives'

import { defineStore } from 'pinia'

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

		function removeAudit(itemId: string) {
			// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
			delete audit[itemId]
		}

		function clearAllAudits() {
			for (const key in audit) {
				// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
				delete audit[key]
			}
		}

		return {
			mode,
			filter,
			suggestionOpen,
			hideWelcome,
			shouldShowWelcomeModal,
			audit,
			getAuditScore,
			setAuditScore,
			getAuditComment,
			setAuditComment,
			removeAudit,
			clearAllAudits,
		}
	},
	{
		persist: {
			pick: ['mode', 'filter', 'hideWelcome', 'audit'],
		},
	},
)
