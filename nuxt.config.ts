// https://nuxt.com/docs/api/configuration/nuxt-config
import type { Mode } from './shared/types/primitives'

import { parseURL } from 'ufo'

const isDebug = process.env.DEBUG === 'true'
const isProd = process.env.MODE === 'prod'
const isPreview =
	process.env.MODE === 'preview' ||
	process.env.MODE === 'next' ||
	process.env.MODE === 'live-preview'
const isDev = process.env.MODE === 'dev'
const isNext = process.env.MODE === 'next'
const isLivePreview = process.env.MODE === 'live-preview'

export default defineNuxtConfig({
	modules: [
		'@nuxt/eslint',
		'@nuxt/ui',
		'@nuxt/image',
		'@nuxtjs/plausible',
		'@pinia/nuxt',
		'pinia-plugin-persistedstate/nuxt',
		'@vueuse/nuxt',
		'@nuxthub/core',
	],

	devtools: {
		enabled: true,
	},

	css: ['~/assets/css/main.css'],

	routeRules: {
		'/': { prerender: true },
	},

	$development: {
		routeRules: {
			'/**': { cache: false },
		},
	},

	compatibilityDate: '2025-01-15',

	components: [
		{
			path: '~/components',
			pathPrefix: false,
		},
	],

	vite: {
		optimizeDeps: {
			include: ['@plausible-analytics/tracker', '@vue/devtools-core', '@vue/devtools-kit'],
		},
	},

	nitro: {
		minify: !isDebug,
		prerender: {
			crawlLinks: false,
			failOnError: true,
			concurrency: 10,
		},
		preset: 'cloudflare_module',
		cloudflare: {
			deployConfig: true,
			nodeCompat: true,
		},
	},

	hub: {
		cache: {
			driver: 'cloudflare-kv-binding',
			namespaceId: process.env.CLOUDFLARE_CACHE_NAMESPACE_ID,
		},
	},

	debug: {
		nitro: isDebug,
		hydration: isDebug || isDev || isPreview,
		watchers: isDebug || isDev,
		router: isDebug,
		templates: isDebug,
		modules: isDebug,
		hooks: {
			server: isDebug,
			client: isDebug,
		},
	},

	runtimeConfig: {
		apiToken: process.env.API_TOKEN,
		cloudflare: {
			accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
			apiToken: process.env.CLOUDFLARE_API_TOKEN,
			cacheNamespaceId: process.env.CLOUDFLARE_CACHE_NAMESPACE_ID,
		},
		github: {
			org: process.env.GH_ORG,
			repo: process.env.GH_REPO,
		},
		public: {
			siteUrl: process.env.APP_URL,
			titleSeparator: '|',
			language: 'nl_NL', // prefer more explicit language codes like `en-AU` over `en`
			mode: {
				isDev,
				isProd,
				isPreview,
				isNext,
				isDebug,
				isLivePreview,
				value: process.env.MODE as Mode,
			},
			tracking: {
				disabled: process.env.DISABLE_TRACKING === 'true',
			},
		},
	},

	app: {
		keepalive: !isDev,
		head: {
			htmlAttrs: {
				lang: 'nl',
			},
			meta: [
				{ charset: 'utf-8' },
				{
					name: 'viewport',
					content:
						'width=device-width, initial-scale=1, minimum-scale=1.0, maximum-scale=5.0, viewport-fit=cover',
				},
				{ name: 'format-detection', content: 'telephone=no' },
				{ name: 'mobile-web-app-capable', content: 'yes' },
				{ name: 'apple-mobile-web-app-capable', content: 'yes' },
				{ name: 'apple-mobile-web-app-title', content: 'Regiosite Menukaart' },
				{ name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
			],
			noscript: [
				{
					innerHTML:
						'Je hebt Javascript nodig om deze website te kunnen gebruiken. Pas je browserinstellingen in om verder te gaan!',
				},
			],
			link: [
				{
					rel: 'icon',
					type: 'image/ico',
					href: '/favicon.ico',
				},
			],
		},
	},

	ui: {
		theme: {
			colors: ['primary', 'secondary', 'neutral', 'info', 'warning', 'error', 'success'],
		},
		experimental: {
			componentDetection: true,
		},
	},

	plausible: {
		domain: process.env.PLAUSIBLE_DOMAIN || parseURL(process.env.APP_URL).host,
		// https://github.com/nuxt-modules/plausible?tab=readme-ov-file#proxy-configuration
		// Proxy is broken, probably due to edge runtime
		proxy: true,
		proxyBaseEndpoint: '/api/_plausible',
		ignoredHostnames: ['localhost'],
		autoPageviews: true,
		autoOutboundTracking: true,
	},

	/**
	 * Pinia persisted state plugin
	 * @link https://prazdevs.github.io/pinia-plugin-persistedstate/
	 */
	piniaPluginPersistedstate: {
		// Default storage, can be overridden per Pinia store
		storage: 'localStorage',
		debug: isDebug || isDev,
	},
})
