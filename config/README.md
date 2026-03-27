# Config Module

This directory holds static configuration and behavior constants.

## Files

- `ai.ts`
  - AI/crawler behavior tuning
  - OpenAI request defaults, retry/fallback tuning, progress timing, crawler limits
- `constants.ts`
  - non-AI app behavior constants
  - PDF tokens, async data keys, identity strings, Datahub constants, score labels
- `head.ts`
  - app head/meta configuration
- `robots.ts`
  - robots/sitemap directives
- `indentity.ts`
  - site identity values (filename intentionally kept as-is for compatibility)

## Rules

- Keep secrets in `runtimeConfig` / environment variables.
- Use this directory for static behavior defaults and limits.
- Avoid scattering behavior constants in feature files.
