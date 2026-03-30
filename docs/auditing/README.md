# Auditing Feature

This document explains how auditing is designed and implemented.

## Functional Goal

Auditing allows a region to score website components and optionally add comments, then use those
results in report generation.

## Data Model

Primary types:

- [shared/types/audit.ts](../../shared/types/audit.ts)

Key shapes:

- `AuditEntry`: `{ score: number | undefined; comment: string }`
- `Audit<T>`: enriched audit row with linked content item
- `PillarAverage<Pillar>`: aggregate per pillar for reporting

## State and Persistence

Audit state lives in Pinia:

- [app/stores/state.ts](../../app/stores/state.ts)

Important details:

- `audit` is a map keyed by content item ID
- entries are lazily created (`ensureAudit`)
- deletions intentionally use `delete` to keep persistence/reactivity semantics
- persisted keys include `audit`, `region`, `notes`, `url`, filters, and mode

## Scoring and Aggregates

Logic is centralized in:

- [app/composables/use-audit-utils.ts](../../app/composables/use-audit-utils.ts)
- [app/composables/use-audit.ts](../../app/composables/use-audit.ts)

Responsibilities:

- score -> label mapping
- score -> UI color mapping
- average per pillar
- enriched averages for report rendering
- single-item audit composable (`useAudit`) with two-way score/comment bindings

## Content Taxonomy

Canonical domain metadata is in:

- [app/composables/content-taxonomy.ts](../../app/composables/content-taxonomy.ts)

This is the source of truth for:

- pillar ordering
- goal ordering
- hint texts
- pillar icon mapping

## UI Integration

Representative components:

- [AuditModal.vue](../../app/components/audit/AuditModal.vue)
- [AuditCard.vue](../../app/components/audit/AuditCard.vue)
- [Report.client.vue](../../app/components/report/Report.client.vue)

Flow:

1. User scores item(s) and optionally comments.
2. Audit map is persisted in store.
3. Report screen builds enriched audit rows (`buildReportAudits`).
4. Report generation uses these rows for averages + detailed section rendering.

## Relationship to Reporting

Auditing is upstream of reporting:

- no scored audits -> no meaningful report data
- averages and detail sections are derived from audit state
- optional AI stages also consume audit data

## Design Constraints

1. Keep state schema stable (persisted keys are user data).
2. Do not create parallel audit state patterns outside the store.
3. Prefer updating audit utilities/composables over ad-hoc per-component logic.
4. Keep taxonomy literals centralized in `content-taxonomy.ts`.
