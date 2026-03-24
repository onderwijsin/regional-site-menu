export default defineNuxtPlugin(() => {
	if (!import.meta.client) return

	const { isMd } = useResponsive()

	addRouteMiddleware(
		'screensize-guard',
		() => {
			if (isMd.value) return
			return navigateTo('/disclaimer')
		},
		{ global: true },
	)
})
