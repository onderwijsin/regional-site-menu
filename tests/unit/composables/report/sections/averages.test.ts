import type { PillarAverage } from '~~/shared/types/audit'

import { PDF_COLORS, PDF_LAYOUT } from '~/composables/report/constants'
import {
	drawAverageCard,
	getScoreColorKey,
	renderAveragesSection
} from '~/composables/report/sections/averages'
import { beforeEach, describe, expect, it, vi } from 'vitest'

function createDocStub() {
	return {
		addPage: vi.fn(),
		roundedRect: vi.fn(),
		setFont: vi.fn(),
		setFontSize: vi.fn(),
		setTextColor: vi.fn(),
		setDrawColor: vi.fn(),
		setFillColor: vi.fn(),
		setLineWidth: vi.fn(),
		line: vi.fn(),
		text: vi.fn(),
		splitTextToSize: vi.fn((text: string) => [text]),
		getTextWidth: vi.fn((text: string) => text.length),
		internal: {
			pageSize: {
				getHeight: () => 297
			}
		}
	}
}

function createRenderContext() {
	const doc = createDocStub()
	return {
		doc,
		page: {
			width: 210,
			height: 297,
			contentWidth: 178
		},
		layout: PDF_LAYOUT,
		colors: PDF_COLORS
	}
}

const averages: PillarAverage<string>[] = [
	{
		pillar: 'Inzicht & Overzicht',
		score: 8,
		count: 2,
		label: 'Zeer goed',
		color: 'success',
		icon: 'inzicht'
	},
	{
		pillar: 'Verdieping & Ervaring',
		score: 6,
		count: 3,
		label: 'Voldoende',
		color: 'warning',
		icon: 'verdieping'
	},
	{
		pillar: 'Activatie & Deelname',
		score: 4,
		count: 1,
		label: 'Slecht',
		color: 'error',
		icon: 'activatie'
	},
	{
		pillar: 'Ondersteuning & Contact',
		score: undefined,
		count: 0,
		label: 'Nog geen score',
		color: 'secondary',
		icon: 'ondersteuning'
	}
]

describe('report/sections/averages', () => {
	beforeEach(() => {
		vi.stubGlobal('getPillarHint', (pillar: string) => `Hint ${pillar}`)
	})

	it('maps score ranges to semantic keys', () => {
		expect(getScoreColorKey(null)).toBe('neutral')
		expect(getScoreColorKey(8)).toBe('success')
		expect(getScoreColorKey(5)).toBe('warning')
		expect(getScoreColorKey(4)).toBe('error')
	})

	it('draws average cards for scored and unscored pillars', () => {
		const ctx = createRenderContext()

		drawAverageCard(ctx as never, {
			x: 16,
			y: 30,
			width: 85,
			height: 40,
			average: averages[0]!
		})
		drawAverageCard(ctx as never, {
			x: 16,
			y: 80,
			width: 85,
			height: 40,
			average: averages[3]!
		})

		expect(ctx.doc.roundedRect).toHaveBeenCalledTimes(2)
		expect(ctx.doc.text).toHaveBeenCalledWith(
			'Nog geen score',
			expect.any(Number),
			expect.any(Number)
		)
	})

	it('renders averages page with intro copy and summary grid', () => {
		const ctx = createRenderContext()

		renderAveragesSection(
			ctx as never,
			{
				averages,
				audits: []
			} as never,
			{
				region: 'Utrecht'
			} as never
		)

		expect(ctx.doc.addPage).toHaveBeenCalledTimes(1)
		expect(ctx.doc.text).toHaveBeenCalledWith('Overzicht per pijler', PDF_LAYOUT.marginLeft, 18)
		expect(ctx.doc.roundedRect).toHaveBeenCalled()
		expect(ctx.doc.text).toHaveBeenCalledWith(
			'Inzicht & Overzicht',
			expect.any(Number),
			expect.any(Number)
		)
	})
})
