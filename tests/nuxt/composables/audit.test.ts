import type { ItemsCollectionItem } from '@nuxt/content'

import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useAudit } from '~/composables/use-audit'
import { useAuditUtils } from '~/composables/use-audit-utils'
import { useStateStore } from '~/stores/state'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { trackAuditScoreMock, trackModeSwitchMock, getIconMock } = vi.hoisted(() => ({
	trackAuditScoreMock: vi.fn(),
	trackModeSwitchMock: vi.fn(),
	getIconMock: vi.fn((name: string) => `icon:${name}`)
}))

mockNuxtImport('useTracking', () => {
	return () => ({
		trackModeSwitch: trackModeSwitchMock,
		trackAuditScore: trackAuditScoreMock,
		trackEvent: vi.fn(),
		trackAiAction: vi.fn(),
		trackAiInsight: vi.fn(),
		trackReportGenerated: vi.fn()
	})
})

mockNuxtImport('useIcons', () => {
	return () => ({
		getIcon: getIconMock
	})
})

function createItem(id: string, pillar: string): ItemsCollectionItem {
	return {
		id,
		title: `Item ${id}`,
		pillar,
		goals: ['Informeren'],
		priority: 'Must have',
		description: `Beschrijving ${id}`
	} as unknown as ItemsCollectionItem
}

describe('useAuditUtils', () => {
	beforeEach(() => {
		trackAuditScoreMock.mockReset()
		trackModeSwitchMock.mockReset()
		getIconMock.mockClear()
	})

	it('maps scores to labels/colors and computes pillar averages', () => {
		const utils = useAuditUtils()
		const items = [
			createItem('a-1', 'Inzicht & Overzicht'),
			createItem('a-2', 'Inzicht & Overzicht'),
			createItem('a-3', 'Verdieping & Ervaring')
		]

		const auditMap = {
			'a-1': { score: 8, comment: '' },
			'a-2': { score: 6, comment: '' },
			'a-3': { score: undefined, comment: '' }
		}

		expect(utils.getScoreColor(undefined)).toBe('secondary')
		expect(utils.getScoreColor(8)).toBe('success')
		expect(utils.getScoreColor(6)).toBe('warning')
		expect(utils.getScoreColor(3)).toBe('error')
		expect(utils.getScoreLabel(undefined)).toBe('Nog geen score')

		expect(utils.calculateAverageForPillar(items, auditMap, 'Inzicht & Overzicht')).toEqual({
			score: 7,
			count: 2
		})

		const averages = utils.getAverages(items, auditMap)
		expect(averages).toHaveLength(4)
		expect(averages[0]?.score).toBe(7)
		expect(averages[0]?.icon).toBe('icon:inzicht')
	})
})

describe('useAudit', () => {
	beforeEach(() => {
		trackAuditScoreMock.mockReset()
		trackModeSwitchMock.mockReset()
	})

	it('binds score/comment state and tracks only score changes', () => {
		const store = useStateStore()
		store.setAuditComment('item-1', 'Bestaande toelichting')

		const audit = useAudit({ itemId: 'item-1', itemTitle: 'Homepage' })

		expect(audit.description.value).toContain('Homepage')
		expect(audit.comment.value).toBe('Bestaande toelichting')

		audit.score.value = 7
		audit.score.value = 7
		audit.score.value = 9
		audit.comment.value = 'Nieuwe toelichting'

		expect(store.getAuditScore('item-1')).toBe(9)
		expect(store.getAuditComment('item-1')).toBe('Nieuwe toelichting')
		expect(audit.currentScoreColor.value).toBe('success')
		expect(trackAuditScoreMock).toHaveBeenCalledTimes(2)
		expect(trackAuditScoreMock).toHaveBeenNthCalledWith(1, {
			itemId: 'item-1',
			score: 7
		})
		expect(trackAuditScoreMock).toHaveBeenNthCalledWith(2, {
			itemId: 'item-1',
			score: 9
		})
	})

	it('uses explicit description when provided', () => {
		const audit = useAudit({
			itemId: 'item-2',
			itemTitle: 'Contact',
			description: 'Custom beschrijving'
		})

		expect(audit.description.value).toBe('Custom beschrijving')
	})
})
