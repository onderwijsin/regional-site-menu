import * as Sentry from '@sentry/nuxt'
import { sentryCloudflareNitroPlugin } from '@sentry/nuxt/module/plugins'

export default defineNitroPlugin((nitroApp) => {
	const runtimeConfig = useRuntimeConfig()
	if (!runtimeConfig.public.sentry?.enabled) {
		return
	}

	return sentryCloudflareNitroPlugin(() => ({
		dsn: runtimeConfig.public.sentry?.dsn,
		release: runtimeConfig.public.sentry?.release,
		environment: runtimeConfig.public.sentry?.environment,
		debug: runtimeConfig.public.mode.isDebug,
		sampleRate: 1.0,
		tracesSampleRate: 1.0,
		integrations: [Sentry.zodErrorsIntegration()]
	}))(nitroApp)
})
