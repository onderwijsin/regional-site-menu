import { joinURL } from 'ufo'

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig(event)

	// Normal upstream (Datahub)
	const base = config.datahub.url

	// Build original Datahub target (used if we’re already on workers.dev)
	const target = joinURL(base, event.path.replace(/^\/api\/datahub\//, ''))

	return proxyRequest(event, target, {
		cookieDomainRewrite: new URL(config.public.siteUrl).hostname,
		cookiePathRewrite: '/',
	}) as Promise<Response>
})
