import type { AuditProps } from '~~/shared/types/audit'

export const useAuditUtils = () => {
	function getScoreColor(score: number | undefined) {
		if (score === undefined) {
			return 'secondary'
		}
		if (score >= 8) {
			return 'success'
		}
		if (score >= 5) {
			return 'warning'
		}
		return 'error'
	}

	function getScoreLabel(score: number | undefined) {
		switch (score) {
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
	}

	return {
		getScoreColor,
		getScoreLabel,
	}
}

export const useAudit = (props: AuditProps) => {
	const { getScoreColor, getScoreLabel } = useAuditUtils()
	const { getAuditScore, setAuditScore, getAuditComment, setAuditComment } = useStateStore()

	const score = computed({
		get: () => getAuditScore(props.itemId),
		set: (value: number) => setAuditScore(props.itemId, value),
	})

	const comment = computed({
		get: () => getAuditComment(props.itemId),
		set: (value: string) => setAuditComment(props.itemId, value),
	})

	const description = computed(() => {
		if (props.description) {
			return props.description
		}
		return `Hoe scoort jouw website op het onderdeel "${props.itemTitle}"?`
	})

	// const currentScoreColor = computed(() => getScoreColor(state.score))
	// const currentScoreLabel = computed(() => getScoreLabel(state.score))

	const currentScoreColor = computed(() => getScoreColor(score.value))
	const currentScoreLabel = computed(() => getScoreLabel(score.value))

	return {
		description,
		currentScoreColor,
		currentScoreLabel,
		score,
		comment,
	}
}
