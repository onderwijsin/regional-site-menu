import { registerFonts } from '~/composables/report/fonts'
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

describe('report/fonts registerFonts', () => {
	beforeEach(() => {
		vi.unstubAllGlobals()
		vi.clearAllMocks()
	})

	it('registers all body and heading fonts in jsPDF VFS', async () => {
		installFileReaderMock([
			{ kind: 'success', result: 'data:font/ttf;base64,BODY_REGULAR' },
			{ kind: 'success', result: 'data:font/ttf;base64,BODY_BOLD' },
			{ kind: 'success', result: 'data:font/ttf;base64,BODY_ITALIC' },
			{ kind: 'success', result: 'data:font/ttf;base64,HEADING_REGULAR' },
			{ kind: 'success', result: 'data:font/ttf;base64,HEADING_BOLD' },
			{ kind: 'success', result: 'data:font/ttf;base64,HEADING_ITALIC' }
		])

		vi.stubGlobal(
			'fetch',
			vi.fn().mockImplementation(
				async () =>
					new Response('font-bytes', {
						status: 200
					})
			)
		)

		const doc = {
			addFileToVFS: vi.fn(),
			addFont: vi.fn()
		}

		await registerFonts(doc as never)

		expect(doc.addFileToVFS).toHaveBeenNthCalledWith(
			1,
			'Rijksoverheid-Regular.ttf',
			'BODY_REGULAR'
		)
		expect(doc.addFileToVFS).toHaveBeenNthCalledWith(2, 'Rijksoverheid-Bold.ttf', 'BODY_BOLD')
		expect(doc.addFileToVFS).toHaveBeenNthCalledWith(
			3,
			'Rijksoverheid-Italic.ttf',
			'BODY_ITALIC'
		)
		expect(doc.addFileToVFS).toHaveBeenNthCalledWith(
			4,
			'Rijksoverheid-Heading-Regular.ttf',
			'HEADING_REGULAR'
		)
		expect(doc.addFileToVFS).toHaveBeenNthCalledWith(
			5,
			'Rijksoverheid-Heading-Bold.ttf',
			'HEADING_BOLD'
		)
		expect(doc.addFileToVFS).toHaveBeenNthCalledWith(
			6,
			'Rijksoverheid-Heading-Italic.ttf',
			'HEADING_ITALIC'
		)

		expect(doc.addFont).toHaveBeenNthCalledWith(
			1,
			'Rijksoverheid-Regular.ttf',
			'Rijksoverheid',
			'normal'
		)
		expect(doc.addFont).toHaveBeenNthCalledWith(
			2,
			'Rijksoverheid-Bold.ttf',
			'Rijksoverheid',
			'bold'
		)
		expect(doc.addFont).toHaveBeenNthCalledWith(
			3,
			'Rijksoverheid-Italic.ttf',
			'Rijksoverheid',
			'italic'
		)
		expect(doc.addFont).toHaveBeenNthCalledWith(
			4,
			'Rijksoverheid-Heading-Regular.ttf',
			'RijksoverheidHeading',
			'normal'
		)
		expect(doc.addFont).toHaveBeenNthCalledWith(
			5,
			'Rijksoverheid-Heading-Bold.ttf',
			'RijksoverheidHeading',
			'bold'
		)
		expect(doc.addFont).toHaveBeenNthCalledWith(
			6,
			'Rijksoverheid-Heading-Italic.ttf',
			'RijksoverheidHeading',
			'italic'
		)
	})

	it('throws when a font cannot be fetched', async () => {
		installFileReaderMock([
			{ kind: 'success', result: 'data:font/ttf;base64,UNUSED' },
			{ kind: 'success', result: 'data:font/ttf;base64,UNUSED' },
			{ kind: 'success', result: 'data:font/ttf;base64,UNUSED' },
			{ kind: 'success', result: 'data:font/ttf;base64,UNUSED' },
			{ kind: 'success', result: 'data:font/ttf;base64,UNUSED' },
			{ kind: 'success', result: 'data:font/ttf;base64,UNUSED' }
		])

		vi.stubGlobal(
			'fetch',
			vi.fn((url: string) => {
				if (url === '/fonts/Rijksoverheid-regular.ttf') {
					return Promise.resolve(new Response('missing', { status: 404 }))
				}

				return Promise.resolve(new Response('font-bytes', { status: 200 }))
			})
		)

		await expect(
			registerFonts({
				addFileToVFS: vi.fn(),
				addFont: vi.fn()
			} as never)
		).rejects.toThrow('Failed to load font: /fonts/Rijksoverheid-regular.ttf')
	})

	it('throws when FileReader fails while reading a font blob', async () => {
		installFileReaderMock([
			{ kind: 'error', error: new Error('reader failed') },
			{ kind: 'success', result: 'data:font/ttf;base64,UNUSED' },
			{ kind: 'success', result: 'data:font/ttf;base64,UNUSED' },
			{ kind: 'success', result: 'data:font/ttf;base64,UNUSED' },
			{ kind: 'success', result: 'data:font/ttf;base64,UNUSED' },
			{ kind: 'success', result: 'data:font/ttf;base64,UNUSED' }
		])

		vi.stubGlobal(
			'fetch',
			vi.fn().mockImplementation(
				async () =>
					new Response('font-bytes', {
						status: 200
					})
			)
		)

		await expect(
			registerFonts({
				addFileToVFS: vi.fn(),
				addFont: vi.fn()
			} as never)
		).rejects.toBeUndefined()
	})
})
