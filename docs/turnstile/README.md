# Turnstile Integration

This project uses [`@nuxtjs/turnstile`](https://github.com/nuxt-modules/turnstile) to protect public
server routes from abuse.

## Scope

Turnstile protection is enforced on:

- `POST /api/datahub/submission` (`suggestion_submission`)
- `POST /api/ai/briefing` (`ai_briefing`)
- `POST /api/ai/website-analysis` (`ai_website_analysis`)

Validation is handled centrally via:

- [`assertTurnstileToken`](../../server/utils/security/turnstile.ts)

## Environment Variables

Required in all non-test environments:

- `TURNSTILE_SITE_KEY` (public key rendered in browser)
- `TURNSTILE_SECRET_KEY` (server validation secret)

Also relevant:

- `API_TOKEN` (master token used for admin bypass)

For local setup, use `.example.env` as template.

## Client Pattern

Client usage is intentionally simple and shared through:

- [`useTurnstile`](../../app/composables/turnstile.ts)

Forms bind `<NuxtTurnstile v-model="token" />` and then:

1. optionally show a warning hint when token is not ready yet
2. call `getTokenWithRetry()`
3. abort + show error hint if token is still missing
4. send token in header `x-turnstile-token`
5. reset widget only after submit finishes

## Server Pattern

Server routes call `assertTurnstileToken(event, expectedAction)` at route entry.

Behavior:

1. Admin bypass is checked first.
2. If bypass does not apply, `x-turnstile-token` is required.
3. Token is validated with Cloudflare.
4. Optional action mismatch is rejected (`403`).

## Admin Bypass

For trusted server-to-server testing, Turnstile validation is bypassed when one of these matches
`runtimeConfig().apiToken`:

- `x-admin-token: <API_TOKEN>`
- `Authorization: Bearer <API_TOKEN>`

Implementation:

- [`isAdmin`](../../server/utils/security/admin.ts)

## Constants

Security-related header names are centralized in:

- [`SECURITY_HEADERS`](../../config/constants.ts)

Current values:

- `SECURITY_HEADERS.turnstileToken = "x-turnstile-token"`
- `SECURITY_HEADERS.adminToken = "x-admin-token"`

## Tests

Keep these test suites in sync with any Turnstile-related changes:

- [`tests/unit/server/utils/security/admin.test.ts`](../../tests/unit/server/utils/security/admin.test.ts)
- [`tests/unit/server/utils/security/turnstile.test.ts`](../../tests/unit/server/utils/security/turnstile.test.ts)
- [`tests/nuxt/composables/turnstile.test.ts`](../../tests/nuxt/composables/turnstile.test.ts)
- [`tests/nuxt/composables/report-generation-execution.test.ts`](../../tests/nuxt/composables/report-generation-execution.test.ts)

Related:

- [Route Guard](../route-guard/README.md)
