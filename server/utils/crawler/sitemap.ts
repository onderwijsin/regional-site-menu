import type { SitemapDocumentEntries } from './types'

import { CRAWLER_CONFIG } from '@ai'
import { XMLParser } from 'fast-xml-parser'
import pLimit from 'p-limit'

import { fetchTextDocument } from './fetch'
import { asRecord, toArray } from './records'
import { isAllowedUrl, normalizeUrl } from './url'

const sitemapXmlParser = new XMLParser({
	ignoreAttributes: true,
	removeNSPrefix: true,
	trimValues: true
})

/**
 * Fetches candidate sitemap files and extracts URLs.
 *
 * @param startUrl - Entry URL.
 * @param allowedDomains - Allowed hostnames.
 * @param timeoutMs - Per-request timeout.
 * @param maxConcurrency - Max parallel sitemap requests.
 * @returns Same-domain sitemap URLs.
 */
export async function fetchSitemapUrls(
	startUrl: string,
	allowedDomains: string[],
	timeoutMs: number,
	maxConcurrency: number
): Promise<string[]> {
	const entry = new URL(startUrl)
	const discoveredSitemaps = new Set<string>()
	const visitedSitemaps = new Set<string>()
	const sitemapQueue: string[] = []
	const collectedPageUrls = new Set<string>()
	const sitemapFetchLimit = pLimit(maxConcurrency)

	const enqueueSitemapUrl = (rawUrl: string): void => {
		try {
			const normalized = normalizeUrl(new URL(rawUrl, entry.origin).toString())
			if (!isAllowedUrl(normalized, allowedDomains)) {
				return
			}

			if (discoveredSitemaps.has(normalized) || visitedSitemaps.has(normalized)) {
				return
			}

			discoveredSitemaps.add(normalized)
			sitemapQueue.push(normalized)
		} catch {
			// Ignore malformed sitemap locations.
		}
	}

	for (const sitemapPath of CRAWLER_CONFIG.sitemapPaths) {
		enqueueSitemapUrl(new URL(sitemapPath, entry.origin).toString())
	}

	for (const robotsSitemapUrl of await fetchRobotsSitemapUrls(entry.origin, timeoutMs)) {
		enqueueSitemapUrl(robotsSitemapUrl)
	}

	while (
		sitemapQueue.length > 0 &&
		collectedPageUrls.size < CRAWLER_CONFIG.maxSitemapUrls &&
		visitedSitemaps.size < CRAWLER_CONFIG.maxSitemapDocuments
	) {
		const batch = sitemapQueue.splice(0, maxConcurrency)

		const entries = await Promise.all(
			batch.map((sitemapUrl, index) =>
				sitemapFetchLimit(async () => {
					const documentEntries = await fetchSitemapEntries(sitemapUrl, timeoutMs)
					return { index, sitemapUrl, documentEntries }
				})
			)
		)

		for (const entryResult of [...entries].sort((left, right) => left.index - right.index)) {
			visitedSitemaps.add(entryResult.sitemapUrl)

			if (!entryResult.documentEntries) {
				continue
			}

			for (const nestedSitemapUrl of entryResult.documentEntries.nestedSitemaps) {
				if (
					visitedSitemaps.size + sitemapQueue.length >=
						CRAWLER_CONFIG.maxSitemapDocuments ||
					collectedPageUrls.size >= CRAWLER_CONFIG.maxSitemapUrls
				) {
					break
				}

				enqueueSitemapUrl(nestedSitemapUrl)
			}

			for (const pageUrl of entryResult.documentEntries.pageUrls) {
				if (collectedPageUrls.size >= CRAWLER_CONFIG.maxSitemapUrls) {
					break
				}

				if (!isAllowedUrl(pageUrl, allowedDomains)) {
					continue
				}

				collectedPageUrls.add(normalizeUrl(pageUrl))
			}
		}
	}

	return [...collectedPageUrls]
}

/**
 * Downloads robots.txt and extracts sitemap declarations.
 *
 * @param origin - Site origin.
 * @param timeoutMs - Per-request timeout.
 * @returns Sitemap URLs declared in robots.txt.
 */
async function fetchRobotsSitemapUrls(origin: string, timeoutMs: number): Promise<string[]> {
	const robotsUrl = new URL(CRAWLER_CONFIG.robotsPath, origin).toString()
	const robotsText = await fetchTextDocument(robotsUrl, timeoutMs)
	if (!robotsText) {
		return []
	}

	const sitemapUrls: string[] = []
	const lines = robotsText.split(/\r?\n/)

	for (const line of lines) {
		const match = line.match(/^\s*sitemap:\s*(\S+)\s*$/i)
		if (!match?.[1]) {
			continue
		}

		try {
			sitemapUrls.push(new URL(match[1], origin).toString())
		} catch {
			// Ignore malformed sitemap URL values.
		}
	}

	return sitemapUrls
}

/**
 * Downloads and parses a sitemap document.
 *
 * @param sitemapUrl - Sitemap URL.
 * @param timeoutMs - Per-request timeout.
 * @returns Parsed entries or null.
 */
async function fetchSitemapEntries(
	sitemapUrl: string,
	timeoutMs: number
): Promise<SitemapDocumentEntries | null> {
	const xml = await fetchTextDocument(sitemapUrl, timeoutMs)
	if (!xml) {
		return null
	}

	return parseSitemapXml(xml)
}

/**
 * Parses sitemap XML into nested sitemap URLs and page URLs.
 *
 * @param xml - Raw sitemap XML.
 * @returns Parsed sitemap entries.
 */
function parseSitemapXml(xml: string): SitemapDocumentEntries {
	try {
		const parsed = sitemapXmlParser.parse(xml)
		const root = asRecord(parsed)

		const sitemapIndex = asRecord(root?.sitemapindex)
		if (sitemapIndex) {
			return {
				pageUrls: [],
				nestedSitemaps: collectLocEntries(sitemapIndex.sitemap)
			}
		}

		const urlSet = asRecord(root?.urlset)
		if (urlSet) {
			return {
				pageUrls: collectLocEntries(urlSet.url),
				nestedSitemaps: []
			}
		}
	} catch {
		// Ignore invalid sitemap documents.
	}

	return {
		pageUrls: [],
		nestedSitemaps: []
	}
}

/**
 * Extracts `loc` URLs from sitemap array/object values.
 *
 * @param value - Parsed sitemap node value.
 * @returns Extracted URLs.
 */
function collectLocEntries(value: unknown): string[] {
	const entries = toArray(value)
	const urls: string[] = []

	for (const entry of entries) {
		if (typeof entry === 'string') {
			urls.push(entry)
			continue
		}

		const objectEntry = asRecord(entry)
		const loc = objectEntry?.loc
		if (typeof loc === 'string') {
			urls.push(loc)
		}
	}

	return urls
}
