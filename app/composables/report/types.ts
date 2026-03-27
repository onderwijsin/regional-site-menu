import type { ItemsCollectionItem } from '@nuxt/content'
import type { ReportAiInsights } from '~~/schema/reportAi'
import type { Audit, PillarAverage } from '~~/shared/types/audit'
import type { Pillar } from '~~/shared/types/primitives'

/**
 * Supported PDF font styles.
 */
export type PdfFontStyle = 'normal' | 'bold' | 'italic'

/**
 * RGB color tuple used by jsPDF.
 */
export type PdfColor = readonly [number, number, number]

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
	averages: PillarAverage<Pillar>[]

	/**
	 * Detailed audit entries.
	 */
	audits: Audit<ItemsCollectionItem>[]

	/**
	 * Optional AI-generated content that can be injected into the report.
	 */
	aiInsights?: ReportAiInsights
}
