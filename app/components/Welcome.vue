<script lang="ts" setup>
import type { ViewMode } from '~~/shared/types/primitives'

const state = useStateStore()

const emit = defineEmits<{
	(e: 'close'): void
}>()

function handleSelect(value: ViewMode) {
	state.mode = value
	emit('close')
	return navigateTo('/')
}
</script>

<template>
	<UModal
		title="Welkom"
		description="Bij de menukaart voor regionale onderwijsloket websites"
		:ui="{ content: 'max-w-3xl min-h-[50dvh] max-w-[80dvh]', footer: 'justify-between' }"
	>
		<template #body> TODO: intro </template>
		<template #footer>
			<USwitch
				v-model="state.hideWelcome"
				unchecked-icon="i-lucide-x"
				checked-icon="i-lucide-check"
				size="sm"
				label="Niet meer tonen"
			/>
			<UFieldGroup>
				<UButton
					label="Verkennen"
					color="neutral"
					variant="subtle"
					@click="handleSelect('explore')"
				/>
				<UButton
					label="Aan de slag"
					color="primary"
					variant="solid"
					@click="handleSelect('edit')"
				/>
			</UFieldGroup>
		</template>
	</UModal>
</template>
