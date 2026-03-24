import { Comment } from '#components'

export interface CommentOptions {
	initialValue: string
}

type Payload = { value: string }

export const useComment = () => {
	const overlay = useOverlay()

	return (options: CommentOptions): Promise<Payload | undefined> => {
		const slideover = overlay.create(Comment, {
			destroyOnClose: true,
			props: options,
		})

		return slideover.open()
	}
}
