import type { PdfColor } from './types'

/**
 * Internal A4 portrait layout in millimeters.
 */
export const PDF_LAYOUT = {
	pageWidth: 210,
	pageHeight: 297,
	marginTop: 18,
	marginRight: 16,
	marginBottom: 18,
	marginLeft: 16,
	lineHeight: 5.2,
	sectionGap: 8,
	blockGap: 4,
	cardPadding: 5,
	cardGap: 4,
	borderRadius: 2,
}

/**
 * Centralized PDF color palette.
 */
export const PDF_COLORS = {
	text: [17, 17, 17],
	muted: [107, 114, 128],
	primary: [169, 0, 97],
	secondary: [0, 123, 199],
	heading: [44, 36, 97],
	success: [22, 163, 74],
	warning: [245, 158, 11],
	error: [220, 38, 38],
	border: [229, 231, 235],
	soft: [249, 250, 251],
	commentBg: [248, 250, 252],
	coverBg: [240, 247, 253],
} as const satisfies Record<string, PdfColor>
