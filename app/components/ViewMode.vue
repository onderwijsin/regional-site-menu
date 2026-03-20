<script lang="ts" setup>
import type { TabsItem } from '@nuxt/ui'

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
		size="sm"
	/>
</template>
