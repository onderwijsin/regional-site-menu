type StepTiming = {
	step: string
	durationMs: number
}

/**
 * Lightweight request-step timer for server route observability.
 *
 * Logs:
 * - each marked step with delta since previous mark
 * - final success/failure with total runtime and step breakdown
 *
 * @param label - Stable route/action label included in log output.
 * @returns Timing helpers (`mark`, `done`, `fail`) for step-level observability.
 */
export function createServerExecutionTimer(label: string) {
	const startedAt = Date.now()
	let lastStepAt = startedAt
	const steps: StepTiming[] = []

	function mark(step: string, meta?: Record<string, unknown>): void {
		const now = Date.now()
		const durationMs = now - lastStepAt
		lastStepAt = now
		steps.push({ step, durationMs })

		if (meta) {
			console.info(`[timing] ${label} :: ${step} +${durationMs}ms`, meta)
			return
		}

		console.info(`[timing] ${label} :: ${step} +${durationMs}ms`)
	}

	function done(meta?: Record<string, unknown>): void {
		const totalMs = Date.now() - startedAt
		console.info(`[timing] ${label} :: done ${totalMs}ms`, {
			totalMs,
			steps,
			...(meta ?? {})
		})
	}

	function fail(error: unknown, meta?: Record<string, unknown>): void {
		const totalMs = Date.now() - startedAt
		console.error(`[timing] ${label} :: failed ${totalMs}ms`, {
			totalMs,
			steps,
			error: normalizeError(error),
			...(meta ?? {})
		})
	}

	return {
		mark,
		done,
		fail
	}
}

function normalizeError(error: unknown): Record<string, unknown> {
	if (error instanceof Error) {
		const maybeHttp = error as Error & {
			statusCode?: number
			statusMessage?: string
		}

		return {
			name: error.name,
			message: error.message,
			...(typeof maybeHttp.statusCode === 'number'
				? {
						statusCode: maybeHttp.statusCode,
						statusMessage: maybeHttp.statusMessage
					}
				: {})
		}
	}

	if (error && typeof error === 'object') {
		return { ...((error as Record<string, unknown>) ?? {}) }
	}

	return { value: String(error) }
}
