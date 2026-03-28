// https://nuxt.com/docs/api/configuration/nuxt-config
import type { Mode } from './shared/types/primitives'

import { fileURLToPath } from 'node:url'

import { joinURL, parseURL } from 'ufo'

import { AI_OPENAI_CONFIG } from './config/ai'
import { NUXT_BEHAVIOR_CONFIG } from './config/constants'
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
const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true'

const appModules = [
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
	'nuxt-studio'
]

const testModules = ['@pinia/nuxt', 'pinia-plugin-persistedstate/nuxt', '@vueuse/nuxt']

export default defineNuxtConfig({
	modules: isTest ? testModules : appModules,

	devtools: {
		enabled: true
	},

	imports: {
		// Auto-import pinia stores defined in `~/stores`
		dirs: ['stores']
	},

	alias: {
		'@ai': fileURLToPath(new URL('./config/ai', import.meta.url)),
		'@schema': fileURLToPath(new URL('./schema', import.meta.url)),
		'@constants': fileURLToPath(new URL('./config/constants', import.meta.url))
	},

	css: ['~/assets/css/main.css'],

	experimental: {
		inlineRouteRules: true
	},

	// image: { provider: 'none' },
	image: {
		provider: 'cloudflare',
		cloudflare: {
			// During local development, we so to fetch images from the prod server!
			baseURL: joinURL(process.env.PROD_URL ?? process.env.APP_URL!)
		}
	},

	$development: {
		routeRules: {
			'/**': { cache: false }
		}
	},

	$production: {
		routeRules: {
			'/**': { prerender: true },
			'/_prompts/**': { prerender: false },
			'/assets/**': {
				ssr: false,
				cache: false
			}
		}
	},

	routeRules: {
		'/stats': {
			redirect: {
				statusCode: 301,
				to: `https://plausible.io/${process.env.PLAUSIBLE_DOMAIN}`
			}
		}
	},

	compatibilityDate: NUXT_BEHAVIOR_CONFIG.compatibilityDate,

	components: [
		{
			path: '~/components',
			pathPrefix: false
		}
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
				'@tiptap/**'
			]
		}
	},

	nitro: {
		minify: !isDebug,
		prerender: {
			crawlLinks: true,
			failOnError: true,
			routes: [...NUXT_BEHAVIOR_CONFIG.nitroPrerenderRoutes]
		},
		preset: 'cloudflare_module',
		cloudflare: {
			deployConfig: true,
			nodeCompat: true,
			wrangler: {
				name: process.env.WORKER_NAME,
				assets: {
					directory: './.output/public/',
					binding: 'ASSETS'
				},
				observability: {
					logs: {
						enabled: true,
						head_sampling_rate: 1,
						invocation_logs: true
					}
				},
				vars: {
					// We need runtime access to this var via process.env
					STUDIO_GITHUB_CLIENT_ID: process.env.STUDIO_GITHUB_CLIENT_ID
				},
				limits: {
					cpu_ms: NUXT_BEHAVIOR_CONFIG.nitroCpuMs // Increase max cpu time to 5 min due to expensive AI requests
				},
				d1_databases: [
					{
						database_id: process.env.CLOUDFLARE_D1_DATABASE_ID,
						binding: 'DB'
					}
				],
				kv_namespaces: [
					{
						binding: 'CACHE',
						id: process.env.CLOUDFLARE_CACHE_NAMESPACE_ID
					}
				],
				r2_buckets: [
					{
						binding: 'BLOB',
						bucket_name: process.env.CLOUDFLARE_R2_BUCKET,
						jurisdiction: 'eu'
					}
				]
			}
		}
	},

	hub: {
		// We dont need DB here, since nuxthub should not provision it (Nuxt Content will do that)
		blob: {
			driver: 'cloudflare-r2',
			bucketName: process.env.CLOUDFLARE_R2_BUCKET,
			binding: 'BLOB'
		},

		cache: true
	},

	content: {
		build: {
			markdown: {
				toc: {
					searchDepth: NUXT_BEHAVIOR_CONFIG.contentTocSearchDepth
				}
			}
		}
	},

	studio: {
		route: '/studio',
		i18n: {
			defaultLocale: 'nl'
		},
		repository: {
			provider: 'github',
			owner: 'onderwijsin',
			repo: 'regional-site-menu',
			branch: 'main'
		},
		media: {
			external: true,
			prefix: '/assets'
		},
		auth: {
			github: {
				clientId: process.env.STUDIO_GITHUB_CLIENT_ID,
				clientSecret: process.env.STUDIO_GITHUB_CLIENT_SECRET
			}
		}
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
			client: isDebug
		}
	},

	runtimeConfig: {
		apiToken: process.env.API_TOKEN,
		cloudflare: {
			accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
			apiToken: process.env.CLOUDFLARE_API_TOKEN,
			cacheNamespaceId: process.env.CLOUDFLARE_CACHE_NAMESPACE_ID
		},
		datahub: {
			url: process.env.DATAHUB_URL,
			token: process.env.DATAHUB_TOKEN
		},
		openai: {
			token: process.env.OPENAI_API_KEY,
			model: process.env.OPENAI_MODEL || AI_OPENAI_CONFIG.defaultModel
		},
		public: {
			siteUrl: process.env.APP_URL,
			titleSeparator: NUXT_BEHAVIOR_CONFIG.titleSeparator,
			language: NUXT_BEHAVIOR_CONFIG.language, // prefer more explicit language codes like `en-AU` over `en`
			mode: {
				isDev,
				isProd,
				isPreview,
				isNext,
				isDebug,
				isLivePreview,
				value: process.env.MODE as Mode
			},
			tracking: {
				disabled: process.env.DISABLE_TRACKING === 'true'
			},
			contact: {
				page: NUXT_BEHAVIOR_CONFIG.publicContactPage
			}
		}
	},

	app: {
		keepalive: true,
		head: app.head
	},

	ui: {
		theme: {
			colors: ['primary', 'secondary', 'neutral', 'success', 'warning', 'error', 'info']
		},
		experimental: {
			componentDetection: true
		}
	},

	plausible: {
		domain: process.env.PLAUSIBLE_DOMAIN || parseURL(process.env.APP_URL).host,
		// https://github.com/nuxt-modules/plausible?tab=readme-ov-file#proxy-configuration
		// Proxy is broken, probably due to edge runtime
		proxy: true,
		proxyBaseEndpoint: NUXT_BEHAVIOR_CONFIG.plausibleProxyBaseEndpoint,
		ignoredHostnames: [...NUXT_BEHAVIOR_CONFIG.plausibleIgnoredHostnames],
		autoPageviews: true,
		autoOutboundTracking: true
	},

	/**
	 * Pinia persisted state plugin
	 * @link https://prazdevs.github.io/pinia-plugin-persistedstate/
	 */
	piniaPluginPersistedstate: {
		// Default storage, can be overridden per Pinia store
		storage: 'localStorage',
		debug: isDebug || isDev
	},

	site: {
		name: siteTitle,
		description: siteDescription,
		url: process.env.APP_URL,
		titleSeparator: NUXT_BEHAVIOR_CONFIG.titleSeparator,
		defaultLocale: NUXT_BEHAVIOR_CONFIG.defaultLocale, // not needed if you have @nuxtjs/i18n installed
		language: NUXT_BEHAVIOR_CONFIG.language,
		indexable: isProd,
		trailingSlash: false
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
				'Alle inhoud van de tool voor het ontwerpen, evalueren en verbeteren van websites van regionale onderwijsloket, gebundeld in één document.'
		},

		sections: [
			{
				title: 'Menukaart items',
				description:
					'De verschillende elementen die de website van een regionaal onderwijsloket zou kunnen bevatten.',
				contentCollection: 'items'
			},
			{
				title: "Extra's voor de website",
				description:
					'Handige resources, tools en content die je gratis in kunt zetten voor de website van een regionaal onderwijsloket.',
				contentCollection: 'extras'
			}
		]
	}
})
