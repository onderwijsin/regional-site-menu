import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useStateStore } from '~/stores/state'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { trackModeSwitchMock } = vi.hoisted(() => ({
	trackModeSwitchMock: vi.fn()
}))

mockNuxtImport('useTracking', () => {
	return () => ({
		trackEvent: vi.fn(),
		trackAiAction: vi.fn(),
		trackAiInsight: vi.fn(),
		trackAuditScore: vi.fn(),
		trackReportGenerated: vi.fn(),
		trackModeSwitch: trackModeSwitchMock
	})
})

describe('useStateStore', () => {
	beforeEach(() => {
		trackModeSwitchMock.mockReset()
	})

	it('keeps persisted key contract unchanged', async () => {
		const sourcePath = join(process.cwd(), 'app/stores/state.ts')
		const source = await readFile(sourcePath, 'utf8')

		expect(source).toContain(
			"pick: ['mode', 'filter', 'hideWelcome', 'audit', 'region', 'notes', 'url']"
		)
	})

	it('creates and removes audit entries using delete semantics', () => {
		const store = useStateStore()
		store.setAuditScore('item-1', 8)
		store.setAuditComment('item-1', 'Sterke inhoud')

		expect(store.getAuditScore('item-1')).toBe(8)
		expect(store.getAuditComment('item-1')).toBe('Sterke inhoud')

		store.removeAudit('item-1')
		expect('item-1' in store.audit).toBe(false)

		store.setAuditScore('item-2', 5)
		store.setAuditScore('item-3', 7)
		store.clearAllAudits()

		expect(Object.keys(store.audit)).toEqual([])
	})

	it('tracks mode transitions and ignores redundant updates', () => {
		const store = useStateStore()
		store.setMode('edit', 'header_tabs')
		store.setMode('edit', 'header_tabs')
		store.setMode('explore', 'welcome_modal')

		expect(trackModeSwitchMock).toHaveBeenCalledTimes(2)
		expect(trackModeSwitchMock).toHaveBeenNthCalledWith(1, {
			from: 'explore',
			to: 'edit',
			source: 'header_tabs'
		})
		expect(trackModeSwitchMock).toHaveBeenNthCalledWith(2, {
			from: 'edit',
			to: 'explore',
			source: 'welcome_modal'
		})
	})
})
