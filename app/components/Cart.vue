<script lang="ts" setup>
import type { ItemsCollectionItem } from '@nuxt/content'
import type { Audit } from '~~/shared/types/audit'

const { getScoreColor, getScoreLabel } = useAuditUtils()

const { data } = await useAsyncData(`menu-overview-all`, () =>
	queryCollection('items').where('extension', '=', 'md').all(),
)

const state = useStateStore()
const audits = computed<Audit<ItemsCollectionItem>[]>(() => {
	return Object.entries(state.audit)
		.filter(([_key, value]) => value.score !== undefined)
		.map(([key, value]) => ({
			id: key,
			score: value.score,
			comment: value.comment,
			item: data.value?.find((item) => item.id === key),
		}))
		.filter((audit) => audit.item !== undefined) as Audit<ItemsCollectionItem>[]
})

function calculateAverageForPillar(
	pillar: ItemsCollectionItem['pillar'],
): { score: number; count: number } | undefined {
	const itemIdsForPillar = data.value
		?.filter((item) => item.pillar === pillar)
		.map((item) => item.id)
	if (!itemIdsForPillar || itemIdsForPillar.length === 0) {
		return undefined
	}

	const scores = itemIdsForPillar
		.map((id) => state.audit[id]?.score)
		.filter((score) => score !== undefined)
	if (scores.length === 0) {
		return undefined
	}

	const total = scores.reduce((acc, score) => acc + (score ?? 0), 0)
	return {
		score: Math.round(total / scores.length),
		count: scores.length,
	}
}

function assembleAverage(pillar: ItemsCollectionItem['pillar']) {
	const result = calculateAverageForPillar(pillar)

	return {
		score: result?.score,
		count: result?.count,
		label: getScoreLabel(result?.score),
		color: getScoreColor(result?.score),
	}
}

const { getIcon } = useIcons()
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

const isGenerating = ref(false)
async function generateReport() {
	isGenerating.value = true

	setTimeout(() => {
		isGenerating.value = false
		window.alert('Nog niet geïmplementeerd')
	}, 2000)
}

const confirm = useConfirmDialog()
async function handleClear() {
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
			trailing-icon="lucide:file-badge"
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
				icon="lucide:trash"
				label="Verwijder beoordelingen"
				@click="handleClear"
			/>
			<UButton
				:loading="isGenerating"
				:disabled="isGenerating || audits.length === 0"
				color="success"
				variant="subtle"
				icon="lucide:plus"
				label="Genereer rapportage"
				@click="generateReport"
			/>
		</template>
	</USlideover>
</template>
