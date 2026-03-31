# Nuxt Content Usage

This project uses Nuxt Content as the source of truth for structured app content.

## Runtime Database

- Nuxt Content uses a D1 database binding named `DB` in Cloudflare Workers.
- Server-side `queryCollection(event, ...)` calls require this binding at runtime.
- Without `DB`, server routes that query content can fail with `binding "DB" not found`.

## Runtime Asset Storage (R2)

- Nuxt Studio media uploads are configured as external assets.
- Uploaded media is stored in Cloudflare R2 via binding `BLOB`.
- `CLOUDFLARE_R2_BUCKET` must match the bound bucket in Cloudflare/Wrangler config.

## Studio Branch Flow

- Nuxt Studio commits content changes to the `content` branch.
- GitHub Actions promotes content-only updates from `content` to `main`.
- `main` is synced back into `content` after each `main` push to avoid branch drift.

## Where It Is Defined

- Collection config: [content.config.ts](../../content.config.ts)
- Shared field enums/types: [schema/fields.ts](../../schema/fields.ts)

## Collections

### `items`

Purpose:

- main menu/auditing components shown in the app

Source:

- `content/items/**`
- with `prefix: '/'` so routes are not prefixed with `/items`

Schema fields:

- `title`: display title of the menu item
- `description`: short summary for cards and report context
- `date`: ISO date (content lifecycle metadata)
- `pillar`: one of the four core pillars
- `goals`: one or more high-level goals (`Informeren`, `Activeren`, `Enthousiasmeren`)
- `scope`: relevance scope (`Regionaal`, `Bovenregionaal`, `Landelijk`)
- `priority`: importance (`Must have`, `Should have`, `Nice to have`)
- `exampleUrl?`: optional external reference URL
- `audit.description?`: optional audit question shown in auditing context

### `extras`

Purpose:

- secondary tools/resources shown in the extras section

Source:

- `content/extras/**/*.md`

Schema fields:

- `title`: resource title
- `description`: short summary
- `date`: ISO date
- `fee`: pricing indication text
- `category`: `tool | data | media`
- `link`: optional external link (`null` when absent)
- `download`: optional download link (`null` when absent)

### `faqs`

Purpose:

- editable FAQ entries shown on the help page

Source:

- `content/faqs/**.yml`

Schema fields:

- `title`: FAQ question shown in accordion trigger
- `description`: FAQ answer shown in accordion body

### `_prompts`

Purpose:

- editable system prompts for AI routes

Source:

- `content/_prompts/**/*.md`

Schema fields:

- `title`: human-readable prompt name
- `key`: canonical prompt key (`ai-briefing-system` / `ai-website-analysis-system`)
- `description?`: optional editor-facing description

Prompt body:

- the actual prompt is in markdown body (not frontmatter)
- server normalizes markdown AST to plain text before sending to the selected provider

Loader:

- [server/utils/ai/prompts.ts](../../server/utils/ai/prompts.ts)

## Query Patterns in This Project

Common patterns:

- Client:
  - `queryCollection('items').where('extension', '=', 'md').all()`
  - `queryCollection('faqs').order('stem', 'ASC').all()`
- Server:
  - `queryCollection(event, '_prompts').where('key', '=', ...).all()`

Notes:

- Most app pages use stable `useAsyncData` keys for content queries.
- Content types should remain stable because report/audit logic relies on these shapes.

## Rules of Thumb

1. Keep schema changes backward compatible unless explicitly planned.
2. Add new fields in `content.config.ts` first, then update consuming components/composables.
3. Reuse `schema/fields.ts` enums/types instead of introducing parallel string unions.
