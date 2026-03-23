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

const siteTitle = 'Regiosite Menukaart'
const siteDescription =
	'Ontwerp, evalueer en verbeter regiosites voor onderwijs met een flexibele menukaart van onderdelen. Stel eenvoudig een concrete briefing samen voor verdere ontwikkeling.'

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
		'nuxt-site-config',
		'@nuxtjs/robots',
		'@nuxt/content',
		'nuxt-llms',
	],

	devtools: {
		enabled: true,
	},

	imports: {
		// Auto-import pinia stores defined in `~/stores`
		dirs: ['stores'],
	},

	css: ['~/assets/css/main.css'],

	$development: {
		routeRules: {
			'/**': { cache: false },
		},
	},

	$production: {
		routeRules: {
			'/**': { prerender: true },
		},
	},

	compatibilityDate: '2026-01-05',

	components: [
		{
			path: '~/components',
			pathPrefix: false,
		},
	],

	vite: {
		optimizeDeps: {
			include: [
				'@plausible-analytics/tracker',
				'@vue/devtools-core',
				'@vue/devtools-kit',
				'fuse.js',
				'@vueuse/integrations/useFuse',
			],
		},
	},

	nitro: {
		minify: !isDebug,
		prerender: {
			crawlLinks: true,
			failOnError: true,
			routes: ['/overview'],
		},
		preset: 'cloudflare_module',
		cloudflare: {
			deployConfig: true,
			nodeCompat: true,
			wrangler: {
				name: process.env.WORKER_NAME,

				assets: {
					directory: './.output/public/',
					binding: 'ASSETS',
				},
				observability: {
					logs: {
						enabled: true,
						head_sampling_rate: 1,
						invocation_logs: true,
					},
				},
			},
		},
	},

	hub: {
		cache: !isDev
			? {
					driver: 'cloudflare-kv-binding',
					namespaceId: process.env.CLOUDFLARE_CACHE_NAMESPACE_ID,
				}
			: false,
	},

	content: {
		build: {
			markdown: {
				toc: {
					searchDepth: 1,
				},
			},
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
		keepalive: true,
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
			colors: ['primary', 'secondary', 'neutral'],
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

	site: {
		name: siteTitle,
		description: siteDescription,
		url: process.env.APP_URL,
		titleSeparator: '|',
		defaultLocale: 'nl', // not needed if you have @nuxtjs/i18n installed
		language: 'nl_NL',
		indexable: false,
		trailingSlash: false,
	},

	llms: {
		domain: process.env.APP_URL,
		title: siteTitle,
		description: siteDescription,
		full: {
			title: `${siteTitle} - Full Documentation`,
			description: `${siteDescription} - Full documentation of the application`,
		},
	},
})
