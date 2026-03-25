<script lang="ts" setup>
import type { ItemsCollectionItem } from '@nuxt/content'
import type { Audit } from '~~/shared/types/audit'

/**
 * Utilities
 */
const { getScoreColor, getScoreLabel } = useAuditUtils()
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
const { data } = await useAsyncData('menu-overview-all', () =>
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

	return Object.entries(state.audit)
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
})

// ----------------------
// Aggregation
// ----------------------

/**
 * Calculate average score for a given pillar
 *
 * @param pillar - Pillar name
 * @returns Average score + count, or undefined if no data
 */
function calculateAverageForPillar(
	pillar: ItemsCollectionItem['pillar'],
): { score: number; count: number } | undefined {
	if (!data.value) return undefined

	// All item IDs belonging to this pillar
	const itemIds = data.value
		.filter((item) => item.pillar === pillar)
		.map((item) => item.id)

	if (itemIds.length === 0) return undefined

	// Collect scores for these items
	const scores = itemIds
		.map((id) => state.audit[id]?.score)
		.filter((score): score is number => score !== undefined)

	if (scores.length === 0) return undefined

	const total = scores.reduce((acc, score) => acc + score, 0)

	return {
		score: Math.round(total / scores.length),
		count: scores.length,
	}
}

/**
 * Assemble UI-ready average object
 *
 * Adds label + color for rendering
 */
function assembleAverage(pillar: ItemsCollectionItem['pillar']) {
	const result = calculateAverageForPillar(pillar)

	return {
		score: result?.score,
		count: result?.count,
		label: getScoreLabel(result?.score),
		color: getScoreColor(result?.score),
	}
}

/**
 * Average scores per pillar
 */
const averages = computed(() => [
	{
		pillar: 'Inzicht & Overzicht',
		icon: getIcon('inzicht'),
		...assembleAverage('Inzicht & Overzicht'),
	},
	{
		pillar: 'Verdieping & Ervaring',
		icon: getIcon('verdieping'),
		...assembleAverage('Verdieping & Ervaring'),
	},
	{
		pillar: 'Activatie & Deelname',
		icon: getIcon('activatie'),
		...assembleAverage('Activatie & Deelname'),
	},
	{
		pillar: 'Ondersteuning & Contact',
		icon: getIcon('ondersteuning'),
		...assembleAverage('Ondersteuning & Contact'),
	},
])

// ----------------------
// Actions
// ----------------------

/**
 * Report generation (placeholder)
 */
const isGenerating = ref(false)

async function generateReport(): Promise<void> {
	isGenerating.value = true

	// TODO: implement actual report generation
	setTimeout(() => {
		isGenerating.value = false
		window.alert('Nog niet geïmplementeerd')
	}, 2000)
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
				:loading="isGenerating"
				:disabled="isGenerating || audits.length === 0"
				color="success"
				variant="subtle"
				:icon="getIcon('add')"
				label="Genereer rapportage"
				@click="generateReport"
			/>
		</template>
	</USlideover>
</template>
