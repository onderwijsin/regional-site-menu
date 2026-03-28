import { SubmissionSchema } from '~~/schema/submission'
import { describe, expect, it } from 'vitest'

const validSubmission = {
	title: 'Nieuwe sectie',
	description: 'Korte uitleg',
	body: 'Uitgebreide toelichting',
	category: 'extra' as const,
	email: 'test@example.com',
	goals: ['Informeren'] as const,
	exampleUrl: 'https://onderwijsregio.nl'
}

describe('SubmissionSchema', () => {
	it('accepts valid payloads', () => {
		const result = SubmissionSchema.safeParse(validSubmission)
		expect(result.success).toBe(true)
	})

	it('requires at least one goal', () => {
		const result = SubmissionSchema.safeParse({
			...validSubmission,
			goals: []
		})

		expect(result.success).toBe(false)
		expect(result.error?.issues[0]?.message).toContain('Kies minstens één doel')
	})

	it('rejects invalid email and URL values', () => {
		const result = SubmissionSchema.safeParse({
			...validSubmission,
			email: 'geen-email',
			exampleUrl: 'niet-een-url'
		})

		expect(result.success).toBe(false)
		expect(result.error?.issues.map((issue) => issue.path.join('.'))).toEqual(
			expect.arrayContaining(['email', 'exampleUrl'])
		)
	})
})
