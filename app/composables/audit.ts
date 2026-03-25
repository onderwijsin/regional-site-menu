/**
 * Audit utilities & composables
 *
 * Responsibilities:
 * - Map scores → labels + colors
 * - Provide reactive audit bindings per item
 */

import type { BadgeProps } from '@nuxt/ui'
import type { AuditProps } from '~~/shared/types/audit'

// ----------------------
// Constants
// ----------------------

/**
 * Score → label mapping
 *
 * NOTE:
 * Explicit mapping is used instead of ranges to allow
 * fine-grained control over wording.
 */
const SCORE_LABELS: Record<number, string> = {
	1: 'Zeer slecht (1/10)',
	2: 'Zeer slecht (2/10)',
	3: 'Slecht (3/10)',
	4: 'Slecht (4/10)',
	5: 'Matig (5/10)',
	6: 'Voldoende (6/10)',
	7: 'Goed (7/10)',
	8: 'Zeer goed (8/10)',
	9: 'Uitstekend (9/10)',
	10: 'Perfect (10/10)',
} as const

// ----------------------
// Utils
// ----------------------

export const useAuditUtils = () => {
	/**
	 * Map score → UI color
	 *
	 * @param score - Numeric score (1–10)
	 * @returns semantic color token
	 */
	function getScoreColor(score: number | undefined): BadgeProps['color'] {
		if (score === undefined) return 'secondary'
		if (score >= 8) return 'success'
		if (score >= 5) return 'warning'
		return 'error'
	}

	/**
	 * Map score → human-readable label
	 *
	 * @param score - Numeric score (1–10)
	 * @returns descriptive label
	 */
	function getScoreLabel(score: number | undefined): string {
		if (score === undefined) return 'Nog geen score'
		return SCORE_LABELS[score] ?? 'Nog geen score'
	}

	return {
		getScoreColor,
		getScoreLabel,
	}
}

// ----------------------
// Composable
// ----------------------

/**
 * Audit composable for a single item
 *
 * Provides:
 * - reactive score + comment bindings
 * - derived UI helpers (color + label)
 * - contextual description
 *
 * @param props - AuditProps (item context)
 */
export const useAudit = (props: AuditProps) => {
	const { getScoreColor, getScoreLabel } = useAuditUtils()

	const { getAuditScore, setAuditScore, getAuditComment, setAuditComment } = useStateStore()

	// ----------------------
	// Reactive bindings
	// ----------------------

	/**
	 * Two-way bound score for this item
	 */
	const score = computed({
		get: () => getAuditScore(props.itemId),
		set: (value: number) => setAuditScore(props.itemId, value),
	})

	/**
	 * Two-way bound comment for this item
	 */
	const comment = computed({
		get: () => getAuditComment(props.itemId),
		set: (value: string) => setAuditComment(props.itemId, value),
	})

	// ----------------------
	// Derived UI state
	// ----------------------

	/**
	 * Description shown in audit UI
	 */
	const description = computed(() => {
		if (props.description) return props.description

		return `Hoe scoort jouw website op het onderdeel "${props.itemTitle}"?`
	})

	/**
	 * Color representation of current score
	 */
	const currentScoreColor = computed(() => getScoreColor(score.value))

	/**
	 * Label representation of current score
	 */
	const currentScoreLabel = computed(() => getScoreLabel(score.value))

	return {
		description,
		currentScoreColor,
		currentScoreLabel,
		score,
		comment,
	}
}
