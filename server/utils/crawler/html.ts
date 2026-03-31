import type { ParsedHtmlCrawlData, UnknownRecord } from './types'

import { CRAWLER_CONFIG } from '@ai'
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
				fullContent: '',
				links: []
			}
		}

		for (const node of querySelectorAllRecords(
			documentRecord,
			'script,style,noscript,template,header,footer,nav,aside'
		)) {
			callRecordMethod(node, 'remove')
		}

		const title = normalizeText(getNodeText(querySelectorOneRecord(documentRecord, 'title')))
		const mainHeading = normalizeText(getNodeText(querySelectorOneRecord(documentRecord, 'h1')))
		const fallbackContent = extractFallbackContent(documentRecord, maxCharsPerPage)
		const readabilityCandidate = extractReadabilityCandidate(documentRecord)
		const readabilityText = normalizeText(readabilityCandidate?.text)
		const usesReadability = isReadabilityExcerptViable(readabilityText)
		const excerpt = usesReadability
			? readabilityText.slice(0, maxCharsPerPage).trim()
			: fallbackContent.excerpt
		const fullContent = usesReadability
			? toSemanticContent(readabilityCandidate?.contentHtml, readabilityText)
			: fallbackContent.fullContent
		const links = extractLinksFromDocument(documentRecord, baseUrl, allowedDomains)
		const resolvedTitle = usesReadability
			? normalizeText(readabilityCandidate?.title) || title
			: title

		const result: ParsedHtmlCrawlData = { excerpt, fullContent, links }
		if (resolvedTitle) {
			result.title = resolvedTitle
		}
		if (mainHeading) {
			result.mainHeading = mainHeading
		}

		return result
	} catch {
		return {
			excerpt: '',
			fullContent: '',
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
 * Extracts fallback excerpt and cleaned semantic content from `main`, `article`, or `body`.
 *
 * @param documentRecord - Parsed HTML document as generic object.
 * @param maxCharsPerPage - Max excerpt length.
 * @returns Fallback excerpt plus cleaned semantic content.
 */
function extractFallbackContent(
	documentRecord: UnknownRecord,
	maxCharsPerPage: number
): { excerpt: string; fullContent: string } {
	const contentRoot =
		querySelectorOneRecord(documentRecord, 'main') ??
		querySelectorOneRecord(documentRecord, 'article') ??
		asRecord(documentRecord.body)

	const excerpt = normalizeText(getNodeText(contentRoot)).slice(0, maxCharsPerPage).trim()
	const fullContent = toSemanticContent(readNodeOuterHtml(contentRoot), excerpt)
	return {
		excerpt,
		fullContent
	}
}

/**
 * Attempts to parse raw Readability output.
 *
 * @param documentRecord - Parsed document object.
 * @returns Readability title + text payload when available.
 */
function extractReadabilityCandidate(
	documentRecord: UnknownRecord
): { title?: string; text: string; contentHtml?: string } | null {
	try {
		const cloneNode = documentRecord.cloneNode
		if (typeof cloneNode !== 'function') {
			return null
		}

		const readabilityDocument = cloneNode.call(documentRecord, true)
		const article = new Readability(readabilityDocument as never).parse()
		const fullText = normalizeText(article?.textContent)
		if (!fullText) {
			return null
		}

		const title = normalizeText(article?.title)
		return {
			title: title || undefined,
			text: fullText,
			contentHtml: typeof article?.content === 'string' ? article.content : undefined
		}
	} catch {
		return null
	}
}

/**
 * Checks whether a Readability excerpt is strong enough to trust as primary evidence.
 *
 * @param excerpt - Extracted readability text.
 * @returns Whether readability output is viable.
 */
function isReadabilityExcerptViable(excerpt: string): boolean {
	if (!excerpt) {
		return false
	}

	const wordCount = excerpt.split(/\s+/).filter(Boolean).length
	return (
		excerpt.length >= CRAWLER_CONFIG.readabilityMinExcerptChars ||
		wordCount >= CRAWLER_CONFIG.readabilityMinExcerptWords
	)
}

/**
 * Builds semantic cleaned content from extracted HTML/text.
 *
 * @param rawHtml - Raw extracted HTML content.
 * @param fallbackText - Text fallback when semantic HTML is unavailable.
 * @returns Semantic cleaned page content.
 */
function toSemanticContent(rawHtml: string | null | undefined, fallbackText: string): string {
	const sanitizedHtml = sanitizeSemanticHtml(rawHtml)
	if (sanitizedHtml && /<[^>]+>/.test(sanitizedHtml)) {
		return sanitizedHtml
	}

	const normalizedText = normalizeText(sanitizedHtml || fallbackText)
	if (!normalizedText) {
		return ''
	}

	return `<p>${escapeHtml(normalizedText)}</p>`
}

/**
 * Sanitizes content HTML and keeps semantic structure with stripped attributes.
 *
 * @param rawHtml - Raw HTML.
 * @returns Semantic sanitized HTML.
 */
function sanitizeSemanticHtml(rawHtml: string | null | undefined): string {
	if (!rawHtml) {
		return ''
	}

	const allowedTags = new Set([
		'main',
		'article',
		'section',
		'h1',
		'h2',
		'h3',
		'h4',
		'h5',
		'h6',
		'p',
		'ul',
		'ol',
		'li',
		'blockquote',
		'pre',
		'code',
		'table',
		'thead',
		'tbody',
		'tr',
		'th',
		'td',
		'strong',
		'em',
		'a',
		'hr',
		'br'
	])
	let sanitized = rawHtml
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(
			/<(script|style|noscript|template|svg|canvas|iframe|form|nav|header|footer|aside)\b[^>]*>[\s\S]*?<\/\1>/gi,
			''
		)
		.replace(/<\s*(html|head|body)\b[^>]*>/gi, '')
		.replace(/<\s*\/\s*(html|head|body)\s*>/gi, '')
		.replace(/<\s*([a-z0-9:-]+)(\s[^>]*)?>/gi, (match, rawTag, attrs) => {
			const tag = String(rawTag).toLowerCase()
			if (!allowedTags.has(tag)) {
				return ''
			}

			// Keep anchor target text only; drop all attributes except href.
			if (tag === 'a') {
				const hrefMatch = String(attrs ?? '').match(/\bhref\s*=\s*(['"])(.*?)\1/i)
				const href = hrefMatch?.[2]?.trim()
				const safeHref = normalizeSemanticHref(href)
				return safeHref ? `<a href="${escapeHtmlAttribute(safeHref)}">` : '<a>'
			}

			return `<${tag}>`
		})
		.replace(/<\s*\/\s*([a-z0-9:-]+)\s*>/gi, (match, rawTag) => {
			const tag = String(rawTag).toLowerCase()
			return allowedTags.has(tag) ? `</${tag}>` : ''
		})
		.replace(/\n{3,}/g, '\n\n')
		.trim()

	// Remove empty semantic wrappers that add no information.
	sanitized = sanitized.replace(/<(article|section|p|li|blockquote|pre|code)\s*>\s*<\/\1>/gi, '')

	return sanitized.trim()
}

/**
 * Reads `outerHTML` from a node-like record.
 *
 * @param nodeRecord - Node-like object.
 * @returns Outer HTML or empty string.
 */
function readNodeOuterHtml(nodeRecord: UnknownRecord | null): string {
	if (!nodeRecord) {
		return ''
	}

	const outerHtml = nodeRecord.outerHTML
	return typeof outerHtml === 'string' ? outerHtml : ''
}

/**
 * Escapes text for HTML context.
 *
 * @param value - Raw value.
 * @returns Escaped HTML text.
 */
function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;')
}

/**
 * Escapes attribute values for HTML context.
 *
 * @param value - Raw attribute value.
 * @returns Escaped attribute text.
 */
function escapeHtmlAttribute(value: string): string {
	return escapeHtml(value)
}

/**
 * Normalizes href values retained in semantic evidence HTML.
 *
 * @param href - Raw href value.
 * @returns Safe normalized href, or null when unsupported.
 */
function normalizeSemanticHref(href: string | undefined): string | null {
	if (!href) {
		return null
	}

	const normalized = href.trim()
	if (!normalized) {
		return null
	}

	if (
		normalized.startsWith('/') ||
		normalized.startsWith('./') ||
		normalized.startsWith('../') ||
		normalized.startsWith('#')
	) {
		return normalized
	}

	const lowercase = normalized.toLowerCase()
	if (lowercase.startsWith('http://') || lowercase.startsWith('https://')) {
		return normalized
	}

	return null
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
