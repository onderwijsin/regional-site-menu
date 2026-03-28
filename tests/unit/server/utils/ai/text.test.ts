import { countWords, sanitizeAiMarkdown } from '~~/server/utils/ai/text'
import { describe, expect, it } from 'vitest'

describe('server/utils/ai/text', () => {
	it('unwraps fenced markdown and normalizes line endings', () => {
		const input = '```md\r\n## Titel\r\nTekst\r\n```'
		expect(sanitizeAiMarkdown(input)).toBe('## Titel\nTekst')
	})

	it('returns plain markdown when no fence is present', () => {
		expect(sanitizeAiMarkdown('  Hallo\nwereld  ')).toBe('Hallo\nwereld')
	})

	it('counts words while ignoring repeated whitespace', () => {
		expect(countWords(' één   twee\n\n drie ')).toBe(3)
		expect(countWords('')).toBe(0)
	})
})
