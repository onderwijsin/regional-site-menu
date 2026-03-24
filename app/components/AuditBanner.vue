<script lang="ts" setup>
import type { ButtonProps } from '@nuxt/ui'
import type { AuditProps } from '~~/shared/types/audit'

const props = defineProps<AuditProps>()

const { state, isDirty, description, currentScoreColor, currentScoreLabel, saveChanges } =
	useAudit(props)
const comment = useComment()

const actions = computed<ButtonProps[]>(() => {
	const items: ButtonProps[] = []
	if ((isDirty.value && !state.comment) || state.comment) {
		// For new audit items, we only want to show the comments button after a score has been given (in that case its dirty)
		items.push({
			label: !state.comment ? 'Voeg opmerking toe' : 'Bewerk opmerking',
			variant: 'subtle',
			color: 'neutral',
			icon: 'lucide:notebook-pen',
			onClick: async () => {
				const result = await comment({ initialValue: state.comment })
				if (!result) return
				state.comment = result.value
			},
		})
	}

	if (isDirty.value) {
		items.push({
			label: 'Opslaan',
			variant: 'subtle',
			color: 'success',
			icon: 'lucide:save',
			onClick: saveChanges,
		})
	}

	return items
})
</script>

<template>
	<UPageCTA
		title="Hoe doet jouw website het?"
		:description="description"
		variant="subtle"
		class="my-16"
		:ui="{ links: 'max-w-lg mx-auto' }"
	>
		<template #links>
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
				<span class="shrink-0 font-bold"> {{ state.score }} / 10 </span>
			</div>

			<div class="flex gap-2 py-6">
				<UButton v-for="(item, index) in actions" :key="index" v-bind="item" />
			</div>
		</template>
	</UPageCTA>
</template>
