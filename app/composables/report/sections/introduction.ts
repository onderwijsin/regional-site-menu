import type { ReportConfig } from '~~/schema/reportConfig'
import type { PdfRenderContext } from '../pdf'

import { renderSectionTitle, writeWrappedText } from '../pdf'
import { renderBulletList, renderSubheading, writeRichText } from './shared'

/**
 * Renders the static introduction page that explains the report structure.
 *
 * @param ctx - Shared PDF render context.
 * @param config - Report configuration containing the selected region name.
 * @returns Nothing.
 */
export function renderIntroductionPage(ctx: PdfRenderContext, config: ReportConfig): void {
	const { doc, layout, page, colors } = ctx

	doc.addPage()

	let y = layout.marginTop
	const region = config.region

	// This page is copy-heavy; the shared helpers keep the section readable by
	// separating headings, bullets, and short rich-text fragments.
	y = renderSectionTitle(ctx, 'Introductie', y)
	y += 4

	y = renderSubheading(ctx, 'Wat is dit rapport?', y)
	y = writeRichText(
		ctx,
		[
			{
				text: 'Dit rapport geeft inzicht in de kwaliteit en volledigheid van de website van ',
			},
			{ text: region, style: 'bold' },
			{ text: '.' },
		],
		y,
	)

	y = writeWrappedText(doc, {
		text: 'Het laat zien in hoeverre de site bezoekers informeert, enthousiasmeert en aanzet tot actie. De analyse is opgebouwd rondom vier pijlers:',
		x: layout.marginLeft,
		y: y + 4,
		maxWidth: page.contentWidth,
		fontSize: 11,
		fontStyle: 'normal',
		color: colors.text,
	})

	y += 4
	y = renderBulletList(
		ctx,
		[
			'Inzicht & Overzicht',
			'Verdieping & Ervaring',
			'Activatie & Deelname',
			'Ondersteuning & Contact',
		],
		y,
	)

	y += 2
	y = writeWrappedText(doc, {
		text: 'Elke pijler bestaat uit meerdere elementen: concrete onderdelen die samen een complete en effectieve regiosite vormen.',
		x: layout.marginLeft,
		y,
		maxWidth: page.contentWidth,
		fontSize: 11,
		fontStyle: 'normal',
		color: colors.text,
	})

	y = writeWrappedText(doc, {
		text: 'Per element is een score en korte toelichting opgenomen. Zo wordt snel duidelijk wat goed werkt en waar verbetering nodig is.',
		x: layout.marginLeft,
		y: y + 4,
		maxWidth: page.contentWidth,
		fontSize: 11,
		fontStyle: 'normal',
		color: colors.text,
	})

	y += 8
	y = renderSubheading(ctx, 'Hoe is dit rapport tot stand gekomen?', y)
	y = writeRichText(
		ctx,
		[
			{ text: 'Dit rapport is gebaseerd op een zelfevaluatie door ' },
			{ text: region, style: 'bold' },
			{ text: '. Per element is door de regio zelf aangegeven:' },
		],
		y,
	)

	y += 4
	y = renderBulletList(
		ctx,
		[
			'of het aanwezig is',
			'hoe goed het is uitgewerkt',
			'in welke mate het bijdraagt aan het doel van de website',
		],
		y,
	)

	y += 2
	y = writeRichText(
		ctx,
		[
			{ text: 'De scores en toelichtingen in dit rapport zijn dus een weergave van hoe ' },
			{ text: region, style: 'bold' },
			{ text: 'de eigen website op dit moment beoordeelt.' },
		],
		y,
	)

	y += 8
	y = renderSubheading(ctx, 'Hoe gebruik je dit rapport?', y)
	y = writeWrappedText(doc, {
		text: 'Gebruik dit rapport als:',
		x: layout.marginLeft,
		y,
		maxWidth: page.contentWidth,
		fontSize: 11,
		fontStyle: 'normal',
		color: colors.text,
	})

	y += 4
	y = renderBulletList(
		ctx,
		[
			'startpunt voor verbetering van de website',
			'gespreksdocument binnen de regio',
			'input voor doorontwikkeling of een briefing richting een webbureau',
		],
		y,
	)

	y += 2
	void writeWrappedText(doc, {
		text: 'De combinatie van scores en toelichtingen helpt om gericht keuzes te maken: wat moet eerst beter, en wat kan later?',
		x: layout.marginLeft,
		y,
		maxWidth: page.contentWidth,
		fontSize: 11,
		fontStyle: 'normal',
		color: colors.text,
	})
}
