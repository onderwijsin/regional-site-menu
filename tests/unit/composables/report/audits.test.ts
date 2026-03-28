import type { ItemsCollectionItem } from '@nuxt/content'

import { buildReportAudits } from '~/composables/report/audits'
import { describe, expect, it } from 'vitest'

function createItem(id: string, pillar = 'Inzicht & Overzicht'): ItemsCollectionItem {
	return {
		id,
		title: `Item ${id}`,
		pillar,
		goals: ['Informeren'],
		priority: 'Must have',
		description: `Beschrijving ${id}`
	} as unknown as ItemsCollectionItem
}

describe('buildReportAudits', () => {
	it('returns an empty array when content items are unavailable', () => {
		const result = buildReportAudits(undefined, {
			'a-1': { score: 8, comment: 'Goed' }
		})

		expect(result).toEqual([])
	})

	it('keeps only scored audits that still map to a known content item', () => {
		const items = [createItem('a-1'), createItem('a-2')]

		const result = buildReportAudits(items, {
			'a-1': { score: 9, comment: 'Sterk' },
			'a-2': { score: undefined, comment: 'Nog geen score' },
			'missing-item': { score: 5, comment: 'Niet meer bestaand item' }
		})

		expect(result).toEqual([
			{
				id: 'a-1',
				score: 9,
				comment: 'Sterk',
				item: items[0]
			}
		])
	})
})
