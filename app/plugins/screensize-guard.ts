export default defineNuxtPlugin(() => {
	if (!import.meta.client) return

	const { isMd } = useResponsive()

	addRouteMiddleware(
		'screensize-guard',
		(to) => {
			if (to.path === '/disclaimer') return
			if (isMd.value) return
			return navigateTo('/disclaimer')
		},
		{ global: true }
	)
})
