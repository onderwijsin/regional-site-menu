<script lang="ts" setup>
import type { ItemsCollectionItem } from '@nuxt/content'
import type { Audit } from '~~/shared/types/audit'

/**
 * Utilities
 */
const { getAverages } = useAuditUtils()
const { getIcon } = useIcons()

/**
 * Global state
 */
const state = useStateStore()

// ----------------------
// Data fetching
// ----------------------

/**
 * All menu items (markdown only)
 */
const { data } = await useAsyncData('menu-overview', () =>
	queryCollection('items').where('extension', '=', 'md').all(),
)

// ----------------------
// Derived data: audits
// ----------------------

/**
 * Enriched audit entries
 *
 * - Filters out items without score
 * - Joins audit data with actual content items
 */
const audits = computed<Audit<ItemsCollectionItem>[]>(() => {
	if (!data.value) return []

	return (
		Object.entries(state.audit)
			// Only keep scored entries
			.filter(([, value]) => value.score !== undefined)
			.map(([id, value]) => {
				const item = data.value!.find((item) => item.id === id)

				return {
					id,
					score: value.score,
					comment: value.comment,
					item,
				}
			})
			// Remove broken references (shouldn't happen, but defensive)
			.filter((audit): audit is Audit<ItemsCollectionItem> => !!audit.item)
	)
})

// ----------------------
// Actions
// ----------------------

const { openReportConfig } = useReportConfig()

function openReportGeneration() {
	if (!data.value) return
	openReportConfig({
		data: {
			averages: getAverages(data.value, state.audit),
			audits: audits.value,
		},
	})
}

/**
 * Clear all audit data (with confirmation)
 */
const confirm = useConfirmDialog()

async function handleClear(): Promise<void> {
	const confirmed = await confirm({
		title: 'Weet je zeker dat je alle beoordelingen wilt verwijderen?',
		description: 'Deze actie kan niet ongedaan worden gemaakt.',
	})

	if (confirmed) {
		state.clearAllAudits()
	}
}
</script>

<template>
	<USlideover
		title="Rapportage"
		description="Hier vind je alle onderdelen terug die je hebt beoordeeld en kunt je een rapport genereren."
		:ui="{
			content: 'max-w-3xl',
			body: 'prose dark:prose-invert min-w-full',
			footer: 'flex justify-end gap-2',
		}"
	>
		<UButton
			:trailing-icon="getIcon('report')"
			aria-label="Rapportage"
			color="neutral"
			variant="ghost"
		/>
		<template #body>
			<ReportAverages v-if="data" :data="data" :audit="state.audit" />

			<p class="text-muted mt-2 italic">
				Je hebt {{ audits.length }} van de {{ data?.length }} onderdelen beoordeeld.
			</p>

			<div v-if="audits.length" class="mt-2 space-y-3">
				<USeparator />
				<AuditCard v-for="audit in audits" :key="audit.id" :item="audit" />
			</div>
		</template>
		<template #footer>
			<UButton
				v-if="audits.length"
				color="error"
				variant="soft"
				:icon="getIcon('delete')"
				label="Verwijder beoordelingen"
				@click="handleClear"
			/>
			<UButton
				:disabled="audits.length === 0"
				color="success"
				variant="subtle"
				:icon="getIcon('add')"
				label="Genereer rapportage"
				@click="openReportGeneration"
			/>
		</template>
	</USlideover>
</template>
