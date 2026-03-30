import type { ItemsCollectionItem } from '@nuxt/content'
import type { BadgeProps } from '@nuxt/ui'
import type { AuditAverage, AuditEntry, PillarAverage } from '~~/shared/types/audit'
import type { Pillar } from '~~/shared/types/primitives'

import { AUDIT_SCORE_LABELS } from '@constants'
import { getPillarIconName, PILLARS } from '~/composables/content-taxonomy'

/**
 * Creates reusable audit helper functions for score labels and aggregate calculations.
 *
 * @returns Utility functions for score labels, colors, and pillar averages.
 */
export const useAuditUtils = () => {
	const { getIcon } = useIcons()

	/**
	 * Maps score values to UI color tokens.
	 *
	 * @param score - Numeric score (1-10).
	 * @returns Semantic color used by UI components.
	 */
	const getScoreColor = (score: number | undefined): BadgeProps['color'] => {
		if (score === undefined) return 'secondary'
		if (score >= 8) return 'success'
		if (score >= 5) return 'warning'
		return 'error'
	}

	/**
	 * Maps score values to localized labels.
	 *
	 * @param score - Numeric score (1-10).
	 * @returns Localized score label.
	 */
	const getScoreLabel = (score: number | undefined): string => {
		if (score === undefined) return 'Nog geen score'
		return AUDIT_SCORE_LABELS[score as keyof typeof AUDIT_SCORE_LABELS] ?? 'Nog geen score'
	}

	/**
	 * Calculates average score + count for one pillar.
	 *
	 * @param data - All content items.
	 * @param audit - Audit state indexed by item id.
	 * @param pillar - Target pillar.
	 * @returns Average score + count or undefined when no valid scores exist.
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
	 * Creates a UI-ready average object for one pillar.
	 *
	 * @param data - All content items.
	 * @param audit - Audit state.
	 * @param pillar - Target pillar.
	 * @returns Enriched average object.
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
	 * Computes averages for all pillars.
	 *
	 * @param data - All content items.
	 * @param audit - Audit state.
	 * @returns List of pillar averages with UI metadata.
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
