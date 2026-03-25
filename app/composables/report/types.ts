import type { ItemsCollectionItem } from '@nuxt/content'
import type { Audit, PillarAverage } from '~~/shared/types/audit'

/**
 * Supported PDF font styles.
 */
export type PdfFontStyle = 'normal' | 'bold' | 'italic'

/**
 * RGB color tuple used by jsPDF.
 */
export type PdfColor = readonly [number, number, number]

/**
 * Normalized markdown block used for simplified PDF rendering.
 */
export type MarkdownBlock =
	| { type: 'paragraph'; text: string }
	| { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
	| { type: 'bullet'; text: string }
	| { type: 'ordered'; index: number; text: string }

/**
 * Semantic score color token.
 */
export type ScoreColor =
	| 'primary'
	| 'secondary'
	| 'success'
	| 'warning'
	| 'error'
	| 'info'
	| 'neutral'
	| undefined

/**
 * Data required to render a report.
 */
export type ReportData = {
	/**
	 * Average scores per pillar.
	 */
	averages: PillarAverage<ItemsCollectionItem['pillar']>[]

	/**
	 * Detailed audit entries.
	 */
	audits: Audit<ItemsCollectionItem>[]
}
