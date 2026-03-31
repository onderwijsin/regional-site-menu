import * as Sentry from '@sentry/nuxt'

const runtimeConfig = useRuntimeConfig()

if (runtimeConfig.public.sentry?.enabled) {
	Sentry.init({
		dsn: runtimeConfig.public.sentry?.dsn,
		release: runtimeConfig.public.sentry?.release,
		environment: runtimeConfig.public.sentry?.environment,
		debug: runtimeConfig.public.mode.isDebug,
		sampleRate: 1.0,
		sendDefaultPii: true,
		enhanceFetchErrorMessages: 'report-only',
		integrations: [
			Sentry.replayIntegration(),
			Sentry.zodErrorsIntegration(),
			Sentry.httpClientIntegration()
		],
		tracesSampleRate: 1.0,
		replaysSessionSampleRate: 0.2,
		replaysOnErrorSampleRate: 1.0
	})
}
