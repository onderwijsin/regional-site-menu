import type { AuditEntry, AuditProps } from '~~/shared/types/audit'

import { dequal } from 'dequal/lite'

export const useAudit = (props: AuditProps) => {
	const { getAuditScore, setAuditScore, getAuditComment, setAuditComment } = useStateStore()

	const initialState = ref<AuditEntry>(
		JSON.parse(
			JSON.stringify({
				score: getAuditScore(props.itemId),
				comment: getAuditComment(props.itemId) ?? '',
			}),
		),
	)

	const state = reactive<AuditEntry>({ ...initialState.value })
	const isDirty = computed(() => !dequal(state, initialState.value))

	// If the store state changes from elsewhere, we want to update the local state as well!
	watch(
		[
			computed(() => getAuditComment(props.itemId)),
			computed(() => getAuditScore(props.itemId)),
		],
		() => {
			revertState()
		},
	)

	function revertState() {
		initialState.value = JSON.parse(
			JSON.stringify({
				score: getAuditScore(props.itemId),
				comment: getAuditComment(props.itemId) ?? '',
			}),
		)
		Object.assign(state, initialState.value)
	}

	function saveChanges() {
		if (typeof state.score === 'number') {
			setAuditScore(props.itemId, state.score)
		}
		setAuditComment(props.itemId, state.comment)
	}

	const description = computed(() => {
		if (props.description) {
			return props.description
		}
		return `Hoe scoort jouw website op het onderdeel "${props.itemTitle}"?`
	})

	const currentScoreColor = computed(() => {
		if (state.score === undefined) {
			return 'neutral'
		}
		if (state.score >= 8) {
			return 'success'
		}
		if (state.score >= 5) {
			return 'warning'
		}
		return 'error'
	})

	const currentScoreLabel = computed(() => {
		switch (state.score) {
			case 1:
				return 'Zeer slecht (1/10)'
			case 2:
				return 'Zeer slecht (2/10)'
			case 3:
				return 'Slecht (3/10)'
			case 4:
				return 'Slecht (4/10)'
			case 5:
				return 'Matig (5/10)'
			case 6:
				return 'Voldoende (6/10)'
			case 7:
				return 'Goed (7/10)'
			case 8:
				return 'Zeer goed (8/10)'
			case 9:
				return 'Uitstekend (9/10)'
			case 10:
				return 'Perfect (10/10)'
			default:
				return 'Nog geen score'
		}
	})

	return {
		state,
		isDirty,
		description,
		currentScoreColor,
		currentScoreLabel,
		saveChanges,
		revertState,
	}
}
