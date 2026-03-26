import type { ItemsCollectionItem } from '@nuxt/content'
import type { Audit, AuditEntry } from '~~/shared/types/audit'

type AuditMap = Record<string, AuditEntry>

/**
 * Combines persisted audit entries with menu items and removes stale references.
 *
 * @param items - Full list of content items.
 * @param auditMap - Persisted audit state keyed by item id.
 * @returns Audits enriched with their matching content item.
 */
export function buildReportAudits(
	items: ItemsCollectionItem[] | undefined,
	auditMap: AuditMap,
): Audit<ItemsCollectionItem>[] {
	if (!items) {
		return []
	}

	const itemById = new Map(items.map((item) => [item.id, item]))
	const audits: Audit<ItemsCollectionItem>[] = []

	for (const [id, value] of Object.entries(auditMap)) {
		if (value.score === undefined) {
			continue
		}

		const item = itemById.get(id)

		if (!item) {
			continue
		}

		audits.push({
			id,
			score: value.score,
			comment: value.comment,
			item,
		})
	}

	return audits
}
