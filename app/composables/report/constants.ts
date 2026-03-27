import type { PdfColor } from './types'

import { PDF_COLORS_CONFIG, PDF_LAYOUT_CONFIG } from '@constants'

/**
 * Internal A4 portrait layout in millimeters.
 */
export const PDF_LAYOUT = PDF_LAYOUT_CONFIG

/**
 * Centralized PDF color palette.
 */
export const PDF_COLORS = {
	text: PDF_COLORS_CONFIG.text,
	muted: PDF_COLORS_CONFIG.muted,
	primary: PDF_COLORS_CONFIG.primary,
	secondary: PDF_COLORS_CONFIG.secondary,
	heading: PDF_COLORS_CONFIG.heading,
	success: PDF_COLORS_CONFIG.success,
	warning: PDF_COLORS_CONFIG.warning,
	error: PDF_COLORS_CONFIG.error,
	border: PDF_COLORS_CONFIG.border,
	soft: PDF_COLORS_CONFIG.soft,
	commentBg: PDF_COLORS_CONFIG.commentBg,
	coverBg: PDF_COLORS_CONFIG.coverBg
} as const satisfies Record<string, PdfColor>
