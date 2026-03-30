import type { ButtonProps } from '@nuxt/ui'

import { Confirmation } from '#components'

export interface ConfirmDialogProps {
	title: string
	description?: string
	color?: ButtonProps['color']
	actions?: (ButtonProps & { mode?: 'confirm' | 'cancel' })[]
}

/**
 * Creates a reusable confirmation dialog launcher.
 *
 * @returns Function that opens a confirmation modal and resolves to user choice.
 */
export const useConfirmDialog = () => {
	const overlay = useOverlay()

	return (options: ConfirmDialogProps): Promise<boolean> => {
		const modal = overlay.create(Confirmation, {
			destroyOnClose: true,
			props: options
		})

		return modal.open()
	}
}
