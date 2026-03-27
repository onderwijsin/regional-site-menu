/**
 * Centralized behavior and tuning constants.
 *
 * Keep runtime secrets in `runtimeConfig`; this file is for static defaults,
 * limits and keys that shape app behavior.
 */

/**
 * Product identity strings shown in metadata and page headers.
 */
export const APP_IDENTITY = {
	/** Main application title shown in browser/page metadata. */
	siteTitle: 'Regiosite Menukaart',
	/** Primary SEO description used in page metadata. */
	siteDescription:
		'Ontwerp, evalueer en verbeter de webiste van je regionale onderwijsloket met een flexibele menukaart van elementen waaruit je site kan bestaan. Zet jouw ideeen eenvoudig om in een concrete rapportage die als basis kan dienen voor verdere ontwikkeling.'
} as const

/**
 * Stable keys for `useAsyncData` calls that should be shared/reused.
 */
export const ASYNC_DATA_KEYS = {
	/** Key for loading the full menu overview item list. */
	menuOverview: 'menu-overview',
	/** Key for loading left-side content navigation tree. */
	navigation: 'navigation'
} as const

/**
 * Static Nuxt behavior knobs that do not belong in runtime env vars.
 */
export const NUXT_BEHAVIOR_CONFIG = {
	/** Nuxt/Nitro compatibility date for runtime behavior. */
	compatibilityDate: '2026-01-05',
	/** Explicit prerender entry routes for static generation. */
	nitroPrerenderRoutes: ['/overview'],
	/** Max CPU budget (ms) for Cloudflare worker requests. */
	nitroCpuMs: 300000,
	/** TOC depth used by Nuxt Content markdown build step. */
	contentTocSearchDepth: 1,
	/** Separator used in generated document/page titles. */
	titleSeparator: '|',
	/** Default locale code used by site-level config. */
	defaultLocale: 'nl',
	/** Language code used in metadata/public config. */
	language: 'nl_NL',
	/** Public contact page URL used in UI config. */
	publicContactPage: 'https://www.onderwijsregio.nl/service/contact',
	/** Plausible proxy endpoint mounted by Nuxt module. */
	plausibleProxyBaseEndpoint: '/api/_plausible',
	/** Hostnames excluded from Plausible tracking. */
	plausibleIgnoredHostnames: ['localhost']
} as const

/**
 * Limits and defaults for AI website-analysis user input and crawl behavior.
 */
export const AI_WEBSITE_ANALYSIS_CONFIG = {
	/** Per-page crawl timeout in milliseconds. */
	pageTimeoutMs: 5_000,
	/** Total crawl budget in milliseconds before stopping. */
	crawlBudgetMs: 225_000,
	/** Minimum allowed page count for website analysis. */
	minPages: 1,
	/** Maximum allowed page count for website analysis. */
	maxPages: 50,
	/** Default page count when user does not provide a value. */
	defaultPages: 15
} as const

/**
 * OpenAI request defaults and safeguards used by server AI routes.
 */
export const AI_OPENAI_CONFIG = {
	/** Fallback model when runtime config model is not set. */
	defaultModel: 'gpt-4.1-mini',
	/** Generation settings for website-analysis route. */
	analysisRequest: {
		/** Lower temperature for deterministic analytical output. */
		temperature: 0.1,
		/** Output token cap for analysis response. */
		maxOutputTokens: 1800,
		/** Transport retry count for transient API failures. */
		maxRetries: 2
	},
	/** Generation settings for briefing route. */
	briefingRequest: {
		/** Slightly higher temperature for writing-oriented output. */
		temperature: 0.2,
		/** Output token cap for briefing response. */
		maxOutputTokens: 1800
	}
} as const

/**
 * Internal app routes used as source documents for AI criteria context.
 */
export const AI_REFERENCE_PATHS = {
	/** Preferred full LLM reference document endpoint. */
	llmsFull: '/llms-full.txt',
	/** Fallback condensed LLM reference document endpoint. */
	llms: '/llms.txt'
} as const

/**
 * Text normalization settings for AI response sanitation.
 */
export const AI_TEXT_SANITIZATION_CONFIG = {
	/** Regex that unwraps markdown fenced blocks returned by models. */
	codeFenceRegex: /^```(?:markdown|md)?\s*([\s\S]*?)\s*```$/i
} as const

/**
 * UI timing model for staged AI progress indicators.
 */
