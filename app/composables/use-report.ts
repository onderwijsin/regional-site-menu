import { Report } from '#components'

type ReportProps = {
	title?: string
	description?: string
}

/**
 * Creates a slideover controller for the report preview component.
 *
 * @param props - Optional title and description passed to the report component.
 * @returns Functions for opening and closing the report slideover.
 */
export const useReport = (props?: ReportProps) => {
	const overlay = useOverlay()
	const slideover = overlay.create(Report, {
		props
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
		closeReport
	}
}
