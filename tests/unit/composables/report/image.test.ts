import { loadImageAsBase64 } from '~/composables/report/image'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type ReaderBehavior =
	| {
			kind: 'success'
			result: string
	  }
	| {
			kind: 'error'
			error: Error
	  }

function installFileReaderMock(behaviors: ReaderBehavior[]): void {
	class FileReaderMock {
		result: string | ArrayBuffer | null = null
		onload: (() => void) | null = null
		onerror: (() => void) | null = null

		readAsDataURL(blob: Blob): void {
			void blob

			const behavior = behaviors.shift()
			if (!behavior) {
				throw new Error('No FileReader behavior configured')
			}

			if (behavior.kind === 'error') {
				this.onerror?.()
				return
			}

			this.result = behavior.result
			this.onload?.()
		}
	}

	vi.stubGlobal('FileReader', FileReaderMock)
}

describe('report/image loadImageAsBase64', () => {
	beforeEach(() => {
		vi.unstubAllGlobals()
		vi.clearAllMocks()
	})

	it('returns image as data URL string', async () => {
		installFileReaderMock([{ kind: 'success', result: 'data:image/png;base64,AAAA' }])
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response('image-bytes', {
					status: 200
				})
			)
		)

		await expect(loadImageAsBase64('/static/logo.png')).resolves.toBe(
			'data:image/png;base64,AAAA'
		)
	})

	it('throws when image cannot be fetched', async () => {
		installFileReaderMock([{ kind: 'success', result: 'data:image/png;base64,UNUSED' }])
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response('not found', {
					status: 404
				})
			)
		)

		await expect(loadImageAsBase64('/static/logo.png')).rejects.toThrow(
			'Failed to load image: /static/logo.png'
		)
	})

	it('throws when FileReader fails to convert image blob', async () => {
		installFileReaderMock([{ kind: 'error', error: new Error('file reader failed') }])
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response('image-bytes', {
					status: 200
				})
			)
		)

		await expect(loadImageAsBase64('/static/logo.png')).rejects.toThrow('file reader failed')
	})
})
