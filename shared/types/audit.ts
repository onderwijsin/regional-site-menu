import type { BadgeProps } from '@nuxt/ui'

export type AuditEntry = {
	score: number | undefined
	comment: string
}

export type AuditProps = {
	itemId: string
	itemTitle: string
	description?: string
}

export type Audit<T> = {
	id: string
	score: number | undefined
	comment: string
	item: T
}

/**
 * Result of an average calculation
 */
export type AuditAverage = {
	score: number | undefined
	count: number | undefined
	label: string
	color: BadgeProps['color']
}

/**
 * Pillar average with UI metadata
 */
export type PillarAverage<P extends string> = AuditAverage & {
	pillar: P
	icon: string
}
