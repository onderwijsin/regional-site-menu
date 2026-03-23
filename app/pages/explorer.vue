<script lang="ts" setup>
import type { ButtonProps, TabsItem } from '@nuxt/ui'

import { useFuse } from '@vueuse/integrations/useFuse'

const state = useStateStore()
const { openSuggestion } = useSuggestion()

const tabs: TabsItem[] = [
	{ label: 'Alle doelen', value: 'all' },
	{ label: 'Enthousiasmeren', value: 'Enthousiasmeren' },
	{ label: 'Informeren', value: 'Informeren' },
	{ label: 'Activeren', value: 'Activeren' },
]

const { data } = await useAsyncData(
	`overview-${state.filter}`,
	async () => {
		const items = await queryCollection('items').all()

		if (state.filter === 'all') {
			return items
		}

		return items.filter((item) =>
			item.goals.includes(state.filter as (typeof item.goals)[number]),
		)
	},
	{
		watch: [() => state.filter],
	},
)

const searchableData = computed(() => data.value ?? [])

const query = ref('')

const { results } = useFuse(query, searchableData, {
	fuseOptions: {
		keys: [
			{ name: 'title', weight: 3 },
			{ name: 'description', weight: 2 },

			{ name: 'goals', weight: 1.5 },
			{ name: 'pillar', weight: 1.2 },

			{ name: 'scope', weight: 0.6 },
			{ name: 'priority', weight: 0.4 },

			{ name: 'body.value', weight: 0.2 },
		],
		threshold: 0.2,
	},
	matchAllWhenSearchEmpty: true,
})

const noResultsDescription = computed(() => {
	if (!query.value && state.filter === 'all') {
		return 'We hebben geen items gevonden in de menukaart. Probeer het later opnieuw.'
	}

	if (query.value) {
		return 'We hebben geen items gevonden die overeenkomen met je zoekopdracht. Ontbreekt er een item? Doe een suggestie!'
	}

	return 'We hebben geen items gevonden voor de filterselectie. Ontbreekt er een item? Doe een suggestie!'
})

const hasFilterApplied = computed(() => {
	return query.value || state.filter !== 'all'
})

function clear() {
	query.value = ''
	state.filter = 'all'
}

const noResultActions = computed<ButtonProps[]>(() => {
	const base: ButtonProps[] = [
		{
			icon: 'lucide:circle-fading-plus',
			label: 'Doe een suggestie',
			onClick: openSuggestion,
		},
	]
	if (hasFilterApplied.value) {
		base.push({
			icon: 'lucide:refresh-cw',
			label: 'Wis filters',
			color: 'neutral',
			variant: 'subtle',
			onClick: clear,
		})
	}
	return base
})

watch(results, (newVal) => {
	console.log('Search results updated:', newVal)
})
</script>

<template>
	<NuxtLayout name="menu">
		<div class="space-y-8 pt-8">
			<div class="flex items-center justify-between gap-6">
				<UInput
					v-model="query"
					size="lg"
					variant="outline"
					placeholder="Doorzoek het menu"
					icon="lucide:search"
					class="grow"
				/>
				<UTabs
					v-model="state.filter"
					:items="tabs"
					color="secondary"
					:ui="{ root: 'gap-0', label: 'font-bold', trigger: 'cursor-pointer' }"
					size="sm"
				/>
			</div>
			<UPageColumns v-if="results.length">
				<UPageCard
					v-for="({ item }, i) in results"
					:key="i"
					variant="soft"
					:title="item.title"
					:description="item.description"
					:to="item.path"
					:ui="{
						footer: 'space-x-2',
					}"
				>
					<template #footer>
						<UBadge
							v-for="goal in item.goals"
							:key="goal"
							:label="goal"
							size="sm"
							variant="subtle"
						/>
					</template>
				</UPageCard>
			</UPageColumns>
			<UEmpty
				v-else
				icon="lucide:file"
				title="Geen items gevonden"
				:description="noResultsDescription"
				:actions="noResultActions"
			/>
		</div>

		<UPageCTA
			title="Heb je vragen of opmerkingen?"
			description="Laat het ons weten via het contactformulier. We reageren zo snel mogelijk."
			variant="subtle"
			class="my-16"
			:links="[
				{
					label: 'Stuur een bericht',
					to: 'https://www.onderwijsregio.nl/service/contact',
					target: '_blank',
					trailingIcon: 'i-lucide-arrow-right',
					color: 'primary',
				},
			]"
		/>
	</NuxtLayout>
</template>
