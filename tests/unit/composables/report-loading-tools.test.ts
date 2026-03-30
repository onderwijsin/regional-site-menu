import {
	applyReportLoadingToolActiveTransition,
	applyReportLoadingToolOpenChange,
	isReportLoadingToolOpen
} from '~~/app/composables/report-loading-tools'
import { describe, expect, it } from 'vitest'

describe('report-loading-tools', () => {
	it('always returns open for active tool', () => {
		const result = isReportLoadingToolOpen({
			toolId: 'analysis-2',
			activeToolId: 'analysis-2',
			openState: { 'analysis-2': false }
		})

		expect(result).toBe(true)
	})

	it('uses remembered open state for completed tool', () => {
		const result = isReportLoadingToolOpen({
			toolId: 'analysis-1',
			activeToolId: 'analysis-2',
			openState: { 'analysis-1': true }
		})

		expect(result).toBe(true)
	})

	it('keeps active tool open when user tries to close it', () => {
		const nextState = applyReportLoadingToolOpenChange({
			openState: { 'analysis-2': true },
			toolId: 'analysis-2',
			isOpen: false,
			activeToolId: 'analysis-2'
		})

		expect(nextState['analysis-2']).toBe(true)
	})

	it('updates completed tool open state from user toggle', () => {
		const nextState = applyReportLoadingToolOpenChange({
			openState: { 'analysis-1': false },
			toolId: 'analysis-1',
			isOpen: true,
			activeToolId: 'analysis-2'
		})

		expect(nextState['analysis-1']).toBe(true)
	})

	it('auto-closes previous active tool and opens next active tool', () => {
		const nextState = applyReportLoadingToolActiveTransition({
			openState: { 'analysis-1': true },
			previousActiveToolId: 'analysis-1',
			nextActiveToolId: 'analysis-2'
		})

		expect(nextState['analysis-1']).toBe(false)
		expect(nextState['analysis-2']).toBe(true)
	})

	it('does not auto-close when active tool id stays the same', () => {
		const nextState = applyReportLoadingToolActiveTransition({
			openState: { 'analysis-2': true },
			previousActiveToolId: 'analysis-2',
			nextActiveToolId: 'analysis-2'
		})

		expect(nextState['analysis-2']).toBe(true)
	})
})
