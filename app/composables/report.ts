import { Report } from '#components'

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
