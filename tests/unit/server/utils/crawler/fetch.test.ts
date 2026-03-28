import {
	fetchHtmlPage,
	fetchTextDocument,
	readResponseTextWithLimit
} from '~~/server/utils/crawler/fetch'
import { describe, expect, it, vi } from 'vitest'

describe('crawler/fetch utilities', () => {
	it('returns null when content-length exceeds max bytes', async () => {
		const response = new Response('hello', {
			headers: {
				'content-length': '999'
			}
		})

		await expect(readResponseTextWithLimit(response, 10)).resolves.toBeNull()
	})

	it('returns text when body is within max bytes', async () => {
		const response = new Response('hello world')
		await expect(readResponseTextWithLimit(response, 100)).resolves.toBe('hello world')
	})

	it('falls back to response.text when body stream is unavailable', async () => {
		const response = {
			headers: new Headers(),
			body: null,
			text: vi.fn().mockResolvedValue('plain-text')
		} as unknown as Response

		await expect(readResponseTextWithLimit(response, 100)).resolves.toBe('plain-text')
	})

	it('returns null for response.text fallback when encoded size exceeds the limit', async () => {
		const response = {
			headers: new Headers(),
			body: null,
			text: vi.fn().mockResolvedValue('this is too long')
		} as unknown as Response

		await expect(readResponseTextWithLimit(response, 3)).resolves.toBeNull()
	})

	it('returns null when stream exceeds max bytes and cancels the reader', async () => {
		const cancelMock = vi.fn().mockResolvedValue(undefined)
		const releaseLockMock = vi.fn()
		const response = {
			headers: new Headers(),
			body: {
				getReader: () => ({
					read: vi
						.fn()
						.mockResolvedValueOnce({ value: new Uint8Array([1, 2, 3, 4]), done: false })
						.mockResolvedValueOnce({ done: true }),
					cancel: cancelMock,
					releaseLock: releaseLockMock
				})
			}
		} as unknown as Response

		await expect(readResponseTextWithLimit(response, 3)).resolves.toBeNull()
		expect(cancelMock).toHaveBeenCalledOnce()
		expect(releaseLockMock).toHaveBeenCalledOnce()
	})

	it('returns null when reader throws while reading stream', async () => {
		const releaseLockMock = vi.fn()
		const response = {
			headers: new Headers(),
			body: {
				getReader: () => ({
					read: vi.fn().mockRejectedValue(new Error('read failed')),
					cancel: vi.fn(),
					releaseLock: releaseLockMock
				})
			}
		} as unknown as Response

		await expect(readResponseTextWithLimit(response, 20)).resolves.toBeNull()
		expect(releaseLockMock).toHaveBeenCalledOnce()
	})

	it('skips empty chunks while reading stream content', async () => {
		const response = {
			headers: new Headers(),
			body: {
				getReader: () => ({
					read: vi
						.fn()
						.mockResolvedValueOnce({ value: undefined, done: false })
						.mockResolvedValueOnce({
							value: new TextEncoder().encode('ok'),
							done: false
						})
						.mockResolvedValueOnce({ done: true }),
					cancel: vi.fn().mockResolvedValue(undefined),
					releaseLock: vi.fn()
				})
			}
		} as unknown as Response

		await expect(readResponseTextWithLimit(response, 50)).resolves.toBe('ok')
	})

	it('returns null when HTML page is not crawlable', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response('{"ok":true}', {
					status: 200,
					headers: {
						'content-type': 'application/json'
					}
				})
			)
		)

		await expect(fetchHtmlPage('https://example.com', 1000, 1000)).resolves.toBeNull()
	})

	it('returns null when html response exceeds byte limit', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response('<html><body>ok</body></html>', {
					status: 200,
					headers: {
						'content-type': 'text/html',
						'content-length': '5000'
					}
				})
			)
		)

		await expect(fetchHtmlPage('https://example.com', 1000, 100)).resolves.toBeNull()
	})

	it('returns null when html response status is not ok', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(new Response('not found', { status: 404 }))
		)
		await expect(fetchHtmlPage('https://example.com/missing', 1000, 1000)).resolves.toBeNull()
	})

	it('returns html and final URL when response is valid html', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response('<html><body>ok</body></html>', {
					status: 200,
					headers: {
						'content-type': 'text/html'
					}
				})
			)
		)

		const result = await fetchHtmlPage('https://example.com/page', 1000, 1000)
		expect(result).toEqual({
			html: '<html><body>ok</body></html>',
			finalUrl: 'https://example.com/page'
		})
	})

	it('returns null when html fetch throws', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))
		await expect(fetchHtmlPage('https://example.com/page', 1000, 1000)).resolves.toBeNull()
	})

	it('returns null when text document response fails', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('oops', { status: 500 })))
		await expect(fetchTextDocument('https://example.com/sitemap.xml', 500)).resolves.toBeNull()
	})

	it('returns text when text document is fetched successfully', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(new Response('<xml>ok</xml>', { status: 200 }))
		)
		await expect(fetchTextDocument('https://example.com/sitemap.xml', 500)).resolves.toBe(
			'<xml>ok</xml>'
		)
	})

	it('returns null when text document fetch throws', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')))
		await expect(fetchTextDocument('https://example.com/sitemap.xml', 500)).resolves.toBeNull()
	})
})
