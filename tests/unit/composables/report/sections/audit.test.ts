import type { ItemsCollectionItem } from '@nuxt/content'
import type { Audit } from '~~/shared/types/audit'

import {
	createCommentBlockMap,
	drawAuditSectionItem,
	renderAuditSection
} from '~/composables/report/sections/audit'
import { describe, expect, it, vi } from 'vitest'

const markdownMocks = vi.hoisted(() => ({
	markdownToBlocks: vi.fn((markdown: string) => [
		{ type: 'paragraph', segments: [{ text: markdown, marks: [] }] }
	]),
	measureMarkdownBlocksHeight: vi.fn(() => 12),
	renderMarkdownBlocks: vi.fn((_doc, _blocks, _x, y: number) => y + 9)
}))

const pdfMocks = vi.hoisted(() => ({
	ensurePageSpace: vi.fn((_ctx, y: number) => y),
	mapScoreColor: vi.fn(() => [10, 20, 30] as const),
	renderSectionTitle: vi.fn((_ctx, _title, y: number) => y + 4),
	setPdfDrawColor: vi.fn(),
	setPdfTextColor: vi.fn(),
	writeWrappedText: vi.fn((_doc, args: { y: number }) => args.y + 5)
}))

vi.mock('~/composables/report/markdown', () => markdownMocks)
vi.mock('~/composables/report/pdf', () => pdfMocks)

function createAudit(id: string, comment = 'Toelichting'): Audit<ItemsCollectionItem> {
	return {
		id,
		score: 7,
		comment,
		item: {
			id,
			title: `Item ${id}`,
			pillar: 'Inzicht & Overzicht',
			priority: 'Must have',
			goals: ['Informeren'],
			description: `Beschrijving ${id}`
		} as unknown as ItemsCollectionItem
	}
}

function createContext() {
	const pageState = { current: 1 }

	return {
		doc: {
			addPage: vi.fn(() => {
				pageState.current += 1
			}),
			getCurrentPageInfo: vi.fn(() => ({ pageNumber: pageState.current })),
			internal: {
				pageSize: {
					getHeight: () => 297
				}
			},
			setFont: vi.fn(),
			setFontSize: vi.fn(),
			setLineWidth: vi.fn(),
			setPage: vi.fn((page: number) => {
				pageState.current = page
			}),
			line: vi.fn(),
			text: vi.fn(),
			getTextWidth: vi.fn((text: string) => text.length)
		},
		layout: {
			marginLeft: 16,
			marginTop: 18,
			marginBottom: 18
		},
		page: {
			contentWidth: 178,
			width: 210
		},
		colors: {
			border: [229, 231, 235],
			heading: [44, 36, 97],
			secondary: [0, 123, 199],
			text: [17, 17, 17],
			muted: [107, 114, 128]
		}
	}
}

describe('report/sections/audit', () => {
	it('normalizes comments into markdown blocks map', () => {
		const audits = [createAudit('a-1', '  **Vet**  '), createAudit('a-2', '   ')]
		const map = createCommentBlockMap(audits)

		expect(markdownMocks.markdownToBlocks).toHaveBeenCalledWith('**Vet**')
		expect(map.get('a-1')).toBeDefined()
		expect(map.get('a-2')).toEqual([])
	})

	it('draws one audit item and returns next cursor position', () => {
		const ctx = createContext()
		const nextY = drawAuditSectionItem(
			ctx as never,
			createAudit('a-1'),
			[{ type: 'paragraph' }] as never,
			40
		)

		expect(pdfMocks.ensurePageSpace).toHaveBeenCalled()
		expect(ctx.doc.line).toHaveBeenCalled()
		expect(nextY).toBeGreaterThan(40)
	})

	it('tracks page breaks and draws the left rule over all visited pages', () => {
		const ctx = createContext()
		pdfMocks.writeWrappedText.mockImplementationOnce(
			(doc: { addPage: () => void }, args: { y: number }) => {
				doc.addPage()
				return args.y + 5
			}
		)

		drawAuditSectionItem(ctx as never, createAudit('a-1'), [] as never, 40)

		expect(ctx.doc.setPage).toHaveBeenCalledWith(1)
		expect(ctx.doc.setPage).toHaveBeenCalledWith(2)
		expect(ctx.doc.line).toHaveBeenCalledTimes(2)
	})

	it('renders section intro and all audit entries', () => {
		const ctx = createContext()
		const audits = [createAudit('a-1', 'Eerste'), createAudit('a-2', '')]

		renderAuditSection(ctx as never, audits, {
			region: 'Utrecht'
		} as never)

		expect(ctx.doc.addPage).toHaveBeenCalledTimes(1)
		expect(pdfMocks.renderSectionTitle).toHaveBeenCalledWith(ctx, 'Details per onderdeel', 18)
		expect(pdfMocks.writeWrappedText).toHaveBeenCalled()
		expect(markdownMocks.markdownToBlocks).toHaveBeenCalledWith('Eerste')
	})
})
