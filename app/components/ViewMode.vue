<script lang="ts" setup>
import type { TabsItem, TabsProps } from '@nuxt/ui'
import type { ViewMode } from '~~/shared/types/primitives'

withDefaults(defineProps<Omit<TabsProps, 'items' | 'modelValue' | 'ui'>>(), {
	size: 'sm',
})

const state = useStateStore()
const mode = computed({
	get: () => state.mode,
	set: (value: ViewMode) => {
		state.setMode(value, 'header_tabs')
	},
})

const tabs: TabsItem[] = [
	{ label: 'Verkennen', value: 'explore' },
	{ label: 'Aan de slag', value: 'edit' },
]
</script>

<template>
	<UTabs
		v-model="mode"
		:items="tabs"
		:ui="{ root: 'gap-0', label: 'font-bold', trigger: 'cursor-pointer' }"
		v-bind="$props"
	/>
</template>
