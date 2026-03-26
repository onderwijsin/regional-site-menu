import type { ReportConfig } from '~~/schema/reportConfig'
import type { PdfRenderContext } from '../pdf'
import type { ReportData } from '../types'

import { renderAuditSection } from './audit'
import { renderAveragesSection } from './averages'
import { renderCoverPage } from './cover'
import { renderIntroductionPage } from './introduction'
import { renderNotesSection } from './notes'

/**
 * Renders the full PDF document in the canonical page order.
 *
 * @param ctx - Shared PDF render context.
 * @param config - Report configuration collected from the user.
 * @param data - Audit data rendered into the report.
 * @returns Nothing.
 * @throws {Error} Propagates section rendering failures to the caller.
 *
 * @example
 * ```ts
 * await renderReportDocument(ctx, config, {
 *   averages,
 *   audits,
 * })
 * ```
 */
export async function renderReportDocument(
	ctx: PdfRenderContext,
	config: ReportConfig,
	data: ReportData,
): Promise<void> {
	// Keep orchestration explicit and linear. Every section mutates the shared
	// jsPDF instance, so execution order defines page order.
	await renderCoverPage(ctx, config.region)
	renderIntroductionPage(ctx, config)
	renderNotesSection(ctx, config)
	renderAveragesSection(ctx, data, config)
	renderAuditSection(ctx, data.audits, config)
}
