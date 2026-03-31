# Config Module

This directory holds static configuration and behavior constants.

## Files

- `ai.ts`
  - provider-agnostic AI/crawler behavior tuning
  - route request settings, progress timing, crawler limits, text sanitization
- `ai-providers.ts`
  - provider-specific registry (OpenAI, Mistral)
  - default model per provider, runtime token/model readers, model factory setup
- `constants.ts`
  - non-AI app behavior constants
  - PDF tokens, async data keys, identity strings, Datahub constants, score labels
- `head.ts`
  - app head/meta configuration
- `robots.ts`
  - robots/sitemap directives
- `identity.ts`
  - site identity values

## Rules

- Keep secrets in `runtimeConfig` / environment variables.
- Use this directory for static behavior defaults and limits.
- Avoid scattering behavior constants in feature files.
- Keep provider-specific settings in `ai-providers.ts`.
- Keep provider-agnostic settings in `ai.ts`.
