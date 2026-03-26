<script lang="ts" setup>
const props = defineProps<{ initialValue: string }>()
const comment = ref(props.initialValue)

const isDirty = computed(() => comment.value !== props.initialValue)

const emit = defineEmits<{
	(event: 'close', payload: { value: string }): void
}>()

function handleClose() {
	emit('close', { value: comment.value })
}
</script>

<template>
	<USlideover
		title="Voeg een opmerking toe"
		description="Schrijf een opmerking of voeg andere context toe aan je beoordeling"
		:ui="{ content: 'max-w-3xl', footer: 'flex gap-3 justify-end' }"
		:close="false"
		:dismissible="false"
		@close:prevent="handleClose"
	>
		<template #body>
			<Editor
				v-model="comment"
				autofocus
				placeholder="Voeg jouw opmerking toe. Je opmerking wordt verwerkt in de rapportage die je kunt genereren."
			/>
		</template>
		<template #footer>
			<UButton
				v-if="isDirty"
				label="Ongedaan maken"
				variant="subtle"
				color="warning"
				@click="comment = initialValue"
			/>
			<UButton label="Sluiten" variant="subtle" color="neutral" @click="handleClose" />
		</template>
	</USlideover>
</template>
