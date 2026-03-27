/**
 * Audit utilities & composables
 *
 * Responsibilities:
 * - Map scores → labels + colors
 * - Compute averages per pillar
 * - Provide reactive audit bindings per item
 */

import type { ItemsCollectionItem } from '@nuxt/content'
import type { BadgeProps } from '@nuxt/ui'
import type { AuditAverage, AuditEntry, AuditProps, PillarAverage } from '~~/shared/types/audit'
import type { Pillar } from '~~/shared/types/primitives'

import { AUDIT_SCORE_LABELS } from '@constants'
import { getPillarIconName, PILLARS } from '~/composables/content-taxonomy'

// ----------------------
// Constants
// ----------------------

/**
 * Explicit mapping for score → label
 *
 * Using a fixed map instead of ranges allows precise wording control.
 */
// ----------------------
// Utils
// ----------------------

export const useAuditUtils = () => {
	const { getIcon } = useIcons()

	/**
	 * Map score → UI color token
	 *
	 * @param score - Numeric score (1–10)
	 * @returns Semantic color used by UI components
	 */
	const getScoreColor = (score: number | undefined): BadgeProps['color'] => {
		if (score === undefined) return 'secondary'
		if (score >= 8) return 'success'
		if (score >= 5) return 'warning'
		return 'error'
	}

	/**
	 * Map score → human-readable label
	 *
	 * @param score - Numeric score (1–10)
	 * @returns Localized label
	 */
	const getScoreLabel = (score: number | undefined): string => {
		if (score === undefined) return 'Nog geen score'
		return AUDIT_SCORE_LABELS[score as keyof typeof AUDIT_SCORE_LABELS] ?? 'Nog geen score'
	}

	/**
	 * Calculate average score for a given pillar
	 *
	 * @param data - All content items
	 * @param audit - Audit state indexed by item id
	 * @param pillar - Target pillar
	 * @returns Average score + count or undefined when no valid scores exist
	 */
	const calculateAverageForPillar = (
		data: ItemsCollectionItem[],
		audit: Record<string, AuditEntry>,
		pillar: Pillar
	): { score: number; count: number } | undefined => {
		const scores = data
			.filter((item) => item.pillar === pillar)
			.map((item) => audit[item.id]?.score)
			.filter((score): score is number => score !== undefined)

		if (scores.length === 0) return undefined

		const total = scores.reduce((acc, score) => acc + score, 0)

		return {
			score: Math.round(total / scores.length),
			count: scores.length
		}
	}

	/**
	 * Create a UI-ready average object for a pillar
	 *
	 * @param data - All content items
	 * @param audit - Audit state
	 * @param pillar - Target pillar
	 * @returns Fully enriched average object
	 */
	const assembleAverage = (
		data: ItemsCollectionItem[],
		audit: Record<string, AuditEntry>,
		pillar: Pillar
	): AuditAverage => {
		const result = calculateAverageForPillar(data, audit, pillar)

		return {
			score: result?.score,
			count: result?.count,
			label: getScoreLabel(result?.score),
			color: getScoreColor(result?.score)
		}
	}

	/**
	 * Compute averages for all pillars
	 *
	 * @param data - All content items
	 * @param audit - Audit state
	 * @returns List of pillar averages with UI metadata
	 */
	const getAverages = (
		data: ItemsCollectionItem[],
		audit: Record<string, AuditEntry>
	): PillarAverage<Pillar>[] => {
		return PILLARS.map((pillar) => ({
			pillar,
			icon: getIcon(getPillarIconName(pillar)),
			...assembleAverage(data, audit, pillar)
		}))
	}

	return {
		getScoreColor,
		getScoreLabel,
		calculateAverageForPillar,
		assembleAverage,
		getAverages
	}
}

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
	const { trackAuditScore } = useTracking()

	const { getAuditScore, setAuditScore, getAuditComment, setAuditComment } = useStateStore()

	// ----------------------
	// Reactive bindings
	// ----------------------

	/**
	 * Two-way bound score for this item
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
	 * Two-way bound comment for this item
	 */
	const comment = computed({
		get: () => getAuditComment(props.itemId),
		set: (value: string) => setAuditComment(props.itemId, value)
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
		comment
	}
}
