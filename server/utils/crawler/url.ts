import { CRAWLER_CONFIG } from '@ai'

/**
 * Returns true when URL host is inside the allowed domain list.
 *
 * @param url - URL to test.
 * @param allowedDomains - Allowed hostnames.
 * @returns Whether URL is allowed.
 */
export function isAllowedUrl(url: string, allowedDomains: string[]): boolean {
	try {
		const { hostname } = new URL(url)
		const normalizedHostname = hostname.toLowerCase()
		return allowedDomains.some(
			(domain) => normalizedHostname === domain || normalizedHostname.endsWith(`.${domain}`)
		)
	} catch {
		return false
	}
}

/**
 * Clamps configured crawl concurrency to a safe range for Workers.
 *
 * @param value - Optional configured concurrency.
 * @returns Safe concurrency.
 */
export function clampConcurrency(value: number | undefined): number {
	const fallback = value ?? CRAWLER_CONFIG.defaultMaxConcurrency
	return Math.min(Math.max(Math.round(fallback), 1), CRAWLER_CONFIG.maxConcurrency)
}

/**
 * Normalizes URL for deduplication.
 *
 * @param input - Raw URL.
 * @returns Normalized absolute URL.
 */
export function normalizeUrl(input: string): string {
	const url = new URL(input)
	url.hash = ''

	// Remove tracking parameters that do not represent unique content pages.
	for (const key of [...url.searchParams.keys()]) {
		if (
			key.startsWith('utm_') ||
			key === 'fbclid' ||
			key === 'gclid' ||
			key === 'mc_cid' ||
			key === 'mc_eid'
		) {
			url.searchParams.delete(key)
		}
	}

	// Normalize trailing slash on non-root paths to reduce duplicate URLs.
	if (url.pathname.length > 1) {
		url.pathname = url.pathname.replace(/\/+$/g, '')
	}

	return url.toString()
}
