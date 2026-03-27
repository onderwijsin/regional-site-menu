import type { PdfRenderContext } from '../pdf'

import { parseURL } from 'ufo'

import { loadImageAsBase64 } from '../image'
import { setPdfFillColor, setPdfTextColor } from '../pdf'

/**
 * Renders the report cover page, including the background, logo, title, and footer link.
 *
 * @param ctx - Shared PDF render context.
 * @param title - Main report title shown on the cover.
 * @returns Nothing.
 * @throws {Error} Propagates runtime config failures; logo loading failures are swallowed intentionally.
 *
 * @example
 * ```ts
 * await renderCoverPage(ctx, 'Friesland')
 * ```
 */
export async function renderCoverPage(ctx: PdfRenderContext, title: string): Promise<void> {
	const { doc, page, layout } = ctx

	// The cover is a dedicated page with its own full-page background treatment.
	setPdfFillColor(doc, ctx.colors.coverBg)
	doc.rect(0, 0, page.width, page.height, 'F')

	try {
		const logo = await loadImageAsBase64('/images/logo_with_text.png')
		doc.addImage(logo, 'PNG', layout.marginLeft, layout.marginTop, 60, 0)
	} catch {
		// The logo is decorative; rendering should continue when it cannot be loaded.
	}

	// The title block sits lower on the page to create a clear visual break
	// between branding and the actual report title.
	const startY = page.height * 0.45

	doc.setFont('RijksoverheidHeading', 'bold')
	doc.setFontSize(16)
	setPdfTextColor(doc, ctx.colors.primary)
	doc.text('Rapportage', layout.marginLeft, startY)

	doc.setFont('RijksoverheidHeading', 'bold')
	doc.setFontSize(28)
	setPdfTextColor(doc, ctx.colors.heading)
	doc.text(title, layout.marginLeft, startY + 14)

	doc.setFont('Rijksoverheid', 'normal')
	doc.setFontSize(12)
	setPdfTextColor(doc, ctx.colors.muted)
	doc.text(
		`Gegenereerd op ${new Date().toLocaleDateString('nl-NL')}`,
		layout.marginLeft,
		startY + 28,
	)

	const config = useRuntimeConfig()
	const host = parseURL(config.public.siteUrl).host ?? config.public.siteUrl
	const footerY = page.height - layout.marginBottom

	doc.setFont('Rijksoverheid', 'italic')
	doc.setFontSize(10)
	setPdfTextColor(doc, ctx.colors.muted)
	doc.textWithLink(host, layout.marginLeft, footerY, { url: config.public.siteUrl })
}
