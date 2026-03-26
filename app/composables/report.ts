import type { ItemsCollectionItem } from '@nuxt/content'
import type { Audit, PillarAverage } from '~~/shared/types/audit'
import type { Pillar } from '~~/shared/types/primitives'

import { Report, ReportGenerationFlow } from '#components'

type ReportProps = {
	title?: string
	description?: string
}

/**
 * Creates a slideover controller for the report preview component.
 *
 * @param props - Optional title and description passed to the report component.
 * @returns Functions for opening and closing the report slideover.
 *
 * @example
 * ```ts
 * const { openReport } = useReport({
 *   title: 'Rapportage',
 * })
 *
 * openReport()
 * ```
 */
export const useReport = (props?: ReportProps) => {
	const overlay = useOverlay()

	const slideover = overlay.create(Report, {
		props,
	})

	/**
	 * Opens the report slideover.
	 *
	 * @returns Nothing.
	 */
	function openReport() {
		slideover.open()
	}

	/**
	 * Closes the report slideover.
	 *
	 * @returns Nothing.
	 */
	function closeReport() {
		slideover.close()
	}

	return {
		openReport,
		closeReport,
	}
}

type ReportConfigProps = {
	data: {
		averages: PillarAverage<Pillar>[]
		audits: Audit<ItemsCollectionItem>[]
	}
}

/**
 * Creates a slideover controller for the report generation flow.
 *
 * @returns Functions for opening and closing the report generation slideover.
 *
 * @example
 * ```ts
 * const { openReportConfig } = useReportConfig()
 *
 * openReportConfig({
 *   data: {
 *     averages,
 *     audits,
 *   },
 * })
 * ```
 */
export const useReportConfig = () => {
	const overlay = useOverlay()

	const slideover = overlay.create(ReportGenerationFlow)

	/**
	 * Opens the report generation slideover with the current report data.
	 *
	 * @param props - Data required by the generation flow and downstream PDF generator.
	 * @returns Nothing.
	 */
	function openReportConfig(props: ReportConfigProps) {
		slideover.open(props)
	}

	/**
	 * Closes the report generation slideover.
	 *
	 * @returns Nothing.
	 */
	function closeReportConfig() {
		slideover.close()
	}

	return {
		openReportConfig,
		closeReportConfig,
	}
}
