import { describe, expect, it, vi } from 'vitest'

async function loadSentryCloudflarePlugin() {
	vi.resetModules()

	const zodErrorsIntegrationMock = vi.fn(() => ({ name: 'zod-errors-integration' }))
	const sentryCloudflareNitroPluginMock = vi.fn(
		(factory: () => Record<string, unknown>) => factory
	)
	const defineNitroPluginMock = vi.fn((plugin: unknown) => plugin)
	const useRuntimeConfigMock = vi.fn(() => ({
		public: {
			sentry: {
				dsn: 'https://dsn.example/123',
				release: '1.2.3',
				environment: 'production'
			},
			mode: {
				isDebug: false
			}
		}
	}))

	vi.stubGlobal('defineNitroPlugin', defineNitroPluginMock)
	vi.stubGlobal('useRuntimeConfig', useRuntimeConfigMock)
	vi.doMock('@sentry/nuxt', () => ({
		zodErrorsIntegration: zodErrorsIntegrationMock
	}))
	vi.doMock('@sentry/nuxt/module/plugins', () => ({
		sentryCloudflareNitroPlugin: sentryCloudflareNitroPluginMock
	}))

	const module = await import('~~/server/plugins/sentry-cloudflare-plugin')
	return {
		pluginFactory: module.default as () => Record<string, unknown>,
		zodErrorsIntegrationMock,
		sentryCloudflareNitroPluginMock,
		defineNitroPluginMock,
		useRuntimeConfigMock
	}
}

describe('server/plugins/sentry-cloudflare-plugin', () => {
	it('builds sentry cloudflare nitro plugin config from runtime settings', async () => {
		const {
			pluginFactory,
			zodErrorsIntegrationMock,
			sentryCloudflareNitroPluginMock,
			defineNitroPluginMock,
			useRuntimeConfigMock
		} = await loadSentryCloudflarePlugin()

		const config = pluginFactory()

		expect(defineNitroPluginMock).toHaveBeenCalledTimes(1)
		expect(sentryCloudflareNitroPluginMock).toHaveBeenCalledTimes(1)
		expect(useRuntimeConfigMock).toHaveBeenCalledTimes(1)
		expect(zodErrorsIntegrationMock).toHaveBeenCalledTimes(1)
		expect(config).toEqual({
			dsn: 'https://dsn.example/123',
			release: '1.2.3',
			environment: 'production',
			debug: false,
			sampleRate: 1,
			tracesSampleRate: 1,
			integrations: [{ name: 'zod-errors-integration' }]
		})
	})
})
