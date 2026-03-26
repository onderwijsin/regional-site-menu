const CODE_FENCE_REGEX = /^```(?:markdown|md)?\s*([\s\S]*?)\s*```$/i

/**
 * Normalizes AI markdown output into a clean plain markdown string.
 *
 * @param value - Raw model output.
 * @returns Sanitized markdown.
 */
export function sanitizeAiMarkdown(value: string): string {
	const normalized = value.replace(/\r\n/g, '\n').trim()
	const match = normalized.match(CODE_FENCE_REGEX)

	if (match?.[1]) {
		return match[1].trim()
	}

	return normalized
}

/**
 * Counts words in a text string.
 *
 * @param value - Source text.
 * @returns Word count.
 */
export function countWords(value: string): number {
	return value.split(/\s+/).filter(Boolean).length
}
