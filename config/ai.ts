/**
 * Centralized AI and crawler behavior configuration.
 *
 * Keep secrets in `runtimeConfig`; this file defines static tuning values.
 */

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
	defaultModel: 'gpt-5',
	/** Generation settings for website-analysis route. */
	analysisRequest: {
		/** Output token cap for analysis response. */
		maxOutputTokens: 12_500,
		/** Higher output cap used when first attempt ends incomplete due token budget. */
		maxOutputTokensOnIncompleteRetry: 25_000,
		/** Transport retry count for transient API failures. */
		maxRetries: 2,
		/** Reasoning depth for analysis quality and strategic recommendations. */
		reasoningEffort: 'high',
		/** Whether incomplete-retry should include explicit reasoning settings. */
		retryWithReasoningOnIncomplete: false,
		/** Reasoning effort used in incomplete-retry when enabled. */
		incompleteRetryReasoningEffort: 'medium',
		/** Output detail level for analysis quality. */
		verbosity: 'high',
		/** Verbosity used in incomplete-retry to reduce response length pressure. */
		incompleteRetryVerbosity: 'medium'
	},
	/** Generation settings for briefing route. */
	briefingRequest: {
		/** Output token cap for briefing response. */
		maxOutputTokens: 7_500,
		/** Higher output cap used when first attempt ends incomplete due token budget. */
		maxOutputTokensOnIncompleteRetry: 12_500,
		/** Transport retry count for transient API failures. */
		maxRetries: 2,
		/** Reasoning depth for briefing quality and personalization. */
		reasoningEffort: 'high',
		/** Whether incomplete-retry should include explicit reasoning settings. */
		retryWithReasoningOnIncomplete: false,
		/** Reasoning effort used in incomplete-retry when enabled. */
		incompleteRetryReasoningEffort: 'medium',
		/** Output detail level for briefing quality. */
		verbosity: 'medium',
		/** Verbosity used in incomplete-retry to reduce response length pressure. */
		incompleteRetryVerbosity: 'low'
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
 * Multiplier applied to staged AI progress timings outside development.
 */
export const NON_DEV_STAGE_DURATION_MULTIPLIER = 1.5 as const

/**
 * UI timing model for staged AI progress indicators.
 */
export const REPORT_AI_PROGRESS_CONFIG = {
	/** Fixed crawl stage baseline duration before per-page scaling. */
	crawlStageBaseDurationMs: 15_000,
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
		synthesis: 10000,
		/** Stage 3: generate briefing output. */
		generate: 5000,
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
		'/sitemap.xml',
		'/sitemap_index.xml',
		'/sitemap-index.xml',
		'/sitemaps.xml',
		'/sitemap/sitemap.xml',
		'/wp-sitemap.xml',
		'/sitemap1.xml',
		'/wp-sitemap-posts.xml',
		'/wp-sitemap-pages.xml',
		'/sitemap-main.xml',
		'/sitemap_index1.xml',
		'/sitemap/index.xml',
		'/sitemaps/index.xml',
		'/sitemap/sitemap-index.xml',
		'/post-sitemap.xml',
		'/page-sitemap.xml',
		'/category-sitemap.xml',
		'/product-sitemap.xml',
		'/sitemap_news.xml',
		'/news-sitemap.xml',
		'/image-sitemap.xml',
		'/video-sitemap.xml',
		'/sitemap.xml.gz',
		'/sitemap-index.xml.gz',
		'/sitemap/sitemap.xml.gz'
	]
} as const
