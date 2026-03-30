# Route Guard

This project has a custom Nitro middleware that protects selected high-impact `POST` API routes from
cross-site abuse.

Implementation entrypoint:

- [`server/middleware/route-guard.ts`](../../server/middleware/route-guard.ts)

Core decision logic:

- [`server/utils/security/request-guard.ts`](../../server/utils/security/request-guard.ts)

Admin bypass helper:

- [`server/utils/security/admin.ts`](../../server/utils/security/admin.ts)

## Protected Routes

The guard only applies to these `POST` endpoints:

- `/api/ai/briefing`
- `/api/ai/website-analysis`
- `/api/datahub/submission`

Source of truth:

- [`PROTECTED_POST_PATHS`](../../server/utils/security/request-guard.ts)

## Guard Flow

For each incoming request:

1. Ignore non-`POST` methods.
2. If `isAdmin(event)` is true, bypass route-origin checks.
3. For protected paths, enforce browser-origin metadata checks.
4. Reject invalid origin context with `403 Invalid request origin`.

## Origin Checks

For protected routes, the middleware enforces:

- `sec-fetch-site` must be one of `same-origin`, `same-site`, or `none` when present.
- `origin` must match request origin.
- If `origin` is missing, `referer` origin must match request origin.

If both `origin` and `referer` are missing (or invalid), the request is rejected.

## Admin Bypass

Bypass is intended for trusted server-to-server testing and scripts.

A request is treated as admin when either header matches `runtimeConfig().apiToken`:

- `x-admin-token: <API_TOKEN>`
- `Authorization: Bearer <API_TOKEN>`

## Relation To Turnstile

Route guard and Turnstile protect different layers:

- Route guard: request-origin/browser-context checks
- Turnstile: bot/challenge validation per protected endpoint

Both are currently used together on the protected API routes.

## Tests

Keep these tests in sync when changing route-guard behavior:

- [`tests/unit/server/middleware/route-guard.test.ts`](../../tests/unit/server/middleware/route-guard.test.ts)
- [`tests/unit/server/utils/security/request-guard.test.ts`](../../tests/unit/server/utils/security/request-guard.test.ts)
- [`tests/unit/server/utils/security/admin.test.ts`](../../tests/unit/server/utils/security/admin.test.ts)
