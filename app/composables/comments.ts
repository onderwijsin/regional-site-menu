import { Comment } from '#components'

export interface CommentOptions {
	initialValue: string
}

type Payload = { value: string }

/**
 * Creates an overlay opener for inline comment editing.
 *
 * @returns Function that opens the comment overlay and resolves with submitted payload.
 */
export const useComment = () => {
	const overlay = useOverlay()

	return (options: CommentOptions): Promise<Payload | undefined> => {
		const slideover = overlay.create(Comment, {
			destroyOnClose: true,
			props: options
		})

		return slideover.open()
	}
}
