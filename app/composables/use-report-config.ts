import type { ItemsCollectionItem } from '@nuxt/content'
import type { Audit, PillarAverage } from '~~/shared/types/audit'
import type { Pillar } from '~~/shared/types/primitives'

import { ReportGenerationFlow } from '#components'

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
 */
export const useReportConfig = () => {
	const overlay = useOverlay()
	const slideover = overlay.create(ReportGenerationFlow)

	/**
	 * Opens the report generation slideover with current report data.
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
		closeReportConfig
	}
}
