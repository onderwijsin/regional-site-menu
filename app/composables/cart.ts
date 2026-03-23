import { Cart } from '#components'

type CartProps = {
	title?: string
	description?: string
}

export const useCart = (props?: CartProps) => {
	const overlay = useOverlay()

	const slideover = overlay.create(Cart, {
		props,
	})

	function openCart() {
		slideover.open()
	}

	function closeCart() {
		slideover.close()
	}

	return {
		openCart,
		closeCart,
	}
}
