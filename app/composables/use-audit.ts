import type { AuditProps } from '~~/shared/types/audit'

/**
 * Audit composable for one item.
 *
 * Provides:
 * - reactive score + comment bindings
 * - derived UI helpers (color + label)
 * - contextual description
 *
 * @param props - Audit item context.
 * @returns Reactive audit state and derived display fields.
 */
export const useAudit = (props: AuditProps) => {
	const { getScoreColor, getScoreLabel } = useAuditUtils()
	const { trackAuditScore } = useTracking()
	const { getAuditScore, setAuditScore, getAuditComment, setAuditComment } = useStateStore()

	/**
	 * Two-way bound score for this item.
	 */
	const score = computed({
		get: () => getAuditScore(props.itemId),
		set: (value: number) => {
			const previousScore = getAuditScore(props.itemId)
			setAuditScore(props.itemId, value)

			if (previousScore === value) {
				return
			}

			trackAuditScore({
				itemId: props.itemId,
				score: value
			})
		}
	})

	/**
	 * Two-way bound comment for this item.
	 */
	const comment = computed({
		get: () => getAuditComment(props.itemId),
		set: (value: string) => setAuditComment(props.itemId, value)
	})

	/**
	 * Description shown in the audit UI.
	 */
	const description = computed(() => {
		if (props.description) return props.description

		return `Hoe scoort jouw website op het onderdeel "${props.itemTitle}"?`
	})

	/**
	 * Color representation of current score.
	 */
	const currentScoreColor = computed(() => getScoreColor(score.value))

	/**
	 * Label representation of current score.
	 */
	const currentScoreLabel = computed(() => getScoreLabel(score.value))

	return {
		description,
		currentScoreColor,
		currentScoreLabel,
		score,
		comment
	}
}
