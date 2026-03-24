<script lang="ts" setup>
import type { TabsItem, TabsProps } from '@nuxt/ui'

withDefaults(defineProps<Omit<TabsProps, 'items' | 'modelValue' | 'ui'>>(), {
	size: 'sm',
})

const state = useStateStore()

const tabs: TabsItem[] = [
	{ label: 'Verkennen', value: 'explore' },
	{ label: 'Aan de slag', value: 'edit' },
]
</script>

<template>
	<UTabs
		v-model="state.mode"
		:items="tabs"
		:ui="{ root: 'gap-0', label: 'font-bold', trigger: 'cursor-pointer' }"
		v-bind="$props"
	/>
</template>
