import type { ItemsCollectionItem } from '@nuxt/content'
import type { Audit, PillarAverage } from '~~/shared/types/audit'

import { Report, ReportConfig } from '#components'

type ReportProps = {
	title?: string
	description?: string
}

export const useReport = (props?: ReportProps) => {
	const overlay = useOverlay()

	const slideover = overlay.create(Report, {
		props,
	})

	function openReport() {
		slideover.open()
	}

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
		averages: PillarAverage<ItemsCollectionItem['pillar']>[]
		audits: Audit<ItemsCollectionItem>[]
	}
}

export const useReportConfig = () => {
	const overlay = useOverlay()

	const slideover = overlay.create(ReportConfig)

	function openReportConfig(props: ReportConfigProps) {
		slideover.open(props)
	}

	function closeReportConfig() {
		slideover.close()
	}

	return {
		openReportConfig,
		closeReportConfig,
	}
}
