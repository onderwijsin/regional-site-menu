// https://nuxt.com/docs/api/configuration/nuxt-config
import type { Mode } from './shared/types/primitives'

import { constants } from 'node:fs'
import { access, copyFile, mkdir, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { joinURL, parseURL } from 'ufo'

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

const AI_REFERENCE_SNAPSHOTS = [
	{
		source: 'llms-full.txt',
		target: 'ai-reference/llms-full.static.txt',
	},
	{
		source: 'llms.txt',
		target: 'ai-reference/llms.static.txt',
	},
]

async function assertReadableNonEmpty(filePath: string): Promise<void> {
	await access(filePath, constants.R_OK)
	const fileStat = await stat(filePath)
	if (fileStat.size <= 0) {
		throw new Error(`Bestand is leeg: ${filePath}`)
	}
}

async function createAiReferenceSnapshots(publicDir: string): Promise<void> {
	for (const snapshot of AI_REFERENCE_SNAPSHOTS) {
		const sourcePath = resolve(publicDir, snapshot.source)
		const targetPath = resolve(publicDir, snapshot.target)

		await assertReadableNonEmpty(sourcePath)
		await mkdir(dirname(targetPath), { recursive: true })
		await copyFile(sourcePath, targetPath)
	}
}

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
		'nuxt-studio',
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

	image: { provider: 'none' },

	$development: {
		routeRules: {
			'/**': { cache: false },
		},
	},

	$production: {
		routeRules: {
			'/**': { prerender: true },
			'/images/**': {
				ssr: false,
				cache: false,
			},
		},

		image: {
			provider: 'cloudflare',
			cloudflare: {
				baseURL: joinURL(process.env.APP_URL!),
			},
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

	hooks: {
		'nitro:init': (nitro) => {
			nitro.hooks.hook('prerender:done', async () => {
				await createAiReferenceSnapshots(nitro.options.output.publicDir)
			})
		},
	},

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
				'@tiptap/**',
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
				vars: {
					// We need runtime access to this var via process.env
					STUDIO_GITHUB_CLIENT_ID: process.env.STUDIO_GITHUB_CLIENT_ID,
				},
				limits: {
					cpu_ms: 300000, // Increase max cpu time to 5 min due to expensive AI requests
				},
				d1_databases: [
					{
						database_id: process.env.CLOUDFLARE_D1_DATABASE_ID,
						binding: 'DB',
					},
				],
				kv_namespaces: [
					{
						binding: 'CACHE',
						id: process.env.CLOUDFLARE_CACHE_NAMESPACE_ID,
					},
				],
				r2_buckets: [
					{
						binding: 'BLOB',
						bucket_name: process.env.CLOUDFLARE_R2_BUCKET,
						jurisdiction: 'eu',
					},
				],
			},
		},
	},

	hub: {
		// We dont need DB here, since nuxthub should not provision it (Nuxt Content will do that)
		blob: {
			driver: 'cloudflare-r2',
			bucketName: process.env.CLOUDFLARE_R2_BUCKET,
		},

		cache: true,
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

	studio: {
		route: '/studio',
		i18n: {
			defaultLocale: 'nl',
		},
		repository: {
			provider: 'github',
			owner: 'onderwijsin',
			repo: 'regional-site-menu',
			branch: 'main',
		},
		media: {
			external: true,
		},
		auth: {
			github: {
				clientId: process.env.STUDIO_GITHUB_CLIENT_ID,
				clientSecret: process.env.STUDIO_GITHUB_CLIENT_SECRET,
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
		openai: {
			token: process.env.OPENAI_API_KEY,
			model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
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
