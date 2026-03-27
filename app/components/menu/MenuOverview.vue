<script lang="ts" setup>
import type { ButtonProps, TabsItem } from '@nuxt/ui'
import type { Goal } from '~~/shared/types/primitives'

import { ASYNC_DATA_KEYS } from '@constants'
import { useFuse } from '@vueuse/integrations/useFuse'
import { GOALS } from '~/composables/content-taxonomy'

/**
 * Props
 */
const props = withDefaults(
	defineProps<{
		/** Persist filter state to global store */
		persist?: boolean
	}>(),
	{
		persist: true
	}
)

// ----------------------
// Dependencies
// ----------------------

const state = useStateStore()
const { openSuggestion } = useSuggestion()
const { openWelcome, showWelcome } = useWelcome()
const { getIcon } = useIcons()

// ----------------------
// State
// ----------------------

/** Search query */
const query = ref('')

/**
 * Internal filter state
 *
 * Initialized from store when persistence is enabled
 */
const _filter = ref<Goal | 'all'>(props.persist ? state.filter : 'all')

/**
 * Public filter with optional persistence
 */
const filter = computed({
	get: () => _filter.value,
	set: (value: Goal | 'all') => {
		_filter.value = value

		if (props.persist) {
			state.filter = value
		}
	}
})

// ----------------------
// UI config
// ----------------------

/**
 * Filter tabs
 */
const tabs: TabsItem[] = [
	{ label: 'Alle doelen', value: 'all' },
	...GOALS.map((goal) => ({
		label: goal,
		value: goal
	}))
]

// ----------------------
// Data fetching
// ----------------------

/**
 * Fetch menu items once and apply filter/search client-side.
 *
 * This avoids repeated content queries when users switch goal tabs.
 */
const { data } = await useAsyncData(ASYNC_DATA_KEYS.menuOverview, () =>
	queryCollection('items').where('extension', '=', 'md').all()
)

const filteredData = computed(() => {
	const items = data.value ?? []
	if (filter.value === 'all') {
		return items
	}

	return items.filter((item) => item.goals.includes(filter.value as (typeof item.goals)[number]))
})

// ----------------------
// Search (Fuse.js)
// ----------------------

/**
 * Fuse requires a defined array
 */
const searchableData = computed(() => filteredData.value)

/**
 * Fuzzy search results
 */
const { results } = useFuse(query, searchableData, {
	fuseOptions: {
		keys: [
			{ name: 'title', weight: 3 },
			{ name: 'description', weight: 2 },

			{ name: 'goals', weight: 1.5 },
			{ name: 'pillar', weight: 1.2 },

			{ name: 'scope', weight: 0.6 },
			{ name: 'priority', weight: 0.4 },

			// Lowest weight → full-text fallback
			{ name: 'body.value', weight: 0.2 }
		],
		threshold: 0.2
	},
	matchAllWhenSearchEmpty: true
})

// ----------------------
// Derived UI state
// ----------------------

/**
 * Whether any filtering is applied
 */
const hasFilterApplied = computed(() => {
	return !!query.value || filter.value !== 'all'
})

/**
 * Description shown when no results are found
 */
const noResultsDescription = computed(() => {
	if (!query.value && filter.value === 'all') {
		return 'We hebben geen items gevonden in de menukaart. Probeer het later opnieuw.'
	}

	if (query.value) {
		return 'We hebben geen items gevonden die overeenkomen met je zoekopdracht. Ontbreekt er een item? Doe een suggestie!'
	}

	return 'We hebben geen items gevonden voor de filterselectie. Ontbreekt er een item? Doe een suggestie!'
})

/**
 * Reset search + filters
 */
function clear(): void {
	query.value = ''
	filter.value = 'all'
}

/**
 * Actions shown when no results are found
 */
const noResultActions = computed<ButtonProps[]>(() => {
	const actions: ButtonProps[] = [
		{
			icon: getIcon('suggestion'),
			label: 'Doe een suggestie',
			onClick: openSuggestion
		}
	]

	if (hasFilterApplied.value) {
		actions.push({
			icon: getIcon('refresh'),
			label: 'Wis filters',
			color: 'neutral',
			variant: 'subtle',
			onClick: clear
		})
	}

	return actions
})

// ----------------------
// Lifecycle
// ----------------------

/**
 * Show welcome modal on first load
 */
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
				:icon="getIcon('search')"
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
			:icon="getIcon('document')"
			title="Geen items gevonden"
			:description="noResultsDescription"
			:actions="noResultActions"
		/>
	</section>
</template>
