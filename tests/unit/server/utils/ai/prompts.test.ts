import { getAiSystemPrompt } from '~~/server/utils/ai/prompts'
import { describe, expect, it, vi } from 'vitest'

const queryCollectionMock = vi.hoisted(() => vi.fn())

vi.mock('@nuxt/content/server', () => ({
	queryCollection: queryCollectionMock
}))

function createQueryChain(result: unknown) {
	const where = vi.fn()
	const first = vi.fn().mockResolvedValue(result)

	const chain = {
		where,
		first
	}

	where.mockImplementation(() => chain)
	return chain
}

describe('server/utils/ai/prompts', () => {
	it('loads and normalizes minimark prompt content to plain text', async () => {
		const chain = createQueryChain({
			body: {
				type: 'minimark',
				value: [
					['paragraph', {}, 'Hallo ', ['strong', {}, 'wereld']],
					['list', {}, ['item', {}, 'Eerste punt'], ['item', {}, 'Tweede punt']]
				]
			}
		})
		queryCollectionMock.mockReturnValue(chain)

		const result = await getAiSystemPrompt({} as never, 'ai-website-analysis-system')

		expect(queryCollectionMock).toHaveBeenCalledWith(expect.any(Object), '_prompts')
		expect(chain.where).toHaveBeenNthCalledWith(1, 'extension', '=', 'md')
		expect(chain.where).toHaveBeenNthCalledWith(2, 'key', '=', 'ai-website-analysis-system')
		expect(chain.first).toHaveBeenCalledOnce()
		expect(result).toBe('Hallo wereld\n\nEerste punt\nTweede punt')
	})

	it('throws a typed runtime error when prompt entry is missing/invalid', async () => {
		const chain = createQueryChain({
			body: {
				type: 'not-minimark',
				value: []
			}
		})
		queryCollectionMock.mockReturnValue(chain)

		const createErrorMock = vi.fn((input: { statusCode: number; statusMessage: string }) => {
			const error = new Error(input.statusMessage) as Error & {
				statusCode?: number
				statusMessage?: string
			}
			error.statusCode = input.statusCode
			error.statusMessage = input.statusMessage
			return error
		})
		vi.stubGlobal('createError', createErrorMock)

		await expect(getAiSystemPrompt({} as never, 'ai-briefing-system')).rejects.toMatchObject({
			statusCode: 500,
			statusMessage: 'Prompt niet gevonden: ai-briefing-system'
		})
		expect(createErrorMock).toHaveBeenCalledWith({
			statusCode: 500,
			statusMessage: 'Prompt niet gevonden: ai-briefing-system'
		})
	})
})