export const REPORT_AI_PROGRESS_CONFIG = {
	/** Crawl stage duration multiplier (ms) per requested page. */
	crawlStageDurationPerPageMs: 3_000,
	/** Fast-forward delay per skipped analysis stage on quick completion. */
	analysisFastForwardMs: 240,
	/** Fast-forward delay per skipped briefing stage on quick completion. */
	briefingFastForwardMs: 220,
	/** Fixed durations for analysis stages that are not crawl-dependent. */
	analysisStageDurationMs: {
		/** Stage 1: initialize analysis request. */
		start: 4500,
		/** Stage 3: interpret collected content. */
		interpret: 15000,
		/** Stage 4: evaluate against criteria. */
		criteria: 8000,
		/** Stage 5: finalize and format result. */
		finalize: 6000
	},
	/** Baseline durations for briefing generation stages. */
	briefingStageDurationMs: {
		/** Stage 1: initialize briefing request. */
		start: 1000,
		/** Stage 2: combine available inputs/context. */
		synthesis: 3000,
		/** Stage 3: generate briefing output. */
		generate: 2000,
		/** Stage 4: finalize and clean output. */
		finalize: 2000
	}
} as const

/**
 * Core crawler tuning values for edge-safe crawling.
 */
export const CRAWLER_CONFIG = {
	/** Default page fetch timeout when not explicitly provided. */
	defaultTimeoutMs: 5_000,
	/** Maximum excerpt length captured per crawled page. */
	defaultMaxCharsPerPage: 2_500,
	/** Upper bound for queued URLs waiting to be crawled. */
	defaultMaxQueuedUrls: 500,
	/** Default worker fetch concurrency for crawl/page requests. */
	defaultMaxConcurrency: 3,
	/** Byte limit for single HTML response body reads. */
	defaultMaxHtmlBytes: 1_500_000,
	/** Byte limit for xml/txt resource reads (sitemap/robots). */
	defaultMaxTextDocumentBytes: 500_000,
	/** Hard maximum concurrency allowed regardless of input. */
	maxConcurrency: 5,
	/** Cap for collected URLs from sitemap discovery. */
	maxSitemapUrls: 200,
	/** Cap for sitemap documents fetched recursively. */
	maxSitemapDocuments: 60,
	/** Standard robots file path used for sitemap declarations. */
	robotsPath: '/robots.txt',
	/** Unstorage namespace used for crawl result caching. */
	cacheNamespace: 'cache',
	/** Prefix used when building deterministic crawl cache keys. */
	cacheKeyPrefix: 'ai:crawl:v3',
	/** Cache retention time for crawl results (31 days). */
	cacheTtlMs: 31 * 24 * 60 * 60 * 1000,
	/** Candidate sitemap locations to probe on each domain. */
	sitemapPaths: [
		/** Standard root sitemap. */
		'/sitemap.xml',
		/** Common underscore sitemap index naming. */
		'/sitemap_index.xml',
		/** Common dash sitemap index naming. */
		'/sitemap-index.xml',
		/** Generic plural sitemap root. */
		'/sitemaps.xml',
		/** Nested sitemap folder variant. */
		'/sitemap/sitemap.xml',
		/** WordPress default sitemap endpoint. */
		'/wp-sitemap.xml',
		/** Legacy numeric sitemap filename variant. */
		'/sitemap1.xml',
		/** WordPress posts sitemap split file. */
		'/wp-sitemap-posts.xml',
		/** WordPress pages sitemap split file. */
		'/wp-sitemap-pages.xml',
		/** Alternate main sitemap naming. */
		'/sitemap-main.xml',
		/** Alternate indexed sitemap naming with suffix. */
		'/sitemap_index1.xml',
		/** Nested index file variant. */
		'/sitemap/index.xml',
		/** Nested plural index file variant. */
		'/sitemaps/index.xml',
		/** Nested dash index variant. */
		'/sitemap/sitemap-index.xml',
		/** Section-specific post sitemap variant. */
		'/post-sitemap.xml',
		/** Section-specific page sitemap variant. */
		'/page-sitemap.xml',
		/** Section-specific category sitemap variant. */
		'/category-sitemap.xml',
		/** Section-specific product sitemap variant. */
		'/product-sitemap.xml',
		/** News sitemap underscore variant. */
		'/sitemap_news.xml',
		/** News sitemap dash variant. */
		'/news-sitemap.xml',
		/** Image sitemap variant. */
		'/image-sitemap.xml',
		/** Video sitemap variant. */
		'/video-sitemap.xml',
		/** Compressed root sitemap file. */
		'/sitemap.xml.gz',
		/** Compressed sitemap index file. */
		'/sitemap-index.xml.gz',
		/** Compressed nested sitemap file. */
		'/sitemap/sitemap.xml.gz'
	]
} as const

/**
 * PDF renderer-specific paddings and page margins.
 */
export const PDF_RENDER_CONFIG = {
	/** Top margin used when markdown rendering creates a new page. */
	markdownPageMarginTop: 18,
	/** Bottom page threshold for markdown pagination checks. */
	markdownPageMarginBottom: 18,
	/** Gap between AI intro text and markdown body. */
	aiMarkdownTopPadding: 10
} as const

