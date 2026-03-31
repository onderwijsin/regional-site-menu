export type CrawlWebsiteArgs = {
	startUrl: string
	allowedDomains: string[]
	maxPages: number
	maxCharsPerPage?: number
	maxQueuedUrls?: number
	timeoutMs?: number
	maxConcurrency?: number
	maxHtmlBytes?: number
	crawlBudgetMs?: number
}

export type ParsedHtmlCrawlData = {
	title?: string
	mainHeading?: string
	excerpt: string
	fullContent: string
	links: string[]
}

export type SitemapDocumentEntries = {
	pageUrls: string[]
	nestedSitemaps: string[]
}

export type CrawledWebsitePage = {
	url: string
	title?: string
	mainHeading?: string
	excerpt: string
	fullContent: string
}

export type CrawlCacheEntry = {
	expiresAt: number
	pages: CrawledWebsitePage[]
}

export type CrawlCacheKeyArgs = {
	startUrl: string
	allowedDomains: string[]
	maxPages: number
	maxCharsPerPage: number
	maxQueuedUrls: number
	timeoutMs: number
	maxConcurrency: number
	maxHtmlBytes: number
	crawlBudgetMs: number
}

export type UnknownRecord = Record<string, unknown>
