import type { ReportConfig } from '~~/schema/reportConfig'
import type { ReportData } from './report/types'

import { ReportGenerationError } from './report/errors'
import { createDefaultFilename, createRenderContext, savePdf } from './report/pdf'
import { renderReportDocument } from './report/sections'

/**
 * Main composable for generating an audit PDF report in the browser.
 *
 * @returns Report generator API.
 */
export const useReportGenerator = () => {
	/**
	 * Generates and downloads a PDF report.
	 *
	 * @param config - Report configuration.
	 * @param data - Report data.
	 * @returns Nothing.
	 * @throws {ReportGenerationError} When generation fails.
	 *
	 * @example
	 * ```ts
	 * const { generateReport } = useReportGenerator()
	 *
	 * generateReport(
	 *   {
	 *     region: 'Friesland',
	 *     aiBriefing: false,
	 *     aiWebsiteAnalysis: false,
	 *     notes: '',
	 *   },
	 *   {
	 *     averages,
	 *     audits,
	 *   },
	 * )
	 * ```
	 */
	async function generateReport(config: ReportConfig, data: ReportData): Promise<void> {
		try {
			const filename = createDefaultFilename(config.region)
			const ctx = await createRenderContext()

			await renderReportDocument(ctx, config, data)
			savePdf(ctx.doc, filename)
		} catch (error: unknown) {
			console.error('Failed to generate report PDF', error)
			throw new ReportGenerationError('REPORT_GENERATION_FAILED', error)
		}
	}

	return {
		generateReport,
	}
}
