<script lang="ts" setup>
import type { ItemsCollectionItem } from '@nuxt/content'
import type { ButtonProps, TabsItem } from '@nuxt/ui'

import { useFuse } from '@vueuse/integrations/useFuse'

const props = withDefaults(
	defineProps<{
		persist?: boolean
	}>(),
	{
		persist: true,
	},
)

const state = useStateStore()
const { openSuggestion } = useSuggestion()
const { openWelcome, showWelcome } = useWelcome()

const query = ref('')
const _filter = ref<ItemsCollectionItem['goals'][number] | 'all'>(
	props.persist ? state.filter : 'all',
)
const filter = computed({
	get: () => _filter.value,
	set: (value) => {
		_filter.value = value
		if (props.persist) {
			state.filter = value
		}
	},
})

const tabs: TabsItem[] = [
	{ label: 'Alle doelen', value: 'all' },
	{ label: 'Enthousiasmeren', value: 'Enthousiasmeren' },
	{ label: 'Informeren', value: 'Informeren' },
	{ label: 'Activeren', value: 'Activeren' },
]

const { data } = await useAsyncData(
	`menu-overview-${filter.value}`,
	async () => {
		const items = await queryCollection('items').where('extension', '=', 'md').all()

		if (filter.value === 'all') {
			return items
		}

		return items.filter((item) =>
			item.goals.includes(filter.value as (typeof item.goals)[number]),
		)
	},
	{
		watch: [filter],
	},
)

/**
 * Fuse needs an array, and data.value can be undefined
 */
const searchableData = computed(() => data.value ?? [])

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
	if (!query.value && filter.value === 'all') {
		return 'We hebben geen items gevonden in de menukaart. Probeer het later opnieuw.'
	}

	if (query.value) {
		return 'We hebben geen items gevonden die overeenkomen met je zoekopdracht. Ontbreekt er een item? Doe een suggestie!'
	}

	return 'We hebben geen items gevonden voor de filterselectie. Ontbreekt er een item? Doe een suggestie!'
})

const hasFilterApplied = computed(() => {
	return query.value || filter.value !== 'all'
})

function clear() {
	query.value = ''
	filter.value = 'all'
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

onNuxtReady(() => {
	if (showWelcome.value) {
		openWelcome()
	}
})
</script>

<template>
	<section class="space-y-8">
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
				v-model="filter"
				:items="tabs"
				color="secondary"
				:ui="{ root: 'gap-0', label: 'font-bold', trigger: 'cursor-pointer' }"
				size="sm"
			/>
		</div>
		<UPageColumns v-if="results.length">
			<MenuCard v-for="({ item }, i) in results" :key="i" :item="item" />
		</UPageColumns>
		<UEmpty
			v-else
			icon="lucide:file"
			title="Geen items gevonden"
			:description="noResultsDescription"
			:actions="noResultActions"
		/>
	</section>
</template>
