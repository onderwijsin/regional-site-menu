import { CRAWLER_CONFIG } from '@constants'

/**
 * Reads a response body up to a max byte limit.
 *
 * @param response - Fetch response.
 * @param maxBytes - Maximum bytes to read.
 * @returns Decoded text or null when the response exceeds the limit.
 */
export async function readResponseTextWithLimit(
	response: Response,
	maxBytes: number
): Promise<string | null> {
	const contentLengthHeader = response.headers.get('content-length')
	if (contentLengthHeader) {
		const contentLength = Number.parseInt(contentLengthHeader, 10)
		if (Number.isFinite(contentLength) && contentLength > maxBytes) {
			return null
		}
	}

	if (!response.body) {
		const fallbackText = await response.text()
		if (new TextEncoder().encode(fallbackText).byteLength > maxBytes) {
			return null
		}

		return fallbackText
	}

	const reader = response.body.getReader()
	const decoder = new TextDecoder()
	let totalBytes = 0
	let text = ''

	try {
		while (true) {
			const { value, done } = await reader.read()
			if (done) {
				break
			}

			if (!value) {
				continue
			}

			totalBytes += value.byteLength
			if (totalBytes > maxBytes) {
				await reader.cancel()
				return null
			}

			text += decoder.decode(value, { stream: true })
		}

		text += decoder.decode()
		return text
	} catch {
		return null
	} finally {
		reader.releaseLock()
	}
}

/**
 * Fetches one page and returns HTML when content type is crawlable.
 *
 * @param url - Page URL.
 * @param timeoutMs - Per-request timeout.
 * @param maxHtmlBytes - Maximum number of HTML bytes to read.
 * @returns HTML payload + final URL or null when unavailable.
 */
export async function fetchHtmlPage(
	url: string,
	timeoutMs: number,
	maxHtmlBytes: number
): Promise<{ html: string; finalUrl: string } | null> {
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

	try {
		const response = await fetch(url, {
			method: 'GET',
			redirect: 'follow',
			signal: controller.signal,
			headers: {
				Accept: 'text/html,application/xhtml+xml'
			}
		})

		if (!response.ok) {
			return null
		}

		const contentType = response.headers.get('content-type')?.toLowerCase() || ''
		if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
			return null
		}

		const html = await readResponseTextWithLimit(response, maxHtmlBytes)
		if (!html) {
			return null
		}

		return {
			html,
			finalUrl: response.url || url
		}
	} catch {
		return null
	} finally {
		clearTimeout(timeoutId)
	}
}

/**
 * Downloads a text document (xml/txt/html) with a byte limit.
 *
 * @param url - Resource URL.
 * @param timeoutMs - Per-request timeout.
 * @param maxBytes - Maximum bytes to read.
 * @returns Body text or null.
 */
export async function fetchTextDocument(
	url: string,
	timeoutMs: number,
	maxBytes = CRAWLER_CONFIG.defaultMaxTextDocumentBytes
): Promise<string | null> {
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

	try {
		const response = await fetch(url, {
			method: 'GET',
			redirect: 'follow',
			signal: controller.signal,
			headers: {
				Accept: 'application/xml,text/xml,text/plain,text/html'
			}
		})

		if (!response.ok) {
			return null
		}

		return await readResponseTextWithLimit(response, maxBytes)
	} catch {
		return null
	} finally {
		clearTimeout(timeoutId)
	}
}
