<script lang="ts" setup>
import type { AiProgressItem } from '~/composables/report-ai'

defineProps<{
	progress: AiProgressItem[]
	isLoadingToolOpen: (_toolId: string) => boolean
}>()

const emit = defineEmits<{
	(_e: 'tool-open-change', _payload: { toolId: string; isOpen: boolean }): void
}>()

const { getIcon } = useIcons()
</script>

<template>
	<div class="space-y-4">
		<UAlert
			:icon="getIcon('ai')"
			color="primary"
			variant="subtle"
			title="AI-inzichten worden opgebouwd"
			description="Je ziet hieronder stap voor stap wat er gebeurt en waar de AI momenteel mee bezig is."
		/>

		<UChatTool
			v-if="progress.length === 0"
			:text="'Voorbereiden...'"
			:streaming="true"
			:loading="true"
			:icon="getIcon('ai')"
			chevron="leading"
			disabled
		>
			De AI-taak wordt klaargezet.
		</UChatTool>

		<UChatTool
			v-for="entry in progress"
			:key="entry.id"
			:text="entry.text"
			:streaming="entry.status === 'running'"
			:loading="entry.status === 'running'"
			:icon="entry.status === 'running' ? getIcon('refresh') : getIcon('success')"
			:disabled="entry.status === 'running'"
			:open="isLoadingToolOpen(entry.id)"
			chevron="leading"
			variant="inline"
			class="transition-opacity duration-300"
			:class="entry.status === 'completed' ? 'opacity-45' : 'opacity-100'"
			@update:open="emit('tool-open-change', { toolId: entry.id, isOpen: $event })"
		>
			{{ entry.details }}
		</UChatTool>
	</div>
</template>
