# Website Crawler Utilities

This module powers the server-side crawl used by AI website analysis.

Primary entrypoint:

- [`website.ts`](../../../../server/utils/crawler/website.ts) → `crawlWebsiteForAnalysis(...)`

## Design Goals

- Edge-safe (Cloudflare Workers compatible)
- Deterministic traversal behavior
- Strict bounds on memory/time/queue growth
- Better coverage via sitemap and robots discovery
- Output shaped for AI prompt quality (bounded pages + cleaned semantic content)

## Module Responsibilities

- `website.ts`
  - orchestration (queue, batching, concurrency, caching, BFS order)
- `fetch.ts`
  - bounded fetch/read helpers with timeout + byte limits
- `html.ts`
  - HTML parsing and link/content extraction (`linkedom`)
  - optional Readability-first content extraction (`@mozilla/readability`) with fallback to
    `main/article/body`
- `sitemap.ts`
  - sitemap + robots discovery and recursive sitemap index handling (`fast-xml-parser`)
- `cache.ts`
  - configured-TTL crawl cache read/write via `useStorage` (currently 2 days)
- `url.ts`
  - normalization, allowlist checks, concurrency clamp
- `types.ts`
  - local crawler type contracts
- `records.ts`
  - generic unknown-record utilities used by parsers

## Important Invariants

- Same-domain crawling only (allowlist constrained)
- Page cap enforced (`maxPages`)
- Queue cap enforced (`maxQueuedUrls`)
- Timeout per request enforced
- Byte limits enforced for HTML/text resources
- Excerpts are truncated to configured max chars
- Readability extraction is used only when output is sufficiently strong; fallback remains available
- Full page evidence keeps cleaned semantic content (attributes/junk stripped) for AI context
- Cached results are only stored when at least one page has meaningful text

## Configuration

All crawler tuning values are centralized in:

- [`config/ai.ts`](../../../../config/ai.ts) → `CRAWLER_CONFIG`

Avoid hardcoding crawler behavior in route/controller files.
