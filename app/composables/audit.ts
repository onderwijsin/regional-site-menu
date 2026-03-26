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

import { getPillarIconName, PILLARS } from '~/composables/content-taxonomy'

// ----------------------
// Constants
// ----------------------

/**
 * Explicit mapping for score → label
 *
 * Using a fixed map instead of ranges allows precise wording control.
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
		return SCORE_LABELS[score] ?? 'Nog geen score'
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
		pillar: ItemsCollectionItem['pillar'],
	): { score: number; count: number } | undefined => {
		const scores = data
			.filter((item) => item.pillar === pillar)
			.map((item) => audit[item.id]?.score)
			.filter((score): score is number => score !== undefined)

		if (scores.length === 0) return undefined

		const total = scores.reduce((acc, score) => acc + score, 0)

		return {
			score: Math.round(total / scores.length),
			count: scores.length,
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
		pillar: ItemsCollectionItem['pillar'],
	): AuditAverage => {
		const result = calculateAverageForPillar(data, audit, pillar)

		return {
			score: result?.score,
			count: result?.count,
			label: getScoreLabel(result?.score),
			color: getScoreColor(result?.score),
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
		audit: Record<string, AuditEntry>,
	): PillarAverage<ItemsCollectionItem['pillar']>[] => {
		return PILLARS.map((pillar) => ({
			pillar,
			icon: getIcon(getPillarIconName(pillar)),
			...assembleAverage(data, audit, pillar),
		}))
	}

	return {
		getScoreColor,
		getScoreLabel,
		calculateAverageForPillar,
		assembleAverage,
		getAverages,
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
