<script lang="ts" setup>
import type { ConfirmDialogProps } from '~/composables/confirm-dialog'

withDefaults(defineProps<ConfirmDialogProps>(), {
	actions: () => [
		{
			label: 'Sluit',
			color: 'neutral',
			variant: 'soft',
			mode: 'cancel'
		},
		{
			label: 'Bevestigen',
			color: 'primary',
			variant: 'solid',
			mode: 'confirm'
		}
	]
})

const emits = defineEmits<{
	close: [value: boolean]
}>()

type ConfirmAction = Exclude<ConfirmDialogProps['actions'], undefined>[number]

function handleAction(action: ConfirmAction | undefined, event: MouseEvent) {
	if (!action) {
		return
	}

	if ('mode' in action) {
		emits('close', action.mode === 'confirm')
		return
	}

	const { onClick } = action
	if (Array.isArray(onClick)) {
		for (const handler of onClick) {
			handler(event)
		}
		return
	}

	onClick?.(event)
}
</script>

<template>
	<UModal
		:title="title"
		:description="description"
		:dismissible="false"
		:ui="{ footer: 'justify-end' }"
	>
		<template #footer>
			<UButton
				v-for="(action, index) in actions"
				:key="index"
				:label="action.label"
				:color="action.mode === 'confirm' ? (color ?? action.color) : action.color"
				:variant="action.variant"
				:autofocus="action.mode === 'confirm'"
				@click="handleAction(action, $event)"
			/>
		</template>
	</UModal>
</template>
