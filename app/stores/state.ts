/**
 * Global UI + audit state store
 *
 * Responsibilities:
 * - UI state (mode, filters, modals)
 * - Audit state (scores + comments per item)
 * - Persistence of user preferences
 */

import type { AuditEntry } from '~~/shared/types/audit'
import type { Goal, ViewMode } from '~~/shared/types/primitives'

import { defineStore } from 'pinia'

/**
 * Internal audit map
 * Key = itemId
 */
type AuditMap = Record<string, AuditEntry>

export const useStateStore = defineStore(
	'State',
	() => {
		// ----------------------
		// UI state
		// ----------------------

		/** Current application mode */
		const mode = ref<ViewMode>('explore')
		const { trackModeSwitch } = useTracking()

		/** Active goal filter */
		const filter = ref<Goal | 'all'>('all')

		/** Controls suggestion modal visibility */
		const suggestionOpen = ref(false)

		/** Whether the welcome modal has been dismissed */
		const hideWelcome = ref(false)

		/**
		 * Derived: whether to show welcome modal
		 */
		const shouldShowWelcomeModal = computed(() => !hideWelcome.value)

		// ----------------------
		// Audit state
		// ----------------------

		/**
		 * Stores audit entries per item
		 */
		const audit = reactive<AuditMap>({})

		/**
		 * Stores the name of the region the user belongs to
		 */
		const region = ref('')

		/**
		 * Stores general notes provided by the user, that should be included in the report
		 */
		const notes = ref('')

		/**
		 * Stores the website url provided by the user
		 */
		const url = ref<string | undefined>(undefined)

		/**
		 * Ensure an audit entry exists for a given item
		 *
		 * @param itemId - Unique item identifier
		 * @returns AuditEntry (existing or newly created)
		 */
		function ensureAudit(itemId: string): AuditEntry {
			if (!audit[itemId]) {
				// lazy init → avoids useless empty entries
				audit[itemId] = { score: undefined, comment: '' }
			}
			return audit[itemId]
		}

		/**
		 * Get audit score for item
		 *
		 * @param itemId - Unique item identifier
		 * @returns score or undefined
		 */
		function getAuditScore(itemId: string): number | undefined {
			return audit[itemId]?.score
		}

		/**
		 * Set audit score for item
		 *
		 * @param itemId - Unique item identifier
		 * @param score - Score value
		 */
		function setAuditScore(itemId: string, score: number): void {
			const entry = ensureAudit(itemId)
			entry.score = score
		}

		/**
		 * Get audit comment for item
		 *
		 * @param itemId - Unique item identifier
		 * @returns comment or undefined
		 */
		function getAuditComment(itemId: string): string | undefined {
			return audit[itemId]?.comment
		}

		/**
		 * Set audit comment for item
		 *
		 * @param itemId - Unique item identifier
		 * @param comment - Freeform comment
		 */
		function setAuditComment(itemId: string, comment: string): void {
			const entry = ensureAudit(itemId)
			entry.comment = comment
		}

		/**
		 * Switches between explore and edit mode.
		 *
		 * @param nextMode - Target mode.
		 * @param source - UI source that triggered the switch.
		 */
		function setMode(
			nextMode: ViewMode,
			source: 'header_tabs' | 'welcome_modal' = 'header_tabs'
		): void {
			const previousMode = mode.value

			if (previousMode === nextMode) {
				return
			}

			mode.value = nextMode
			trackModeSwitch({
				from: previousMode,
				to: nextMode,
				source
			})
		}

		/**
		 * Remove audit entry for a specific item
		 *
		 * NOTE:
		 * Using `delete` is intentional here to preserve reactivity
		 * and ensure Pinia persistence removes the key entirely.
		 *
		 * @param itemId - Unique item identifier
		 */
		function removeAudit(itemId: string): void {
			// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
			delete audit[itemId]
		}

		/**
		 * Clear all audit entries
		 *
		 * NOTE:
		 * We explicitly delete keys instead of reassigning the object
		 * to keep Vue reactivity intact.
		 */
		function clearAllAudits(): void {
			for (const key in audit) {
				// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
				delete audit[key]
			}
		}

		return {
			// UI
			mode,
			setMode,
			filter,
			suggestionOpen,
			hideWelcome,
			shouldShowWelcomeModal,

			// Audit
			audit,
			region,
			notes,
			url,
			getAuditScore,
			setAuditScore,
			getAuditComment,
			setAuditComment,
			removeAudit,
			clearAllAudits
		}
	},
	{
		/**
		 * Persist selected state across sessions
		 */
		persist: {
			pick: ['mode', 'filter', 'hideWelcome', 'audit', 'region', 'notes', 'url']
		}
	}
)
