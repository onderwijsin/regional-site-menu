<script lang="ts" setup>
defineProps<{
	briefingDraft: string
}>()

const emit = defineEmits<{
	'update:briefingDraft': [value: string | undefined]
}>()

const { getIcon } = useIcons()
</script>

<template>
	<div class="space-y-4">
		<UAlert
			:icon="getIcon('edit')"
			color="info"
			variant="subtle"
			title="Controleer en bewerk de AI-briefing"
			description="Pas de briefing aan waar nodig. Jouw aangepaste versie wordt opgenomen in het PDF-rapport."
		/>

		<UFormField
			name="briefing"
			label="AI-briefing"
			description="Controleer de inhoud en maak eventuele aanpassingen."
		>
			<Editor
				:model-value="briefingDraft"
				outline
				placeholder="De gegenereerde briefing verschijnt hier..."
				@update:model-value="emit('update:briefingDraft', $event)"
			/>
		</UFormField>
	</div>
</template>
