import type { jsPDF } from 'jspdf'

import { PDF_COLORS, PDF_LAYOUT } from '~/composables/report/constants'
import {
	createDefaultFilename,
	drawSectionDivider,
	ensurePageSpace,
	mapScoreColor,
	measureWrappedTextHeight,
	renderSectionTitle,
	sanitizeFilename,
	savePdf,
	setPdfDocumentMetadata,
	setPdfDrawColor,
	setPdfFillColor,
	setPdfTextColor,
	writeWrappedText
} from '~/composables/report/pdf'
import { beforeEach, describe, expect, it, vi } from 'vitest'

function createDocStub() {
	return {
		setDocumentProperties: vi.fn(),
		setCreationDate: vi.fn(),
		setLanguage: vi.fn(),
		setTextColor: vi.fn(),
		setDrawColor: vi.fn(),
		setFillColor: vi.fn(),
		setLineWidth: vi.fn(),
		setFont: vi.fn(),
		setFontSize: vi.fn(),
		splitTextToSize: vi.fn((text: string) => [text]),
		text: vi.fn(),
		addPage: vi.fn(),
		line: vi.fn(),
		save: vi.fn(),
		internal: {
			pageSize: {
				getHeight: () => 50
			}
		}
	} as unknown as jsPDF & {
		setDocumentProperties: ReturnType<typeof vi.fn>
		setCreationDate: ReturnType<typeof vi.fn>
		setLanguage: ReturnType<typeof vi.fn>
		setTextColor: ReturnType<typeof vi.fn>
		setDrawColor: ReturnType<typeof vi.fn>
		setFillColor: ReturnType<typeof vi.fn>
		setLineWidth: ReturnType<typeof vi.fn>
		setFont: ReturnType<typeof vi.fn>
		setFontSize: ReturnType<typeof vi.fn>
		splitTextToSize: ReturnType<typeof vi.fn>
		text: ReturnType<typeof vi.fn>
		addPage: ReturnType<typeof vi.fn>
		line: ReturnType<typeof vi.fn>
		save: ReturnType<typeof vi.fn>
	}
}

describe('report/pdf helpers', () => {
	beforeEach(() => {
		vi.useRealTimers()
	})

	it('sanitizes filenames and builds deterministic defaults', () => {
		vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

		expect(sanitizeFilename('  Regio Utrecht! 2026  ')).toBe('regio_utrecht_2026')
		expect(createDefaultFilename('Regio Utrecht')).toBe(
			'rapport_regio_utrecht_1700000000000.pdf'
		)
	})

	it('maps semantic score colors to PDF palette tokens', () => {
		expect(mapScoreColor('success')).toEqual(PDF_COLORS.success)
		expect(mapScoreColor('warning')).toEqual(PDF_COLORS.warning)
		expect(mapScoreColor('error')).toEqual(PDF_COLORS.error)
		expect(mapScoreColor('info')).toEqual(PDF_COLORS.secondary)
		expect(mapScoreColor('primary')).toEqual(PDF_COLORS.primary)
		expect(mapScoreColor('secondary')).toEqual(PDF_COLORS.muted)
		expect(mapScoreColor(undefined)).toEqual(PDF_COLORS.text)
	})

	it('applies metadata and strips empty keywords', () => {
		const doc = createDocStub()

		setPdfDocumentMetadata(doc, {
			title: ' Rapport ',
			subject: ' Onderwerp ',
			author: ' Auteur ',
			creator: ' Tool ',
			keywords: [' ai ', '', 'rapport'],
			language: 'nl'
		})

		expect(doc.setDocumentProperties).toHaveBeenCalledWith({
			title: 'Rapport',
			subject: 'Onderwerp',
			author: 'Auteur',
			creator: 'Tool',
			keywords: 'ai, rapport'
		})
		expect(doc.setCreationDate).toHaveBeenCalledTimes(1)
		expect(doc.setLanguage).toHaveBeenCalledWith('nl')
	})

	it('sets draw/fill/text colors using RGB tuples', () => {
		const doc = createDocStub()

		setPdfTextColor(doc, [1, 2, 3])
		setPdfDrawColor(doc, [4, 5, 6])
		setPdfFillColor(doc, [7, 8, 9])

		expect(doc.setTextColor).toHaveBeenCalledWith(1, 2, 3)
		expect(doc.setDrawColor).toHaveBeenCalledWith(4, 5, 6)
		expect(doc.setFillColor).toHaveBeenCalledWith(7, 8, 9)
	})

	it('adds pages only when required space does not fit', () => {
		const doc = createDocStub()
		const ctx = {
			doc,
			page: {
				height: 100,
				width: 210,
				contentWidth: 180
			},
			layout: PDF_LAYOUT,
			colors: PDF_COLORS
		}

		const samePageY = ensurePageSpace(ctx, 20, 10)
		expect(samePageY).toBe(20)
		expect(doc.addPage).not.toHaveBeenCalled()

		const nextPageY = ensurePageSpace(ctx, 90, 20)
		expect(nextPageY).toBe(PDF_LAYOUT.marginTop)
		expect(doc.addPage).toHaveBeenCalledTimes(1)
	})

	it('measures wrapped text by line count', () => {
		const doc = createDocStub()
		doc.splitTextToSize = vi.fn(() => ['a', 'b', 'c'])

		expect(measureWrappedTextHeight(doc, 'abc', 100, 4)).toBe(12)
	})

	it('writes wrapped text across page boundaries', () => {
		const doc = createDocStub()
		doc.splitTextToSize = vi.fn(() => ['regel 1', 'regel 2', 'regel 3'])

		const nextY = writeWrappedText(doc, {
			text: 'lange tekst',
			x: 10,
			y: 42,
			maxWidth: 100,
			fontSize: 11,
			fontStyle: 'normal',
			color: [0, 0, 0],
			lineHeight: 6
		})

		expect(doc.addPage).toHaveBeenCalledTimes(2)
		expect(doc.text).toHaveBeenCalledTimes(3)
		expect(nextY).toBe(PDF_LAYOUT.marginTop + 6)
	})

	it('renders section title + divider and returns next cursor', () => {
		const doc = createDocStub()
		const ctx = {
			doc,
			page: {
				height: 200,
				width: 210,
				contentWidth: 180
			},
			layout: PDF_LAYOUT,
			colors: PDF_COLORS
		}

		const y = renderSectionTitle(ctx, 'Samenvatting', 20)

		expect(doc.text).toHaveBeenCalledWith('Samenvatting', PDF_LAYOUT.marginLeft, 20)
		expect(doc.line).toHaveBeenCalledTimes(1)
		expect(y).toBe(29.5)
	})

	it('draws divider with shared border style', () => {
		const doc = createDocStub()
		const ctx = {
			doc,
			page: {
				height: 200,
				width: 210,
				contentWidth: 180
			},
			layout: PDF_LAYOUT,
			colors: PDF_COLORS
		}

		drawSectionDivider(ctx, 25)
		expect(doc.setDrawColor).toHaveBeenCalledWith(...PDF_COLORS.border)
		expect(doc.line).toHaveBeenCalledWith(PDF_LAYOUT.marginLeft, 25, 194, 25)
	})

	it('normalizes the pdf extension on save', () => {
		const doc = createDocStub()
		savePdf(doc, 'mijn-rapport')
		savePdf(doc, 'al.pdf')

		expect(doc.save).toHaveBeenNthCalledWith(1, 'mijn-rapport.pdf')
		expect(doc.save).toHaveBeenNthCalledWith(2, 'al.pdf')
	})
})
