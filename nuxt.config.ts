// https://nuxt.com/docs/api/configuration/nuxt-config
import type { Mode } from './shared/types/primitives'

import { fileURLToPath } from 'node:url'

import { parseURL } from 'ufo'

import { app } from './config/head'
import { siteDescription, siteTitle } from './config/indentity'
import { robots } from './config/robots'

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

	alias: {
		'@schema': fileURLToPath(new URL('./schema', import.meta.url)),
	},

	css: ['~/assets/css/main.css'],

	experimental: {
		inlineRouteRules: true,
	},

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

	routeRules: {
		'/stats': {
			redirect: {
				statusCode: 301,
				to: `https://plausible.io/${process.env.PLAUSIBLE_DOMAIN}`,
			},
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
				'zod',
				'jspdf',
				'@tiptap/core',
				'@tiptap/starter-kit',
				'@tiptap/markdown',
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
		/**
		 * There is a weird error in local development if we define the cache driver, where the binding is undefined
		 * We can only resolve the issue by adding the binding in a wrangler.json file, which we don't want to add
		 * specifically for this issue.
		 *
		 * Adding the binding to nitro.cloudflare.wrangler doesnt help, because that config does nothing in local dev.
		 *
		 * `Cache write error. [unstorage] [cloudflare] Invalid binding CACHE: undefined`
		 */
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
		datahub: {
			url: process.env.DATAHUB_URL,
			token: process.env.DATAHUB_TOKEN,
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
			contact: {
				page: 'https://www.onderwijsregio.nl/service/contact',
			},
		},
	},

	app: {
		keepalive: true,
		head: app.head,
	},

	ui: {
		theme: {
			colors: ['primary', 'secondary', 'neutral', 'success', 'warning', 'error', 'info'],
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
		indexable: isProd,
		trailingSlash: false,
	},

	robots,

	llms: {
		domain: process.env.APP_URL,
		title: siteTitle,
		description:
			"Een interactieve tool en gids voor het ontwerpen, evalueren en verbeteren van websites van regionale onderwijsloket. Het doel van de tool is om regionale onderwijsloketten nóg beter in de behoefte van hun doelgroepen te laten voorzien. De tool biedt regio's inspiratie en handige voorbeelden, concrete auditing tools en instrumenten om rapportages en breifing te genereren. De kern van de tool is de menukaart: deze biedt een overzicht van alle verschillende elementen die de website van een regionaal onderwijsloket zou moeten bevatten.",
		full: {
			title: 'Volledige documentatie',
			description:
				'Alle inhoud van de tool voor het ontwerpen, evalueren en verbeteren van websites van regionale onderwijsloket, gebundeld in één document.',
		},

		sections: [
			{
				title: 'Menukaart items',
				description:
					'De verschillende elementen die de website van een regionaal onderwijsloket zou kunnen bevatten.',
				contentCollection: 'items',
			},
			{
				title: "Extra's voor de website",
				description:
					'Handige resources, tools en content die je gratis in kunt zetten voor de website van een regionaal onderwijsloket.',
				contentCollection: 'extras',
			},
		],
	},
})
