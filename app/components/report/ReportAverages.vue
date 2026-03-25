<script lang="ts" setup>
import type { ItemsCollectionItem } from '@nuxt/content'
import type { AuditEntry } from '~~/shared/types/audit'

const props = defineProps<{
	data: ItemsCollectionItem[]
	audit: Record<string, AuditEntry>
}>()

const { getAverages } = useAuditUtils()

/**
 * Average scores per pillar
 */
const averages = computed(() => getAverages(props.data, props.audit))
</script>

<template>
	<div class="prose dark:prose-invert min-w-full">
		<h3>Gemiddelde score per categorie</h3>
		<table>
			<tr
				v-for="row in averages"
				:key="row.pillar"
				class="border-muted border-b last:border-none"
			>
				<td class="py-3">
					<UIcon :name="row.icon" class="relative top-0.75 mr-2 size-4" />
					<strong>{{ row.pillar }}</strong>
				</td>
				<td class="flex items-center justify-end gap-2 py-3">
					<span class="text-dimmed text-sm"
						>({{ row.count ?? 0 }}
						{{ row.count === 1 ? 'beoordeling' : 'beoordelingen' }})</span
					>
					<Score :value="row.score" />
				</td>
			</tr>
		</table>
	</div>
</template>
