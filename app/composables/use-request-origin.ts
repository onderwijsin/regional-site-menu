/**
 * Resolves the current application origin at runtime.
 *
 * Client-side rendering uses the browser location. Server-side rendering
 * uses the incoming request URL. When neither is available, configured
 * site URL is used as fallback.
 *
 * @returns Absolute origin URL.
 */
export const useRequestOrigin = (): string => {
	const runtimeConfig = useRuntimeConfig()

	if (import.meta.client && typeof window !== 'undefined' && window.location.origin) {
		return window.location.origin
	}

	return useRequestURL().origin || runtimeConfig.public.siteUrl || ''
}
