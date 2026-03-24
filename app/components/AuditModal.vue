<script lang="ts" setup>
import type { AuditProps } from '~~/shared/types/audit'

const props = defineProps<AuditProps>()
const open = ref(false)

const {
	state,
	isDirty,
	description,
	currentScoreColor,
	currentScoreLabel,
	saveChanges,
	revertState,
} = useAudit(props)

onActivated(() => revertState)

function handleSave() {
	open.value = false
	// Wait for the close animation to prevent flashes
	setTimeout(() => saveChanges(), 200)
}
</script>

<template>
	<UModal
		v-model:open="open"
		:title="!state.score ? 'Voeg jouw beoordeling toe' : 'Bewerk je beoordeling'"
		:description="description"
		:ui="{
			content: 'max-w-3xl min-h-[50dvh] max-h-[80dvh]',
			footer: 'justify-end flex gap-3',
			body: 'prose dark:prose-invert min-w-full',
		}"
	>
		<slot :score="state.score" />
		<UButton
			v-if="!$slots.default"
			:label="!state.score ? 'Beoordeel je site' : 'Bewerk beoordeling'"
			color="primary"
			variant="subtle"
		/>

		<template #body>
			<p>Hoe vind jij dat jullie website scoort op dit onderdeel?</p>
			<div class="flex w-full items-center gap-4">
				<USlider
					v-model="state.score"
					:min="1"
					:max="10"
					:default-value="5"
					:color="currentScoreColor"
					:tooltip="{ text: currentScoreLabel }"
					class="grow"
				/>
				<span class="shrink-0 font-bold"> {{ state.score ?? '?' }} / 10 </span>
			</div>
			<Editor v-model="state.comment" class="my-6" outline />
		</template>
		<template #footer>
			<UButton
				v-if="isDirty"
				label="Ongedaan maken"
				icon="lucide:undo"
				variant="soft"
				color="neutral"
				@click="revertState"
			/>
			<UButton
				:color="isDirty ? 'success' : 'neutral'"
				:icon="isDirty ? 'lucide:save' : undefined"
				:label="isDirty ? 'Opslaan' : 'Sluit'"
				variant="subtle"
				@click="handleSave"
			/>
		</template>
	</UModal>
</template>
