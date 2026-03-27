import type { ReportConfig } from '~~/schema/reportConfig'
import type { PdfDocumentMetadata } from './report/pdf'
import type { ReportData } from './report/types'

import { ReportGenerationError } from './report/errors'
import {
	createDefaultFilename,
	createRenderContext,
	savePdf,
	setPdfDocumentMetadata
} from './report/pdf'
import { renderReportDocument } from './report/sections'

/**
 * Main composable for generating an audit PDF report in the browser.
 *
 * @returns Report generator API.
 */
export const useReportGenerator = () => {
	const site = useSiteConfig()
	const runtimeConfig = useRuntimeConfig()

	/**
	 * Builds stable PDF metadata using report context + canonical site identity.
	 *
	 * @param config - Report configuration.
	 * @param data - Report data used in this export.
	 * @returns Metadata for jsPDF document properties.
	 */
	function createPdfMetadata(config: ReportConfig, data: ReportData): PdfDocumentMetadata {
		const siteName = site.name || 'Regiosite Menukaart'
		const siteUrl = runtimeConfig.public.siteUrl || ''
		const hasAi = config.aiBriefing || config.aiWebsiteAnalysis

		const keywords = [
			'onderwijsregio',
			'regiosite',
			'menukaart',
			'audit',
			'rapportage',
			'pdf',
			hasAi ? 'ai' : '',
			config.aiBriefing ? 'ai-briefing' : '',
			config.aiWebsiteAnalysis ? 'ai-website-analysis' : ''
		]

		const subjectParts = [
			`Website-audit voor ${config.region}`,
			`${data.audits.length} beoordeelde onderdelen`,
			hasAi ? 'met AI-inzichten' : 'zonder AI-inzichten'
		]

		return {
			title: `Rapportage ${config.region} | ${siteName}`,
			subject: subjectParts.join(' · '),
			author: config.region,
			creator: siteUrl ? `${siteName} (${siteUrl})` : siteName,
			keywords,
			language: 'nl'
		}
	}

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
			// Create all runtime state up front so rendering helpers can stay pure-ish
			// and operate only on the shared context plus report inputs.
			const filename = createDefaultFilename(config.region)
			const ctx = await createRenderContext()
			const metadata = createPdfMetadata(config, data)
			setPdfDocumentMetadata(ctx.doc, metadata)

			// Rendering mutates the jsPDF instance page by page. Saving is kept as a
			// separate final step so orchestration stays obvious.
			await renderReportDocument(ctx, config, data)
			savePdf(ctx.doc, filename)
		} catch (error: unknown) {
			console.error('Failed to generate report PDF', error)
			throw new ReportGenerationError('REPORT_GENERATION_FAILED', error)
		}
	}

	return {
		generateReport
	}
}
