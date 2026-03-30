// https://nuxt.com/docs/api/configuration/nuxt-config
import type { Mode } from './shared/types/primitives'

import { fileURLToPath } from 'node:url'

import { joinURL, parseURL } from 'ufo'

import { AI_OPENAI_CONFIG } from './config/ai'
import { NUXT_BEHAVIOR_CONFIG } from './config/constants'
import { app } from './config/head'
import { siteDescription, siteTitle } from './config/indentity'
import { robots } from './config/robots'

const SUPPORTED_MODES = ['dev', 'prod', 'preview'] as const

function resolveMode(value: string | undefined): Mode {
	if (!value) {
		return 'dev'
	}

	return (SUPPORTED_MODES as readonly string[]).includes(value) ? (value as Mode) : 'dev'
}

function resolveSentryEnvironment(value: Mode): 'development' | 'production' | 'preview' {
	switch (value) {
		case 'prod':
			return 'production'
		case 'preview':
			return 'preview'
		default:
			return 'development'
	}
}

// Runtime modes
const mode = resolveMode(process.env.MODE)
const sentryEnvironment = resolveSentryEnvironment(mode)
const isDebug = process.env.DEBUG === 'true'
const isProd = mode === 'prod'
const isPreview = mode === 'preview'
const isDev = mode === 'dev'
const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true'

// Resolve Turnstile keys
const turnstileSiteKey =
	process.env.TURNSTILE_SITE_KEY ?? (isDev ? '1x00000000000000000000BB' : undefined)
const turnstileSecretKey =
	process.env.TURNSTILE_SECRET_KEY ?? (isDev ? '1x0000000000000000000000000000000AA' : undefined)

const appModules = [
	'@nuxt/eslint',
	'@nuxt/ui',
	'@nuxt/image',
	'@nuxtjs/turnstile',
	'@nuxtjs/plausible',
	'@sentry/nuxt/module',
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

	sentry: {
		org: process.env.SENTRY_ORG,
		project: process.env.SENTRY_PROJECT,
		authToken: process.env.SENTRY_AUTH_TOKEN,
		sourcemaps: {
			disable: isPreview
		}
	},

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

	sourcemap: {
		client: 'hidden'
	},

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
			branch: 'content'
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

	turnstile: {
		siteKey: turnstileSiteKey
	},

	runtimeConfig: {
		apiToken: process.env.API_TOKEN,
		turnstile: {
			secretKey: turnstileSecretKey
		},
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
			model: process.env.OPENAI_MODEL || AI_OPENAI_CONFIG.defaultModel,
			models: {
				websiteAnalysis:
					process.env.OPENAI_MODEL_WEBSITE_ANALYSIS ||
					AI_OPENAI_CONFIG.defaultWebsiteAnalysisModel,
				briefing: process.env.OPENAI_MODEL_BRIEFING || AI_OPENAI_CONFIG.defaultBriefingModel
			}
		},
		public: {
			siteUrl: process.env.APP_URL,
			titleSeparator: NUXT_BEHAVIOR_CONFIG.titleSeparator,
			language: NUXT_BEHAVIOR_CONFIG.language, // prefer more explicit language codes like `en-AU` over `en`
			sentry: {
				dsn: process.env.SENTRY_DSN,
				environment: sentryEnvironment
			},
			mode: {
				isDev,
				isProd,
				isPreview,
				isDebug,
				value: mode
			},
			tracking: {
				disabled: process.env.DISABLE_TRACKING === 'true'
			},
			contact: {
				page: NUXT_BEHAVIOR_CONFIG.publicContactPage
			},
			turnstile: {
				siteKey: turnstileSiteKey
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
