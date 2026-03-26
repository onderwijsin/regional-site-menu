# Nuxt Content Usage

This project uses Nuxt Content as the source of truth for structured app content.

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

### `prompts`

Purpose:

- editable system prompts for AI routes

Source:

- `content/prompts/**/*.md`

Schema fields:

- `title`: human-readable prompt name
- `key`: canonical prompt key (`ai-briefing-system` / `ai-website-analysis-system`)
- `description?`: optional editor-facing description

Prompt body:

- the actual prompt is in markdown body (not frontmatter)
- server normalizes markdown AST to plain text before sending to OpenAI

Loader:

- [server/utils/ai/prompts.ts](../../server/utils/ai/prompts.ts)

## Query Patterns in This Project

Common patterns:

- Client:
  - `queryCollection('items').where('extension', '=', 'md').all()`
- Server:
  - `queryCollection(event, 'prompts').where('key', '=', ...).all()`

Notes:

- Most app pages use stable `useAsyncData` keys for content queries.
- Content types should remain stable because report/audit logic relies on these shapes.

## Rules of Thumb

1. Keep schema changes backward compatible unless explicitly planned.
2. Add new fields in `content.config.ts` first, then update consuming components/composables.
3. Reuse `schema/fields.ts` enums/types instead of introducing parallel string unions.
