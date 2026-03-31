import { createServerExecutionTimer } from '~~/server/utils/observability/timing'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('utils/observability/timing', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('logs mark steps and done payload with merged metadata', () => {
		const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
		vi.spyOn(Date, 'now')
			.mockReturnValueOnce(1000)
			.mockReturnValueOnce(1010)
			.mockReturnValueOnce(1035)
			.mockReturnValueOnce(1100)

		const timer = createServerExecutionTimer('api/test')
		timer.mark('parsed')
		timer.mark('validated', { retries: 1 })
		timer.done({ success: true })

		expect(infoSpy).toHaveBeenNthCalledWith(1, '[timing] api/test :: parsed +10ms')
		expect(infoSpy).toHaveBeenNthCalledWith(2, '[timing] api/test :: validated +25ms', {
			retries: 1
		})
		expect(infoSpy).toHaveBeenNthCalledWith(3, '[timing] api/test :: done 100ms', {
			totalMs: 100,
			steps: [
				{ step: 'parsed', durationMs: 10 },
				{ step: 'validated', durationMs: 25 }
			],
			success: true
		})
	})

	it('logs done payload without extra metadata', () => {
		const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
		vi.spyOn(Date, 'now').mockReturnValueOnce(5000).mockReturnValueOnce(5030)

		const timer = createServerExecutionTimer('api/done')
		timer.done()

		expect(infoSpy).toHaveBeenCalledWith('[timing] api/done :: done 30ms', {
			totalMs: 30,
			steps: []
		})
	})

	it('normalizes Error objects with status fields in failure logs', () => {
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

		const timer = createServerExecutionTimer('api/fail')

		const error = Object.assign(new Error('upstream failed'), {
			statusCode: 502,
			statusMessage: 'Bad Gateway'
		})
		timer.fail(error, { stage: 'verify' })

		expect(errorSpy).toHaveBeenCalledTimes(1)
		const [message, payload] = errorSpy.mock.calls[0] as [string, Record<string, unknown>]
		expect(message).toMatch(/^\[timing\] api\/fail :: failed \d+ms$/)
		expect(payload).toMatchObject({
			steps: [],
			error: {
				name: 'Error',
				message: 'upstream failed',
				statusCode: 502,
				statusMessage: 'Bad Gateway'
			},
			stage: 'verify'
		})
		expect(typeof payload.totalMs).toBe('number')
	})

	it('normalizes non-Error object failures', () => {
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
		vi.spyOn(Date, 'now').mockReturnValueOnce(3000).mockReturnValueOnce(3010)

		const timer = createServerExecutionTimer('api/object-fail')
		timer.fail({ reason: 'timeout', retryable: true })

		expect(errorSpy).toHaveBeenCalledWith('[timing] api/object-fail :: failed 10ms', {
			totalMs: 10,
			steps: [],
			error: { reason: 'timeout', retryable: true }
		})
	})

	it('normalizes Error failures without status fields', () => {
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
		vi.spyOn(Date, 'now').mockReturnValueOnce(3500).mockReturnValueOnce(3501)

		const timer = createServerExecutionTimer('api/error-no-status')
		timer.fail(new Error('plain error'))

		expect(errorSpy).toHaveBeenCalledWith('[timing] api/error-no-status :: failed 1ms', {
			totalMs: 1,
			steps: [],
			error: {
				name: 'Error',
				message: 'plain error'
			}
		})
	})

	it('normalizes primitive failures into string values', () => {
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
		vi.spyOn(Date, 'now').mockReturnValueOnce(4000).mockReturnValueOnce(4015)

		const timer = createServerExecutionTimer('api/primitive-fail')
		timer.fail(404)

		expect(errorSpy).toHaveBeenCalledWith('[timing] api/primitive-fail :: failed 15ms', {
			totalMs: 15,
			steps: [],
			error: { value: '404' }
		})
	})
})
