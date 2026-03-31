import { describe, expect, it, vi } from 'vitest'

async function loadCollectionRoute(modulePath: string, event: Record<string, unknown> = {}) {
	vi.resetModules()

	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)

	const allMock = vi.fn().mockResolvedValue([{ id: 'item-1' }])
	const whereMock = vi.fn().mockReturnValue({ all: allMock })
	const queryCollectionMock = vi.fn().mockReturnValue({ where: whereMock })

	vi.doMock('@nuxt/content/server', () => ({
		queryCollection: queryCollectionMock
	}))

	const module = await import(modulePath)
	return {
		handler: module.default as (_input: unknown) => Promise<unknown>,
		event,
		queryCollectionMock,
		whereMock,
		allMock
	}
}

describe('server/api content collection handlers', () => {
	it('queries markdown prompts from _prompts collection', async () => {
		const { handler, event, queryCollectionMock, whereMock, allMock } =
			await loadCollectionRoute('~~/server/api/_prompts.get')

		await expect(handler(event)).resolves.toEqual([{ id: 'item-1' }])
		expect(queryCollectionMock).toHaveBeenCalledWith(event, '_prompts')
		expect(whereMock).toHaveBeenCalledWith('extension', '=', 'md')
		expect(allMock).toHaveBeenCalledTimes(1)
	})

	it('queries markdown items from items collection', async () => {
		const { handler, event, queryCollectionMock, whereMock, allMock } =
			await loadCollectionRoute('~~/server/api/content.get')

		await expect(handler(event)).resolves.toEqual([{ id: 'item-1' }])
		expect(queryCollectionMock).toHaveBeenCalledWith(event, 'items')
		expect(whereMock).toHaveBeenCalledWith('extension', '=', 'md')
		expect(allMock).toHaveBeenCalledTimes(1)
	})

	it('queries markdown extras from extras collection', async () => {
		const { handler, event, queryCollectionMock, whereMock, allMock } =
			await loadCollectionRoute('~~/server/api/extras.get')

		await expect(handler(event)).resolves.toEqual([{ id: 'item-1' }])
		expect(queryCollectionMock).toHaveBeenCalledWith(event, 'extras')
		expect(whereMock).toHaveBeenCalledWith('extension', '=', 'md')
		expect(allMock).toHaveBeenCalledTimes(1)
	})
})