/**
 * Global PDF document geometry values (millimeters).
 */
export const PDF_LAYOUT_CONFIG: {
	/** A4 width in millimeters. */
	pageWidth: number
	/** A4 height in millimeters. */
	pageHeight: number
	/** Top page margin. */
	marginTop: number
	/** Right page margin. */
	marginRight: number
	/** Bottom page margin. */
	marginBottom: number
	/** Left page margin. */
	marginLeft: number
	/** Default line-height multiplier in PDF text flows. */
	lineHeight: number
	/** Vertical gap between major sections. */
	sectionGap: number
	/** Default vertical gap between local content blocks. */
	blockGap: number
	/** Inner padding used in card-like PDF blocks. */
	cardPadding: number
	/** Vertical spacing between repeated cards. */
	cardGap: number
	/** Corner radius for rounded PDF block shapes. */
	borderRadius: number
} = {
	pageWidth: 210,
	pageHeight: 297,
	marginTop: 18,
	marginRight: 16,
	marginBottom: 18,
	marginLeft: 16,
	lineHeight: 5.2,
	sectionGap: 8,
	blockGap: 4,
	cardPadding: 5,
	cardGap: 4,
	borderRadius: 2
}

/**
 * Shared PDF color palette used by report rendering primitives.
 */
export const PDF_COLORS_CONFIG = {
	/** Default text color. */
	text: [17, 17, 17],
	/** Muted text color for helper/meta copy. */
	muted: [107, 114, 128],
	/** Brand primary accent color. */
	primary: [169, 0, 97],
	/** Brand secondary accent color. */
	secondary: [0, 123, 199],
	/** Heading color for section titles and titles. */
	heading: [44, 36, 97],
	/** Positive/success semantic color. */
	success: [22, 163, 74],
	/** Warning semantic color. */
	warning: [245, 158, 11],
	/** Error semantic color. */
	error: [220, 38, 38],
	/** Neutral border line color. */
	border: [229, 231, 235],
	/** Very light neutral surface color. */
	soft: [249, 250, 251],
	/** Background color for comment blocks. */
	commentBg: [248, 250, 252],
	/** Background fill color used on cover page. */
	coverBg: [240, 247, 253]
} as const

/**
 * Markdown layout spacing tokens shared by measurement and rendering.
 */
export const PDF_MARKDOWN_LAYOUT_CONFIG = {
	/** Vertical gap after paragraph blocks. */
	paragraphBottom: 1.5,
	/** Vertical gap after heading blocks. */
	headingBottom: 1.5,
	/** Vertical gap after individual list items. */
	listItemBottom: 1,
	/** Top inset for blockquote content. */
	blockquoteTop: 1,
	/** Bottom inset for blockquote blocks. */
	blockquoteBottom: 1,
	/** Vertical spacing consumed by horizontal rule blocks. */
	horizontalRuleBottom: 10
} as const

/**
 * Default values used to prefill suggestion submission form fields.
 */
export const SUGGESTION_FORM_CONFIG = {
	/** Placeholder markdown body shown to users in suggestion editor. */
	defaultBody: `
## Waarom is dit belangrijk

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore
et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
aliquip ex ea commodo consequat.

## Tips bij het implementeren

- Lorem ipsum dolor sit amet
- Lorem ipsum dolor sit amet
- Lorem ipsum dolor sit amet

## Goede voorbeelden

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore
et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
aliquip ex ea commodo consequat.
`
} as const

/**
 * Fixed payload/query values for Datahub submission endpoint calls.
 */
export const DATAHUB_CONFIG = {
	/** Path segments appended to base Datahub URL for submissions. */
	submissionPathSegments: ['items', 'submissions'],
	/** Datahub form type identifier expected by downstream service. */
	submissionFormType: 'sitemenu_submission',
	/** Response fields requested from Datahub after submission. */
	responseFields: ['id']
} as const

/**
 * Labels shown for each integer audit score.
 */
export const AUDIT_SCORE_LABELS = {
	/** Label for score 1. */
	1: 'Zeer slecht (1/10)',
	/** Label for score 2. */
	2: 'Zeer slecht (2/10)',
	/** Label for score 3. */
	3: 'Slecht (3/10)',
	/** Label for score 4. */
	4: 'Slecht (4/10)',
	/** Label for score 5. */
	5: 'Matig (5/10)',
	/** Label for score 6. */
	6: 'Voldoende (6/10)',
	/** Label for score 7. */
	7: 'Goed (7/10)',
	/** Label for score 8. */
	8: 'Zeer goed (8/10)',
	/** Label for score 9. */
	9: 'Uitstekend (9/10)',
	/** Label for score 10. */
	10: 'Perfect (10/10)'
} as const
