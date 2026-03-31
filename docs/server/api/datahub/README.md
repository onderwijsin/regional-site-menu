# Datahub Submission API

This module contains the server boundary for suggestion submissions:

- `POST /api/datahub/submission`

## Responsibilities

- validate inbound payload with `SubmissionSchema`
- guard required runtime config (`DATAHUB_URL`, `DATAHUB_TOKEN`)
- forward request to Datahub with expected payload/query shape
- return a stable `{ success: true }` response contract on success

## Configuration

Static route payload/query defaults:

- [`DATAHUB_CONFIG` in `config/constants.ts`](../../../../config/constants.ts)

Runtime secrets/URLs:

- `runtimeConfig.datahub.url`
- `runtimeConfig.datahub.token`

## Notes

- Keep this route as a thin proxy/boundary.
- Preserve payload shape unless downstream contract explicitly changes.
- Use Zod at this boundary before forwarding data.
