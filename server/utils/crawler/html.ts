import type { ParsedHtmlCrawlData, UnknownRecord } from './types'

import { Readability } from '@mozilla/readability'
import { parseHTML } from 'linkedom/worker'

import { asRecord, callRecordMethod, toIterableArray } from './records'
import { isAllowedUrl, normalizeUrl } from './url'

/**
 * Parses HTML for title, prioritized excerpt text, and links.
 *
 * @param html - HTML payload.
 * @param baseUrl - Base URL for resolving relative links.
 * @param allowedDomains - Allowed hostnames.
 * @param maxCharsPerPage - Max excerpt length.
 * @returns Parsed crawl data.
 */
export function parseHtmlForCrawl(
	html: string,
	baseUrl: string,
	allowedDomains: string[],
	maxCharsPerPage: number
): ParsedHtmlCrawlData {
	try {
		const parsedWindow = parseHTML(html)
		const windowRecord = asRecord(parsedWindow)
		const documentRecord = asRecord(windowRecord?.document)

		if (!documentRecord) {
			return {
				excerpt: '',
				links: []
			}
		}

		for (const node of querySelectorAllRecords(
			documentRecord,
			'script,style,noscript,template'
		)) {
			callRecordMethod(node, 'remove')
		}

		const title = normalizeText(getNodeText(querySelectorOneRecord(documentRecord, 'title')))
		const fallbackHeading = normalizeText(
			getNodeText(querySelectorOneRecord(documentRecord, 'h1'))
		)
		const readabilityExtracted = extractReadableContent(documentRecord, maxCharsPerPage)
		const contentRoot =
			querySelectorOneRecord(documentRecord, 'main') ??
			querySelectorOneRecord(documentRecord, 'article') ??
			asRecord(documentRecord.body)
		const fallbackExcerpt = normalizeText(getNodeText(contentRoot))
			.slice(0, maxCharsPerPage)
			.trim()
		const excerpt = readabilityExtracted.excerpt || fallbackExcerpt
		const links = extractLinksFromDocument(documentRecord, baseUrl, allowedDomains)

		return {
			title: title || undefined,
			heading:
				resolveHeading(() => fallbackHeading, readabilityExtracted.heading, title) ||
				undefined,
			excerpt,
			links
		}
	} catch {
		return {
			excerpt: '',
			links: []
		}
	}
}

/**
 * Pulls internal links from parsed HTML.
 *
 * @param documentRecord - Parsed HTML document as generic object.
 * @param baseUrl - Base URL for resolving relative links.
 * @param allowedDomains - Allowed hostnames.
 * @returns Normalized same-domain URLs.
 */
function extractLinksFromDocument(
	documentRecord: UnknownRecord,
	baseUrl: string,
	allowedDomains: string[]
): string[] {
	const urls = new Set<string>()

	for (const anchor of querySelectorAllRecords(documentRecord, 'a[href]')) {
		const rawHref = readAttribute(anchor, 'href')?.trim()
		if (
			!rawHref ||
			rawHref.startsWith('#') ||
			rawHref.startsWith('mailto:') ||
			rawHref.startsWith('tel:') ||
			rawHref.startsWith('javascript:')
		) {
			continue
		}

		try {
			const absolute = normalizeUrl(new URL(rawHref, baseUrl).toString())
			if (isAllowedUrl(absolute, allowedDomains)) {
				urls.add(absolute)
			}
		} catch {
			// Ignore malformed links.
		}
	}

	return [...urls]
}

/**
 * Resolves one selector against parsed document record.
 *
 * @param documentRecord - Parsed document object.
 * @param selector - CSS selector.
 * @returns Matching record or null.
 */
function querySelectorOneRecord(
	documentRecord: UnknownRecord,
	selector: string
): UnknownRecord | null {
	return asRecord(callRecordMethod(documentRecord, 'querySelector', selector))
}

/**
 * Resolves all selector matches against parsed document record.
 *
 * @param documentRecord - Parsed document object.
 * @param selector - CSS selector.
 * @returns Matching records.
 */
function querySelectorAllRecords(documentRecord: UnknownRecord, selector: string): UnknownRecord[] {
	const result = callRecordMethod(documentRecord, 'querySelectorAll', selector)
	const nodes = toIterableArray(result)
	const records: UnknownRecord[] = []

	for (const node of nodes) {
		const record = asRecord(node)
		if (record) {
			records.push(record)
		}
	}

	return records
}

/**
 * Reads `textContent` from an unknown node-like record.
 *
 * @param nodeRecord - Node-like object.
 * @returns Text content string.
 */
function getNodeText(nodeRecord: UnknownRecord | null): string {
	if (!nodeRecord) {
		return ''
	}

	const textContent = nodeRecord.textContent
	return typeof textContent === 'string' ? textContent : ''
}

/**
 * Reads an attribute from an unknown node-like record.
 *
 * @param nodeRecord - Node-like object.
 * @param attributeName - Attribute name.
 * @returns Attribute value or null.
 */
function readAttribute(nodeRecord: UnknownRecord, attributeName: string): string | null {
	const value = callRecordMethod(nodeRecord, 'getAttribute', attributeName)
	return typeof value === 'string' ? value : null
}

/**
 * Normalizes text for excerpts.
 *
 * @param value - Raw text.
 * @returns Normalized text.
 */
function normalizeText(value: string | null | undefined): string {
	return value?.replace(/\s+/g, ' ').trim() ?? ''
}

/**
 * Attempts lightweight article extraction and falls back when unsuitable.
 *
 * @param documentRecord - Parsed HTML document.
 * @param maxCharsPerPage - Max excerpt length.
 * @returns Optional heading and excerpt.
 */
function extractReadableContent(
	documentRecord: UnknownRecord,
	maxCharsPerPage: number
): { heading: string; excerpt: string } {
	const defaultResult = { heading: '', excerpt: '' }
	try {
		const parsed = new Readability(
			documentRecord as unknown as ConstructorParameters<typeof Readability>[0]
		).parse()
		if (!parsed) {
			return defaultResult
		}

		const excerpt = normalizeText(parsed.textContent).slice(0, maxCharsPerPage).trim()
		if (!excerpt) {
			return defaultResult
		}

		return {
			heading: normalizeText(parsed.title),
			excerpt
		}
	} catch {
		return defaultResult
	}
}

/**
 * Resolves the most suitable heading while avoiding duplicate page-title noise.
 *
 * @param getFallbackHeading - Lazily resolves H1 extracted from document.
 * @param readabilityHeading - Readability-provided title/heading.
 * @param pageTitle - Document title.
 * @returns Best heading candidate.
 */
function resolveHeading(
	getFallbackHeading: () => string,
	readabilityHeading: string,
	pageTitle: string
): string {
	if (!readabilityHeading) {
		return getFallbackHeading()
	}

	if (readabilityHeading === pageTitle) {
		return getFallbackHeading()
	}

	return readabilityHeading
}
