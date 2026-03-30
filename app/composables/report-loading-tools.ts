/**
 * Resolves whether one loading tool should be expanded.
 *
 * Active tools are always expanded; completed tools follow remembered state.
 *
 * @param args - Tool id, active tool id, and remembered open-state map.
 * @returns Whether the tool should be expanded.
 */
export function isReportLoadingToolOpen(args: {
	toolId: string
	activeToolId: string | undefined
	openState: Record<string, boolean>
}): boolean {
	if (args.toolId === args.activeToolId) {
		return true
	}

	return args.openState[args.toolId] ?? false
}

/**
 * Applies one user toggle event to the loading-tool open-state map.
 *
 * Active tools remain forced-open even when a close interaction is attempted.
 *
 * @param args - Current map and toggle event details.
 * @returns Updated open-state map.
 */
export function applyReportLoadingToolOpenChange(args: {
	openState: Record<string, boolean>
	toolId: string
	isOpen: boolean
	activeToolId: string | undefined
}): Record<string, boolean> {
	const nextState = { ...args.openState }

	if (args.toolId === args.activeToolId) {
		nextState[args.toolId] = true
		return nextState
	}

	nextState[args.toolId] = args.isOpen
	return nextState
}

/**
 * Applies automatic open/close updates when the active loading tool changes.
 *
 * Behavior:
 * - new active tool is forced open
 * - previous active tool is auto-closed when stage advances
 *
 * @param args - Current map and active-tool transition.
 * @returns Updated open-state map.
 */
export function applyReportLoadingToolActiveTransition(args: {
	openState: Record<string, boolean>
	nextActiveToolId: string | undefined
	previousActiveToolId: string | undefined
}): Record<string, boolean> {
	const nextState = { ...args.openState }

	if (args.nextActiveToolId) {
		nextState[args.nextActiveToolId] = true
	}

	if (args.previousActiveToolId && args.previousActiveToolId !== args.nextActiveToolId) {
		nextState[args.previousActiveToolId] = false
	}

	return nextState
}
